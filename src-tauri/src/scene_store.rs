//! N-05: derived relational scene graph. JSON page/template payloads remain
//! the only editable source of truth; this module NEVER writes their payloads.
use rusqlite::{params, OptionalExtension, Transaction};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, HashMap, HashSet};

fn err(e:impl std::fmt::Display)->String{e.to_string()}

struct SceneSource {
    key:String,
    owner_kind:&'static str,
    project_id:Option<String>,
    portfolio_id:Option<String>,
    page_id:Option<String>,
    template_kind:Option<String>,
    template_id:Option<String>,
    payload:String,
}
impl SceneSource {
    fn origin(&self)->(&str,&str){
        if self.owner_kind=="page" {
            return ("page",self.page_id.as_deref().unwrap_or(""));
        }
        let origin=match self.template_kind.as_deref(){
            Some("masterTemplates")=>"master",
            Some("sectionDesigns")=>"section",
            _=>"template",
        };
        (origin,self.template_id.as_deref().unwrap_or(""))
    }
    fn digest(&self,tx:&Transaction<'_>)->Result<String,String>{
        // Media assets can change under a stable assetId with no JSON scene
        // change. Include the hashes of directly used assets in the digest.
        let mut hash=Sha256::new();
        hash.update(self.payload.as_bytes());
        if let Ok(value)=serde_json::from_str::<Value>(&self.payload){
            let field=if self.owner_kind=="page"{"visualObjects"}else{"objects"};
            let mut asset_ids=std::collections::BTreeSet::new();
            if let Some(items)=value.get(field).and_then(Value::as_array){
                for item in items {
                    if let Some(asset)=id(item,"assetId"){asset_ids.insert(asset);}
                }
            }
            for asset in asset_ids {
                hash.update([0]);
                hash.update(asset.as_bytes());
                hash.update([0]);
                if let Some(content_hash)=asset_hash(tx,self,asset)?{
                    hash.update(content_hash.as_bytes());
                }else{hash.update([255]);}
            }
        }
        Ok(format!("{:x}",hash.finalize()))
    }
}
fn sources(tx:&Transaction<'_>)->Result<Vec<SceneSource>,String>{
    let mut result=Vec::new();
    {
        let mut stmt=tx.prepare(
            "SELECT project_id,portfolio_id,id,payload FROM workspace_pages"
        ).map_err(err)?;
        let rows=stmt.query_map([],|r|Ok((
            r.get::<_,String>(0)?,r.get::<_,String>(1)?,
            r.get::<_,String>(2)?,r.get::<_,String>(3)?,
        ))).map_err(err)?;
        for row in rows {
            let (project,portfolio,page,payload)=row.map_err(err)?;
            result.push(SceneSource{
                key:json!(["page",project,portfolio,page]).to_string(),
                owner_kind:"page",
                project_id:Some(project),portfolio_id:Some(portfolio),
                page_id:Some(page),template_kind:None,template_id:None,payload,
            });
        }
    }
    {
        let mut stmt=tx.prepare("SELECT kind,id,payload FROM shared_templates").map_err(err)?;
        let rows=stmt.query_map([],|r|Ok((
            r.get::<_,String>(0)?,r.get::<_,String>(1)?,r.get::<_,String>(2)?,
        ))).map_err(err)?;
        for row in rows {
            let (kind,id,payload)=row.map_err(err)?;
            result.push(SceneSource{
                key:json!(["template",kind,id]).to_string(),
                owner_kind:"template",project_id:None,portfolio_id:None,page_id:None,
                template_kind:Some(kind),template_id:Some(id),payload,
            });
        }
    }
    Ok(result)
}

