//! V79: physical assets remain immutable; project ownership is a separate relation.
//! Publishing is one-way. Deleting a project never deletes asset bytes.
use rusqlite::{params, Connection, Transaction};
use serde_json::Value;
use std::collections::{HashMap, HashSet};

const PREFIX: &str = "nsp-asset-v74:";
fn err(e: impl std::fmt::Display) -> String { e.to_string() }
fn hash_of(image:&Value)->Result<String,String>{
    let src=image.get("src").and_then(Value::as_str).ok_or("Image original missing")?;
    let hash=src.strip_prefix(PREFIX).ok_or("Image is not persisted")?;
    if hash.len()!=64 || !hash.bytes().all(|b|b.is_ascii_hexdigit()&&!b.is_ascii_uppercase()){
        return Err("Invalid content hash".into());
    }
    Ok(hash.to_owned())
}
fn project_id<'a>(value:&'a Value, field:&str)->Result<&'a str,String>{
    let s=value.get(field).and_then(Value::as_str).ok_or_else(||format!("Missing {field}"))?;
    if s.is_empty(){return Err(format!("Empty {field}"));}
    Ok(s)
}
fn collect_asset_ids(value:&Value, out:&mut HashSet<String>){
    match value{
        Value::Object(map)=>{
            if let Some(id)=map.get("assetId").and_then(Value::as_str){if !id.is_empty(){out.insert(id.to_owned());}}
            for (key,item) in map{
                if key=="tilesJson" {
                    if let Some(raw)=item.as_str(){
                        if let Ok(nested)=serde_json::from_str::<Value>(raw){
                            collect_asset_ids(&nested,out);
                            if let Some(cells)=nested.get("cells").and_then(Value::as_array){
                                for cell in cells{if let Some(id)=cell.as_str(){out.insert(id.into());}}
                            }
                            if let Some(stash)=nested.get("stash").and_then(Value::as_object){
                                for cell in stash.values(){if let Some(id)=cell.as_str(){out.insert(id.into());}}
                            }
                        }
                    }
                } else {collect_asset_ids(item,out);}
            }
        }
        Value::Array(items)=>for item in items{collect_asset_ids(item,out);},
        _=>{}
    }
}
fn add_usage(tx:&Transaction<'_>,scope:&str,kind:&str,owner:&str,content:&Value,
             private:&HashMap<String,String>,public:&HashMap<String,String>)->Result<(),String>{
    let mut ids=HashSet::new();
    collect_asset_ids(content,&mut ids);
    for id in ids {
        // Global templates have no private project owner, so only public assets qualify.
        let hash=if scope=="@global"{public.get(&id)}else{private.get(&id).or_else(||public.get(&id))};
        let hash=hash.ok_or_else(||format!("Unowned or inaccessible image {id} referenced by {scope}/{kind}/{owner}"))?;
        tx.execute("INSERT OR IGNORE INTO image_usage_edges(scope_id,owner_kind,owner_id,image_id,asset_hash) VALUES(?1,?2,?3,?4,?5)",
            params![scope,kind,owner,id,hash]).map_err(err)?;
    }
    Ok(())
}
fn public_catalog(tx:&Transaction<'_>,root:&Value)->Result<HashMap<String,String>,String>{
    if let Some(images)=root.get("globalImageLibrary").and_then(Value::as_array){
        for entry in images{
            let id=project_id(entry,"id")?;
            let hash=hash_of(entry)?;
            // Permanent publication: a public ID cannot silently point to new bytes.
            tx.execute("INSERT OR IGNORE INTO image_public_catalog(id,asset_hash,payload) VALUES(?1,?2,?3)",
                params![id,hash,entry.to_string()]).map_err(err)?;
            let old:String=tx.query_row("SELECT asset_hash FROM image_public_catalog WHERE id=?1",[id],|r|r.get(0)).map_err(err)?;
            if old!=hash{return Err(format!("Cannot replace immutable public image {id}"));}
        }
    }
    let mut stmt=tx.prepare("SELECT id,asset_hash FROM image_public_catalog").map_err(err)?;
    let rows=stmt.query_map([],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?))).map_err(err)?;
    rows.collect::<Result<HashMap<_,_>,_>>().map_err(err)
}
fn project_images(tx:&Transaction<'_>,project:&str,content:&Value)->Result<HashMap<String,String>,String>{
    let mut map=HashMap::new();
    if let Some(images)=content.get("imageLibrary").and_then(Value::as_array){
        for img in images{
            let id=project_id(img,"id")?;
            let hash=hash_of(img)?;
            tx.execute("INSERT INTO image_project_owners(project_id,image_id,asset_hash) VALUES(?1,?2,?3)",
                params![project,id,hash]).map_err(err)?;
            map.insert(id.to_owned(),hash);
        }
    }
    Ok(map)
}
fn persist_one(tx:&Transaction<'_>,project:&str,content:&Value,
               public:&HashMap<String,String>)->Result<(),String>{
    let private=project_images(tx,project,content)?;
    if let Some(portfolios)=content.get("portfolios").and_then(Value::as_array){
        for portfolio in portfolios{
            let portfolio_id=project_id(portfolio,"id")?;
            if let Some(pages)=portfolio.get("pages").and_then(Value::as_array){
                for page in pages{
                    let page_id=project_id(page,"id")?;
                    add_usage(tx,project,"page",&format!("{portfolio_id}/{page_id}"),page,&private,public)?;
                }
            }
        }
    }
    Ok(())
}
fn collect_hashes(value:&Value,out:&mut HashSet<String>){
    match value{
        Value::String(v)=>{
            if let Some(hash)=v.strip_prefix(PREFIX){
                if hash.len()==64 && hash.bytes().all(|b|b.is_ascii_hexdigit()&&!b.is_ascii_uppercase()){
                    out.insert(hash.to_owned());
                }
            }
        },
        Value::Object(m)=>for (k,v) in m{
            if k=="tilesJson"{
                if let Some(s)=v.as_str(){
                    if let Ok(nested)=serde_json::from_str::<Value>(s){collect_hashes(&nested,out);}
                }
            }else{collect_hashes(v,out);}
        },
        Value::Array(a)=>for v in a{collect_hashes(v,out);},
        _=>{}
    }
}
pub fn persist_ownership(tx:&Transaction<'_>,workspace:&Value)->Result<(),String>{
    // project_store::persist_workspace runs first, and clears the old project rows.
    tx.execute("DELETE FROM image_usage_edges",[]).map_err(err)?;
    tx.execute("DELETE FROM image_project_owners",[]).map_err(err)?;
    let public=public_catalog(tx,workspace)?;
    let active=workspace.get("activeWorkspaceId").and_then(Value::as_str).unwrap_or("legacy-default");
    persist_one(tx,active,workspace,&public)?;
    if let Some(inactive)=workspace.get("projectWorkspaces").and_then(Value::as_array){
        for entry in inactive{
            persist_one(tx,project_id(entry,"id")?,entry.get("data").ok_or("Missing project data")?,&public)?;
        }
    }
    let templates=workspace.get("globalTemplates").filter(|v|v.is_object()).unwrap_or(workspace);
    for kind in ["masterTemplates","sectionDesigns","templates"]{
        if let Some(entries)=templates.get(kind).and_then(Value::as_array){
            for item in entries{
                add_usage(tx,"@global",kind,project_id(item,"id")?,item,&HashMap::new(),&public)?;
            }
        }
    }
    Ok(())
}

