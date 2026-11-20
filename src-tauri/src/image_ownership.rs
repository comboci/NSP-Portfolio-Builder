//! V79: physical assets remain immutable; project ownership is a separate relation.
//! Publishing is one-way. Deleting a project never deletes asset bytes.
use rusqlite::{params, Connection, OptionalExtension, Transaction};
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
// Maintain FK-backed typed edges alongside the legacy compatibility index.
// N-03: reconcile only changed rows. The complete workspace is still read from
// the existing frontend, but unchanged SQL rows are never rewritten.
#[derive(Default)]
struct Expected {
    owners: HashSet<Vec<String>>,
    legacy_uses: HashSet<Vec<String>>,
    page_private: HashSet<Vec<String>>,
    page_public: HashSet<Vec<String>>,
    template_public: HashSet<Vec<String>>,
}

struct Delta {
    remove: Vec<Vec<String>>,
    add: Vec<Vec<String>>,
}

fn difference(
    tx: &Transaction<'_>, table: &str, columns: &[&str],
    desired: &HashSet<Vec<String>>,
) -> Result<Delta, String> {
    // Identifiers are fixed by the caller; user input is always bound as values.
    let mut stmt=tx.prepare(&format!("SELECT {} FROM {table}",columns.join(","))).map_err(err)?;
    let rows=stmt.query_map([],|r| {
        (0..columns.len()).map(|i|r.get::<usize,String>(i))
            .collect::<rusqlite::Result<Vec<_>>>()
    }).map_err(err)?;
    let current:HashSet<Vec<String>>=
        rows.collect::<rusqlite::Result<HashSet<_>>>().map_err(err)?;
    Ok(Delta {
        remove:current.difference(desired).cloned().collect(),
        add:desired.difference(&current).cloned().collect(),
    })
}

fn apply_delete(
    tx:&Transaction<'_>,table:&str,columns:&[&str],rows:&[Vec<String>],
)->Result<(),String>{
    if rows.is_empty(){return Ok(());}
    let where_sql=columns.iter().enumerate()
        .map(|(n,c)|format!("{c}=?{}",n+1)).collect::<Vec<_>>().join(" AND ");
    let statement=format!("DELETE FROM {table} WHERE {where_sql}");
    for values in rows {
        tx.execute(&statement,rusqlite::params_from_iter(values.iter())).map_err(err)?;
    }
    Ok(())
}
fn apply_insert(
    tx:&Transaction<'_>,table:&str,columns:&[&str],rows:&[Vec<String>],
)->Result<(),String>{
    if rows.is_empty(){return Ok(());}
    let placeholders=(1..=columns.len())
        .map(|n|format!("?{n}")).collect::<Vec<_>>().join(",");
    let statement=format!("INSERT INTO {table}({}) VALUES({placeholders})",columns.join(","));
    for values in rows {
        tx.execute(&statement,rusqlite::params_from_iter(values.iter())).map_err(err)?;
    }
    Ok(())
}