#[derive(Clone)]
struct Layer {
    key:String,id:String,origin:String,owner:String,
    path:Option<String>,position:i64,implicit:bool,
}
struct Group {
    key:String,id:String,origin:String,owner:String,position:i64,
}
struct Element {
    id:String,kind:String,path:String,position:i64,
    layer_key:String,group_key:Option<String>,block_id:Option<String>,
    style_id:Option<String>,asset_id:Option<String>,asset_hash:Option<String>,
}
#[derive(Default)]
struct Graph {
    layers:BTreeMap<String,Layer>,
    groups:BTreeMap<String,Group>,
    elements:Vec<Element>,
    templates:HashSet<(String,String,String)>,
    issues:Vec<(String,String,String)>,
}
fn id<'a>(v:&'a Value,field:&str)->Option<&'a str>{
    v.get(field).and_then(Value::as_str).filter(|s|!s.is_empty())
}
fn triple(origin:&str,owner:&str,id:&str)->String{
    json!([origin,owner,id]).to_string()
}
fn invalid(
    graph:&mut Graph,strict:bool,path:&str,code:&str,detail:impl Into<String>,
)->Result<(),String>{
    let detail=detail.into();
    if strict{return Err(format!("Scene {path}: {code}: {detail}"));}
    graph.issues.push((path.to_owned(),code.to_owned(),detail));
    Ok(())
}
fn layer(
    graph:&mut Graph,origin:&str,owner:&str,layer_id:&str,
    path:Option<String>,position:i64,
)->String{
    let key=triple(origin,owner,layer_id);
    let explicit=path.is_some();
    graph.layers.entry(key.clone()).and_modify(|l|{
        if explicit && l.implicit {
            l.path=path.clone();
            l.position=position;
            l.implicit=false;
        }
    }).or_insert_with(||Layer{
        key:key.clone(),id:layer_id.to_owned(),origin:origin.to_owned(),
        owner:owner.to_owned(),path,position,implicit:!explicit,
    });
    key
}
fn group(
    graph:&mut Graph,origin:&str,owner:&str,group_id:&str,position:i64,
)->String{
    let key=triple(origin,owner,group_id);
    graph.groups.entry(key.clone()).or_insert_with(||Group{
        key:key.clone(),id:group_id.to_owned(),
        origin:origin.to_owned(),owner:owner.to_owned(),position,
    });
    key
}
fn template_link(
    tx:&Transaction<'_>,graph:&mut Graph,strict:bool,
    source_path:&str,relation:&str,kind:&str,template:&str,
)->Result<(),String>{
    if template.is_empty()||template=="none"||template=="master"{return Ok(());}
    let exists:i64=tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM shared_templates WHERE kind=?1 AND id=?2)",
        params![kind,template],|r|r.get(0),
    ).map_err(err)?;
    if exists==0 {
        invalid(graph,strict,source_path,"missing_template",
            format!("{kind}/{template}"))?;
    }else{
        graph.templates.insert((kind.to_owned(),template.to_owned(),relation.to_owned()));
    }
    Ok(())
}
fn asset_hash(
    tx:&Transaction<'_>,source:&SceneSource,asset_id:&str,
)->Result<Option<String>,String>{
    if let Some(project)=source.project_id.as_deref(){
        let private=tx.query_row(
            "SELECT asset_hash FROM image_project_owners
             WHERE project_id=?1 AND image_id=?2",
            params![project,asset_id],|r|r.get::<_,String>(0),
        ).optional().map_err(err)?;
        if private.is_some(){return Ok(private);}
    }
    tx.query_row(
        "SELECT asset_hash FROM image_public_catalog WHERE id=?1",
        [asset_id],|r|r.get::<_,String>(0),
    ).optional().map_err(err)
}