// Backups are immutable snapshots. Index their immutable content hashes on
// creation, and rebuild the index after automatic-backup retention pruning.
pub fn index_backup_refs(
    tx: &Transaction<'_>, kind: &str, id: i64, value: &Value,
) -> Result<(), String> {
    if kind != "automatic" && kind != "named" {
        return Err("Unknown backup kind".into());
    }
    let mut hashes = HashSet::new();
    collect_hashes(value, &mut hashes);
    for hash in hashes {
        // A backup must never reference a missing asset registration.
        tx.execute(
            "INSERT INTO image_backup_refs(backup_kind,backup_id,asset_hash)
             VALUES(?1,?2,?3)",
            params![kind, id, hash],
        ).map_err(err)?;
    }
    Ok(())
}

pub fn sync_backup_references(tx: &Transaction<'_>) -> Result<(), String> {
    tx.execute("DELETE FROM image_backup_refs", []).map_err(err)?;
    for (kind, table) in [("automatic", "backups"), ("named", "named_backups")] {
        let mut stmt = tx.prepare(&format!("SELECT id,payload FROM {table}")).map_err(err)?;
        let rows = stmt.query_map([], |r| {
            Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?))
        }).map_err(err)?;
        let snapshots = rows.collect::<rusqlite::Result<Vec<_>>>().map_err(err)?;
        drop(stmt);
        for (id, raw) in snapshots {
            let value: Value = serde_json::from_str(&raw).map_err(err)?;
            index_backup_refs(tx, kind, id, &value)?;
        }
    }
    Ok(())
}
pub fn read_public_catalog(db:&Connection)->Result<Vec<Value>,String>{
    let mut stmt=db.prepare("SELECT payload FROM image_public_catalog ORDER BY published_at,id").map_err(err)?;
    let rows=stmt.query_map([],|r|r.get::<_,String>(0)).map_err(err)?;
    rows.collect::<Result<Vec<_>,_>>().map_err(err)?
        .iter().map(|raw|serde_json::from_str(raw).map_err(err)).collect()
}