fn public_catalog(tx:&Transaction<'_>,root:&Value)->Result<HashMap<String,String>,String>{
    if let Some(images)=root.get("globalImageLibrary").and_then(Value::as_array){
        for entry in images{
            let id=project_id(entry,"id")?;
            let hash=hash_of(entry)?;
            // Public identity/hash are immutable; rename changes metadata separately.
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

fn collect_usage(
    scope:&str,kind:&str,owner:&str,content:&Value,
    private:&HashMap<String,String>,public:&HashMap<String,String>,
    page:Option<(&str,&str)>,expected:&mut Expected,
)->Result<(),String>{
    let mut ids=HashSet::new();
    collect_asset_ids(content,&mut ids);
    for id in ids {
        let local=if scope=="@global"{None}else{private.get(&id)};
        let hash=local.or_else(||public.get(&id))
            .ok_or_else(||format!("Unowned or inaccessible image {id} referenced by {scope}/{kind}/{owner}"))?;
        expected.legacy_uses.insert(vec![
            scope.to_owned(),kind.to_owned(),owner.to_owned(),id.clone(),hash.clone()
        ]);
        match page {
            Some((portfolio_id,page_id))=>{
                let row=vec![
                    scope.to_owned(),portfolio_id.to_owned(),page_id.to_owned(),
                    id,hash.clone()
                ];
                if local.is_some(){expected.page_private.insert(row);}
                else{expected.page_public.insert(row);}
            }
            None if scope=="@global"=>{
                expected.template_public.insert(vec![
                    kind.to_owned(),owner.to_owned(),id,hash.clone()
                ]);
            }
            None=>return Err("Image use without a typed page or template owner".into()),
        }
    }
    Ok(())
}

fn collect_project(
    project:&str,content:&Value,public:&HashMap<String,String>,
    expected:&mut Expected,
)->Result<(),String>{
    let mut private=HashMap::new();
    if let Some(images)=content.get("imageLibrary").and_then(Value::as_array){
        for image in images{
            let id=project_id(image,"id")?;
            let hash=hash_of(image)?;
            if private.insert(id.to_owned(),hash.clone()).is_some(){
                return Err(format!("Duplicate private image {project}/{id}"));
            }
            expected.owners.insert(vec![project.to_owned(),id.to_owned(),hash]);
        }
    }
    if let Some(portfolios)=content.get("portfolios").and_then(Value::as_array){
        for portfolio in portfolios{
            let portfolio_id=project_id(portfolio,"id")?;
            if let Some(pages)=portfolio.get("pages").and_then(Value::as_array){
                for page in pages {
                    let page_id=project_id(page,"id")?;
                    collect_usage(
                        project,"page",&format!("{portfolio_id}/{page_id}"),page,
                        &private,public,Some((portfolio_id,page_id)),expected,
                    )?;
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
// N-06: update ONLY the currently edited page's media-reference edges.
// Owners and the public catalog must already be registered by Save Project.
// Never silently publish/share a newly imported image during Save Page.
pub fn persist_page_usage(
    tx:&Transaction<'_>,project:&str,portfolio:&str,page_id:&str,page:&Value,
)->Result<(),String>{
    let mut private=HashMap::new();
    {
        let mut stmt=tx.prepare(
            "SELECT image_id,asset_hash FROM image_project_owners WHERE project_id=?1"
        ).map_err(err)?;
        let rows=stmt.query_map([project],|r|Ok((
            r.get::<_,String>(0)?,r.get::<_,String>(1)?,
        ))).map_err(err)?;
        for row in rows {let (id,hash)=row.map_err(err)?;private.insert(id,hash);}
    }
    let mut public=HashMap::new();
    {
        let mut stmt=tx.prepare("SELECT id,asset_hash FROM image_public_catalog").map_err(err)?;
        let rows=stmt.query_map([],|r|Ok((
            r.get::<_,String>(0)?,r.get::<_,String>(1)?,
        ))).map_err(err)?;
        for row in rows {let (id,hash)=row.map_err(err)?;public.insert(id,hash);}
    }
    let mut images=HashSet::new();
    collect_asset_ids(page,&mut images);
    let mut refs=Vec::new();
    for image_id in images {
        if let Some(hash)=private.get(&image_id){
            refs.push((image_id,hash.clone(),true));
        } else if let Some(hash)=public.get(&image_id){
            refs.push((image_id,hash.clone(),false));
        } else {
            return Err(format!(
                "Page image {image_id} is not registered; Save Project and its image library first"
            ));
        }
    }
    for table in ["image_page_private_refs","image_page_public_refs"]{
        tx.execute(
            &format!("DELETE FROM {table} WHERE project_id=?1 AND portfolio_id=?2 AND page_id=?3"),
            params![project,portfolio,page_id],
        ).map_err(err)?;
    }
    let owner=format!("{portfolio}/{page_id}");
    tx.execute(
        "DELETE FROM image_usage_edges
         WHERE scope_id=?1 AND owner_kind='page' AND owner_id=?2",
        params![project,&owner],
    ).map_err(err)?;
    for (image_id,hash,private_owner) in refs {
        let table=if private_owner{"image_page_private_refs"}else{"image_page_public_refs"};
        tx.execute(
            &format!(
                "INSERT INTO {table}(project_id,portfolio_id,page_id,image_id,asset_hash)
                 VALUES(?1,?2,?3,?4,?5)"
            ),
            params![project,portfolio,page_id,&image_id,&hash],
        ).map_err(err)?;
        tx.execute(
            "INSERT INTO image_usage_edges(scope_id,owner_kind,owner_id,image_id,asset_hash)
             VALUES(?1,'page',?2,?3,?4)",
            params![project,&owner,&image_id,&hash],
        ).map_err(err)?;
    }
    Ok(())
}

pub fn persist_ownership(tx:&Transaction<'_>,workspace:&Value)->Result<(),String>{
    // The relational project/page/template projection has already been committed
    // to this transaction. FK cascades for removed parents happen there.
    let public=public_catalog(tx,workspace)?;
    let mut expected=Expected::default();
    let active=workspace.get("activeWorkspaceId").and_then(Value::as_str)
        .unwrap_or("legacy-default");
    collect_project(active,workspace,&public,&mut expected)?;
    if let Some(inactive)=workspace.get("projectWorkspaces").and_then(Value::as_array){
        for entry in inactive {
            collect_project(
                project_id(entry,"id")?,
                entry.get("data").ok_or("Missing project data")?,
                &public,&mut expected,
            )?;
        }
    }
    let templates=workspace.get("globalTemplates").filter(|v|v.is_object())
        .unwrap_or(workspace);
    for kind in ["masterTemplates","sectionDesigns","templates"] {
        if let Some(entries)=templates.get(kind).and_then(Value::as_array){
            for item in entries{
                collect_usage(
                    "@global",kind,project_id(item,"id")?,item,
                    &HashMap::new(),&public,None,&mut expected,
                )?;
            }
        }
    }

    const OWNER_COLS:&[&str]=&["project_id","image_id","asset_hash"];
    const LEGACY_COLS:&[&str]=&["scope_id","owner_kind","owner_id","image_id","asset_hash"];
    const PAGE_COLS:&[&str]=&["project_id","portfolio_id","page_id","image_id","asset_hash"];
    const TEMPLATE_COLS:&[&str]=&["template_kind","template_id","image_id","asset_hash"];

    let owners=difference(tx,"image_project_owners",OWNER_COLS,&expected.owners)?;
    let private=difference(tx,"image_page_private_refs",PAGE_COLS,&expected.page_private)?;
    let public_uses=difference(tx,"image_page_public_refs",PAGE_COLS,&expected.page_public)?;
    let templates=difference(tx,"image_template_public_refs",TEMPLATE_COLS,&expected.template_public)?;
    let legacy=difference(tx,"image_usage_edges",LEGACY_COLS,&expected.legacy_uses)?;

    // Phase 1: remove stale child edges BEFORE changing an owner's content hash.
    // A hash replacement is one old-row deletion + one new-row insertion.
    apply_delete(tx,"image_page_private_refs",PAGE_COLS,&private.remove)?;
    apply_delete(tx,"image_page_public_refs",PAGE_COLS,&public_uses.remove)?;
    apply_delete(tx,"image_template_public_refs",TEMPLATE_COLS,&templates.remove)?;
    apply_delete(tx,"image_usage_edges",LEGACY_COLS,&legacy.remove)?;

    // Phase 2: reconcile private owners. Unchanged rows retain their identity.
    apply_delete(tx,"image_project_owners",OWNER_COLS,&owners.remove)?;
    apply_insert(tx,"image_project_owners",OWNER_COLS,&owners.add)?;

    // Phase 3: all required parents exist; add only missing/new child links.
    apply_insert(tx,"image_page_private_refs",PAGE_COLS,&private.add)?;
    apply_insert(tx,"image_page_public_refs",PAGE_COLS,&public_uses.add)?;
    apply_insert(tx,"image_template_public_refs",TEMPLATE_COLS,&templates.add)?;
    apply_insert(tx,"image_usage_edges",LEGACY_COLS,&legacy.add)?;
    Ok(())
}

// Backups are immutable snapshots. Only a newly created snapshot is indexed;
// previously recorded references remain untouched.
pub fn index_backup_refs(
    tx: &Transaction<'_>, kind: &str, id: i64, value: &Value,
) -> Result<(), String> {
    // Separate child tables give each backup ref an actual FK to its parent.
    let child_table=match kind {
        "automatic"=>"automatic_backup_asset_refs",
        "named"=>"named_backup_asset_refs",
        _=>return Err("Unknown backup kind".into()),
    };
    let mut hashes=HashSet::new();
    collect_hashes(value,&mut hashes);
    for hash in hashes {
        tx.execute(
            "INSERT INTO image_backup_refs(backup_kind,backup_id,asset_hash)
             VALUES(?1,?2,?3)",
            params![kind,id,hash],
        ).map_err(err)?;
        // The child-table name is a hardcoded allow-list choice.
        tx.execute(
            &format!("INSERT INTO {child_table}(backup_id,asset_hash) VALUES(?1,?2)"),
            params![id,hash],
        ).map_err(err)?;
    }
    Ok(())
}

// Typed automatic-backup rows are cascaded by the parent FK when retention
// deletes an old backup. The old polymorphic index has no parent FK, so prune
// only orphaned automatic rows; never scan or rewrite retained named backups.
pub fn prune_automatic_backup_refs(tx:&Transaction<'_>)->Result<(),String>{
    tx.execute(
        "DELETE FROM image_backup_refs
         WHERE backup_kind='automatic'
           AND NOT EXISTS(SELECT 1 FROM backups b WHERE b.id=image_backup_refs.backup_id)",
        [],
    ).map_err(err)?;
    Ok(())
}
// V110: Rename public metadata in its canonical row, without changing
// ownership, source hash, published timestamp, image usage, or backups.
pub fn rename_public_metadata(tx:&Transaction<'_>,id:&str,name:&str)->Result<(),String>{
    let name=name.trim();
    if id.trim().is_empty()||name.is_empty()||name.chars().count()>120||
       name.chars().any(|ch|ch.is_control()){
        return Err("Invalid public image identity or name".into());
    }
    // Caller handles atomic workspace revision check/advance and commit.
    let stored:Option<(String,String)>=tx.query_row(
        "SELECT asset_hash,payload FROM image_public_catalog WHERE id=?1",
        [id],|row|Ok((row.get(0)?,row.get(1)?))
    ).optional().map_err(err)?;
    let (original_hash,raw)=stored.ok_or("Public image not found")?;
    let mut payload:Value=serde_json::from_str(&raw).map_err(err)?;
    if payload.get("id").and_then(Value::as_str)!=Some(id)||
       hash_of(&payload)?!=original_hash{
        return Err("Stored public image identity/hash mismatch".into());
    }
    payload["name"]=Value::String(name.to_owned());
    let changed=tx.execute(
        "UPDATE image_public_catalog SET payload=?1 WHERE id=?2 AND asset_hash=?3",
        params![payload.to_string(),id,original_hash]
    ).map_err(err)?;
    if changed!=1{return Err("Public image rename was not saved".into());}
    Ok(())
}

pub fn read_public_catalog(db:&Connection)->Result<Vec<Value>,String>{
    let mut stmt=db.prepare("SELECT payload FROM image_public_catalog ORDER BY published_at,id").map_err(err)?;
    let rows=stmt.query_map([],|r|r.get::<_,String>(0)).map_err(err)?;
    rows.collect::<Result<Vec<_>,_>>().map_err(err)?
        .iter().map(|raw|serde_json::from_str(raw).map_err(err)).collect()
}