fn build_graph(
    tx:&Transaction<'_>,source:&SceneSource,value:&Value,strict:bool,
)->Result<Graph,String>{
    let mut graph=Graph::default();
    let (origin,owner)=source.origin();
    // The editor has a default layer even when the old JSON has no layers.
    layer(&mut graph,origin,owner,"default",None,0);

    if let Some(raw)=value.get("layers"){
        if let Some(items)=raw.as_array(){
            for (n,item) in items.iter().enumerate(){
                let path=format!("/layers/{n}");
                if let Some(layer_id)=id(item,"id"){
                    let layer_origin=id(item,"origin").unwrap_or(origin);
                    let layer_owner=id(item,"ownerId").unwrap_or(owner);
                    layer(&mut graph,layer_origin,layer_owner,layer_id,
                        Some(path),n as i64);
                }else{invalid(&mut graph,strict,&path,"invalid_layer_id","missing id")?;}
            }
        }else{invalid(&mut graph,strict,"/layers","invalid_layers","not an array")?;}
    }

    let object_field=if source.owner_kind=="page"{"visualObjects"}else{"objects"};
    let objects=value.get(object_field).and_then(Value::as_array);
    if value.get(object_field).is_some()&&objects.is_none(){
        invalid(&mut graph,strict,&format!("/{object_field}"),
            "invalid_elements","not an array")?;
    }
    let mut block_types=HashMap::new();
    if let Some(items)=objects {
        for item in items {
            if let Some(oid)=id(item,"id"){
                block_types.insert(oid.to_owned(),id(item,"type").unwrap_or("text").to_owned());
            }
        }
    }
    let mut seen=HashSet::new();
    if let Some(items)=objects {
        for (n,item) in items.iter().enumerate(){
            let path=format!("/{object_field}/{n}");
            let Some(element_id)=id(item,"id") else {
                invalid(&mut graph,strict,&path,"invalid_element_id","missing id")?;
                continue;
            };
            if !seen.insert(element_id.to_owned()){
                invalid(&mut graph,strict,&path,"duplicate_element_id",element_id)?;
                continue;
            }
            let kind=id(item,"type").unwrap_or("text").to_owned();
            let lid=id(item,"layerId").unwrap_or("default");
            let layer_origin=id(item,"layerOrigin").unwrap_or(origin);
            let layer_owner=id(item,"layerOwnerId").unwrap_or(owner);
            let layer_key=layer(&mut graph,layer_origin,layer_owner,lid,None,n as i64);
            let group_key=id(item,"groupId").map(|gid|{
                let gorigin=id(item,"groupOrigin").unwrap_or(origin);
                let gowner=id(item,"groupOwnerId").unwrap_or(owner);
                group(&mut graph,gorigin,gowner,gid,n as i64)
            });
            let mut block_id=id(item,"blockId").map(str::to_owned);
            if let Some(bid)=block_id.as_deref(){
                if block_types.get(bid).map(String::as_str)!=Some("block")||bid==element_id{
                    invalid(&mut graph,strict,&format!("{path}/blockId"),
                        "missing_local_block",bid)?;
                    block_id=None;
                }
            }
            let mut style=id(item,"styleId")
                .filter(|_|kind=="text").map(str::to_owned);
            if let Some(sid)=style.as_deref(){
                let exists:i64=tx.query_row(
                    "SELECT EXISTS(SELECT 1 FROM shared_styles WHERE id=?1)",
                    [sid],|r|r.get(0),
                ).map_err(err)?;
                if exists==0{
                    invalid(&mut graph,strict,&format!("{path}/styleId"),
                        "missing_style",sid)?;
                    style=None;
                }
            }
            let asset=id(item,"assetId").map(str::to_owned);
            let mut hash=None;
            if let Some(aid)=asset.as_deref(){
                hash=asset_hash(tx,source,aid)?;
                if hash.is_none(){
                    invalid(&mut graph,strict,&format!("{path}/assetId"),
                        "missing_asset",aid)?;
                }
            }
            graph.elements.push(Element{
                id:element_id.to_owned(),kind,path,position:n as i64,
                layer_key,group_key,block_id,style_id:style,
                asset_id:asset,asset_hash:hash,
            });
        }
    }

    // The authoritative master/section/page references remain in page JSON
    // and in global_template_dependencies; this table is only a join index.
    for (field,kind) in [
        ("masterTemplateId","masterTemplates"),
        ("sectionDesignId","sectionDesigns"),
        ("templateId","templates"),
        ("parentMasterId","masterTemplates"),
        ("masterId","masterTemplates"),
    ]{
        if let Some(value)=id(value,field){
            template_link(tx,&mut graph,strict,&format!("/{field}"),field,kind,value)?;
        }
    }
    Ok(graph)
}

fn note_issue(
    tx:&Transaction<'_>,scene:&str,path:&str,code:&str,detail:&str,
)->Result<(),String>{
    tx.execute(
        "INSERT OR IGNORE INTO design_scene_projection_issues(
            scene_key,source_path,issue_code,detail
         ) VALUES(?1,?2,?3,?4)",
        params![scene,path,code,detail],
    ).map_err(err)?;
    Ok(())
}

fn rebuild(tx:&Transaction<'_>,source:&SceneSource,strict:bool)->Result<(),String>{
    let fingerprint=source.digest(tx)?;
    let prior:Option<String>=tx.query_row(
        "SELECT source_sha256 FROM design_scenes WHERE scene_key=?1",
        [&source.key],|r|r.get(0),
    ).optional().map_err(err)?;
    if prior.as_deref()==Some(fingerprint.as_str()){return Ok(());}

    let value:Value=match serde_json::from_str(&source.payload){
        Ok(value)=>value,
        Err(e) if !strict=>{
            note_issue(tx,&source.key,"/","invalid_scene_json",&e.to_string())?;
            return Ok(());
        }
        Err(e)=>return Err(format!("Scene {}: invalid JSON: {e}",source.key)),
    };
    let graph=build_graph(tx,source,&value,strict)?;

    tx.execute(
        "INSERT INTO design_scenes(
            scene_key,owner_kind,project_id,portfolio_id,page_id,
            template_kind,template_id,source_sha256
         ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)
         ON CONFLICT(scene_key) DO UPDATE SET
             source_sha256=excluded.source_sha256",
        params![
            &source.key,source.owner_kind,source.project_id.as_deref(),
            source.portfolio_id.as_deref(),source.page_id.as_deref(),
            source.template_kind.as_deref(),source.template_id.as_deref(),
            fingerprint
        ],
    ).map_err(err)?;

    // A changed scene replaces only its own derived children. Unchanged
    // scenes are skipped; the canonical JSON payload is never touched.
    tx.execute(
        "DELETE FROM design_scene_template_links WHERE scene_key=?1",
        [&source.key],
    ).map_err(err)?;
    tx.execute(
        "DELETE FROM design_scene_elements WHERE scene_key=?1",
        [&source.key],
    ).map_err(err)?;
    tx.execute(
        "DELETE FROM design_scene_groups WHERE scene_key=?1",
        [&source.key],
    ).map_err(err)?;
    tx.execute(
        "DELETE FROM design_scene_layers WHERE scene_key=?1",
        [&source.key],
    ).map_err(err)?;

    for l in graph.layers.values(){
        tx.execute(
            "INSERT INTO design_scene_layers(
               scene_key,layer_key,layer_id,origin,origin_owner_id,
               source_path,position,is_implicit
             ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",
            params![
                &source.key,&l.key,&l.id,&l.origin,&l.owner,
                l.path.as_deref(),l.position,if l.implicit{1}else{0}
            ],
        ).map_err(err)?;
    }
    for g in graph.groups.values(){
        tx.execute(
            "INSERT INTO design_scene_groups(
              scene_key,group_key,group_id,origin,origin_owner_id,first_position
             ) VALUES(?1,?2,?3,?4,?5,?6)",
            params![
                &source.key,&g.key,&g.id,&g.origin,&g.owner,g.position
            ],
        ).map_err(err)?;
    }
    for e in &graph.elements {
        tx.execute(
            "INSERT INTO design_scene_elements(
               scene_key,element_id,element_type,source_path,position,
               layer_key,group_key,block_id,style_id,asset_id,asset_hash
             ) VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)",
            params![
                &source.key,&e.id,&e.kind,&e.path,e.position,&e.layer_key,
                e.group_key.as_deref(),e.block_id.as_deref(),
                e.style_id.as_deref(),e.asset_id.as_deref(),
                e.asset_hash.as_deref()
            ],
        ).map_err(err)?;
    }
    for (kind,template,relation) in &graph.templates {
        tx.execute(
            "INSERT INTO design_scene_template_links(
                scene_key,template_kind,template_id,relation
             ) VALUES(?1,?2,?3,?4)",
            params![&source.key,kind,template,relation],
        ).map_err(err)?;
    }
    for (path,code,detail) in &graph.issues {
        note_issue(tx,&source.key,path,code,detail)?;
    }
    Ok(())
}

// Called after project_store and image_ownership have updated the canonical
// parents and asset ownership, and before obsolete style IDs are removed.
pub fn persist_scene_projections(tx:&Transaction<'_>)->Result<(),String>{
    for source in sources(tx)?{rebuild(tx,&source,true)?;}
    Ok(())
}

// Transactional upgrade of already-saved pages and shared templates.
// Historical malformed scene references are journaled, never erased.
pub fn backfill_scene_projections(tx:&Transaction<'_>)->Result<(),String>{
    for source in sources(tx)?{rebuild(tx,&source,false)?;}
    Ok(())
}
