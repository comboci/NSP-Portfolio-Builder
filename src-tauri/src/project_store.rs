//! V78 persistent relational projects/portfolios/pages with a shared template catalog.
//! The previous workspace record remains readable for pre-V78 migrations and backups.
//! Image ownership across projects is implemented separately in TASK-007.
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde_json::{json, Value};
use std::collections::{HashMap, HashSet};

fn err(e: impl std::fmt::Display) -> String { e.to_string() }
fn identity<'a>(value:&'a Value,field:&str)->Result<&'a str,String>{
    let s=value.get(field).and_then(Value::as_str).ok_or_else(||format!("Missing {field}"))?;
    if s.is_empty(){return Err(format!("Empty {field}"));}
    Ok(s)
}

// V102 TASK-006/014: the named Style Library has one canonical SQLite table.
// Existing JSON workspace and backup payloads remain readable for recovery.
fn style_catalog<'a>(workspace:&'a Value)->Result<Option<&'a Vec<Value>>,String>{
    let source=workspace.get("globalTemplates").filter(|v|v.is_object())
        .and_then(|v|v.get("styleLibrary")).filter(|v|!v.is_null())
        .or_else(||workspace.get("styleLibrary").filter(|v|!v.is_null()));
    match source {
        None=>Ok(None),
        Some(v)=>v.as_array().map(Some).ok_or_else(||"Invalid central style library".to_owned()),
    }
}
// Stage changed style records without deleting stable IDs. Reconcile their
// references before removing obsolete IDs, so FK RESTRICT is always enforced.
fn persist_shared_styles(
    tx:&Transaction<'_>, workspace:&Value,
)->Result<Option<HashSet<String>>,String>{
    let Some(styles)=style_catalog(workspace)? else{return Ok(None);};
    let mut ids=HashSet::new();
    let mut names=HashSet::new();
    let mut incoming=Vec::new();
    for (position,style) in styles.iter().enumerate() {
        if !style.is_object(){return Err("Invalid central style record".into());}
        let id=identity(style,"id")?;
        let name=identity(style,"name")?.trim();
        if name.is_empty()||name.chars().count()>80{
            return Err("Invalid central style name".into());
        }
        if !ids.insert(id.to_owned())||!names.insert(name.to_lowercase()){
            return Err(format!("Duplicate central style identity or name: {name}"));
        }
        incoming.push((id.to_owned(),name.to_owned(),position as i64,style.to_string()));
    }

    // Free names of retired/renamed rows first. SQLite's NOCASE uniqueness
    // otherwise rejects swaps or reusing the name of a deleted style.
    // Temporary names are visible only inside this transaction.
    let existing:Vec<(String,String)>={
        let mut stmt=tx.prepare("SELECT id,name FROM shared_styles").map_err(err)?;
        let rows=stmt.query_map([],|r|Ok((r.get(0)?,r.get(1)?))).map_err(err)?;
        rows.collect::<rusqlite::Result<_>>().map_err(err)?
    };
    let desired_names:HashMap<&str,&str>=incoming.iter()
        .map(|(id,name,_,_)|(id.as_str(),name.as_str())).collect();
    for (id,old_name) in existing{
        if desired_names.get(id.as_str()).map_or(true, |name|*name!=old_name.as_str()){
            tx.execute(
                "UPDATE shared_styles SET name='__n04_staged_' || hex(randomblob(16))
                 WHERE id=?1",
                [&id],
            ).map_err(err)?;
        }
    }
    for (id,name,position,payload) in &incoming {
        tx.execute(
            "INSERT INTO shared_styles(id,name,position,payload)
             VALUES(?1,?2,?3,?4)
             ON CONFLICT(id) DO UPDATE SET
                name=excluded.name,position=excluded.position,payload=excluded.payload
             WHERE name IS NOT excluded.name OR position IS NOT excluded.position
                OR payload IS NOT excluded.payload",
            params![id,name,position,payload],
        ).map_err(err)?;
    }
    Ok(Some(ids))
}
fn load_shared_styles(db:&Connection)->Result<Vec<Value>,String>{
    let mut stmt=db.prepare("SELECT payload FROM shared_styles ORDER BY position,id").map_err(err)?;
    let rows=stmt.query_map([],|r|r.get::<_,String>(0)).map_err(err)?;
    let raw=rows.collect::<Result<Vec<_>,_>>().map_err(err)?;
    raw.iter().map(|v|serde_json::from_str(v).map_err(err)).collect()
}
// Migrate once from the previous workspace snapshot, without rewriting
// snapshots, automatic backups or named backups.
pub fn migrate_style_library(tx:&Transaction<'_>)->Result<(),String>{
    let primary:Option<String>=tx.query_row(
        "SELECT payload FROM projects WHERE id='workspace'",[],|r|r.get(0)).optional().map_err(err)?;
    let fallback:Option<String>=if primary.is_none(){
        tx.query_row("SELECT payload FROM workspace_projects WHERE is_active=1 LIMIT 1",[],|r|r.get(0))
            .optional().map_err(err)?
    }else{None};
    if let Some(payload)=primary.or(fallback){
        let existing:Value=serde_json::from_str(&payload).map_err(err)?;
        persist_shared_styles(tx,&existing)?;
    }
    Ok(())
}

// Reconcile stable primary keys without rewriting all projects/pages at every save.
#[derive(Default)]
struct SeenKeys {
    projects: HashSet<Vec<String>>,
    portfolios: HashSet<Vec<String>>,
    pages: HashSet<Vec<String>>,
    templates: HashSet<Vec<String>>,
}

fn delete_missing(
    tx: &Transaction<'_>, table: &str, columns: &[&str], seen: &HashSet<Vec<String>>,
) -> Result<(), String> {
    // Table and column identifiers are internal constants, not frontend input.
    let select = format!("SELECT {} FROM {table}", columns.join(","));
    let mut stmt = tx.prepare(&select).map_err(err)?;
    let rows = stmt.query_map([], |row| {
        (0..columns.len()).map(|i| row.get::<usize, String>(i))
            .collect::<rusqlite::Result<Vec<_>>>()
    }).map_err(err)?;
    let old = rows.collect::<rusqlite::Result<Vec<_>>>().map_err(err)?;
    drop(stmt);
    let where_clause = columns.iter().enumerate()
        .map(|(i, column)| format!("{column}=?{}", i + 1))
        .collect::<Vec<_>>().join(" AND ");
    let delete = format!("DELETE FROM {table} WHERE {where_clause}");
    for key in old {
        if !seen.contains(&key) {
            tx.execute(&delete, rusqlite::params_from_iter(key.iter())).map_err(err)?;
        }
    }
    Ok(())
}

type StyleBindings=HashMap<Vec<String>,(Option<String>,String)>;

fn known_style_ids(tx:&Transaction<'_>)->Result<HashSet<String>,String>{
    let mut stmt=tx.prepare("SELECT id FROM shared_styles").map_err(err)?;
    let rows=stmt.query_map([],|r|r.get::<_,String>(0)).map_err(err)?;
    rows.collect::<rusqlite::Result<_>>().map_err(err)
}

fn collect_text_styles(
    value:&Value, path:&str,
    bindings:&mut Vec<(String,Option<String>,String)>,
    invalid:&mut Vec<(String,String)>,
){
    match value {
        Value::Object(map)=>{
            // Text objects and type-less text override patches may carry a
            // central styleId; do not lose the latter merely because the
            // patch does not repeat its object's type.
            if map.get("type").map_or(true,|kind|kind.as_str()==Some("text")) {
                if let Some(raw)=map.get("styleId") {
                    let element_path=if path.is_empty(){"/".to_owned()}else{path.to_owned()};
                    match raw {
                        Value::String(style) if !style.is_empty()=>{
                            bindings.push((
                                element_path,
                                map.get("id").and_then(Value::as_str).map(str::to_owned),
                                style.to_owned(),
                            ));
                        }
                        Value::Null|Value::String(_)=>{},
                        other=>invalid.push((element_path,other.to_string())),
                    }
                }
            }
            for (key,child) in map {
                // JSON-pointer escaping makes object paths unambiguous even
                // when a key contains '/' or '~'. Array position is part of
                // the key until N-05 introduces separate element records.
                let token=key.replace('~',"~0").replace('/',"~1");
                collect_text_styles(child,&format!("{path}/{token}"),bindings,invalid);
            }
        }
        Value::Array(items)=>{
            for (index,child) in items.iter().enumerate() {
                collect_text_styles(child,&format!("{path}/{index}"),bindings,invalid);
            }
        }
        _=>{}
    }
}

fn note_style_reference_issue(
    tx:&Transaction<'_>,kind:&str,owner:&str,path:&str,style:&str,reason:&str,
)->Result<(),String>{
    tx.execute(
        "INSERT OR IGNORE INTO style_reference_issues(
            owner_kind,owner_key,element_path,style_id,reason
         ) VALUES(?1,?2,?3,?4,?5)",
        params![kind,owner,path,style,reason],
    ).map_err(err)?;
    Ok(())
}

fn bindings_for_owner(
    tx:&Transaction<'_>,record:&Value,owner_type:&str,owner_key:&str,
    prefix:&[String],styles:&HashSet<String>,strict:bool,
    expected:&mut StyleBindings,
)->Result<(),String>{
    let mut bindings=Vec::new();
    let mut invalid=Vec::new();
    collect_text_styles(record,"",&mut bindings,&mut invalid);
    for (path,value) in invalid {
        if strict {
            return Err(format!("Invalid text style reference in {owner_type}/{owner_key}/{path}: {value}"));
        }
        note_style_reference_issue(tx,owner_type,owner_key,&path,&value,"invalid_style_id")?;
    }
    for (path,element_id,style_id) in bindings {
        if !styles.contains(&style_id) {
            if strict {
                return Err(format!("Missing shared text style {style_id} at {owner_type}/{owner_key}/{path}"));
            }
            note_style_reference_issue(tx,owner_type,owner_key,&path,&style_id,"unknown_style")?;
            continue;
        }
        let mut key=prefix.to_vec();
        key.push(path);
        if expected.insert(key,(element_id,style_id)).is_some() {
            return Err(format!("Duplicate text-style binding in {owner_type}/{owner_key}"));
        }
    }
    Ok(())
}

fn reconcile_style_ref_table(
    tx:&Transaction<'_>,table:&str,key_columns:&[&str],desired:&StyleBindings,
)->Result<(),String>{
    // Table and column identifiers are hard-coded call-site constants.
    let select=format!("SELECT {},element_id,style_id FROM {table}",key_columns.join(","));
    let existing:StyleBindings={
        let mut stmt=tx.prepare(&select).map_err(err)?;
        let rows=stmt.query_map([],|r|{
            let keys=(0..key_columns.len())
                .map(|n|r.get::<usize,String>(n))
                .collect::<rusqlite::Result<Vec<_>>>()?;
            let element_id=r.get::<usize,Option<String>>(key_columns.len())?;
            let style_id=r.get::<usize,String>(key_columns.len()+1)?;
            Ok((keys,(element_id,style_id)))
        }).map_err(err)?;
        rows.collect::<rusqlite::Result<_>>().map_err(err)?
    };
    let where_sql=key_columns.iter().enumerate()
        .map(|(n,k)|format!("{k}=?{}",n+1)).collect::<Vec<_>>().join(" AND ");
    let delete_sql=format!("DELETE FROM {table} WHERE {where_sql}");
    for key in existing.keys(){
        if !desired.contains_key(key){
            tx.execute(&delete_sql,rusqlite::params_from_iter(key.iter())).map_err(err)?;
        }
    }
    let cols=format!("{},element_id,style_id",key_columns.join(","));
    let placeholders=(1..=key_columns.len()+2)
        .map(|n|format!("?{n}")).collect::<Vec<_>>().join(",");
    let insert_sql=format!(
        "INSERT INTO {table}({cols}) VALUES({placeholders})
         ON CONFLICT({}) DO UPDATE SET
            element_id=excluded.element_id,style_id=excluded.style_id
         WHERE element_id IS NOT excluded.element_id OR style_id IS NOT excluded.style_id",
        key_columns.join(","),
    );
    for (key,pair) in desired {
        if existing.get(key)==Some(pair){continue;}
        let mut values=key.iter().cloned()
            .map(rusqlite::types::Value::Text).collect::<Vec<_>>();
        values.push(match &pair.0 {
            Some(v)=>rusqlite::types::Value::Text(v.clone()),
            None=>rusqlite::types::Value::Null,
        });
        values.push(rusqlite::types::Value::Text(pair.1.clone()));
        tx.execute(&insert_sql,rusqlite::params_from_iter(values)).map_err(err)?;
    }
    Ok(())
}

fn reconcile_style_bindings(
    tx:&Transaction<'_>,wanted:Option<&HashSet<String>>,strict:bool,
)->Result<(),String>{
    let styles=match wanted {
        Some(ids)=>ids.clone(),
        None=>known_style_ids(tx)?,
    };
    let pages:Vec<(String,String,String,String)>={
        let mut stmt=tx.prepare(
            "SELECT project_id,portfolio_id,id,payload FROM workspace_pages"
        ).map_err(err)?;
        let rows=stmt.query_map([],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?)))
            .map_err(err)?;
        rows.collect::<rusqlite::Result<_>>().map_err(err)?
    };
    let templates:Vec<(String,String,String)>={
        let mut stmt=tx.prepare("SELECT kind,id,payload FROM shared_templates").map_err(err)?;
        let rows=stmt.query_map([],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?)))
            .map_err(err)?;
        rows.collect::<rusqlite::Result<_>>().map_err(err)?
    };
    let mut page_refs=StyleBindings::new();
    let mut template_refs=StyleBindings::new();
    for (project,portfolio,page,payload) in pages {
        let value:Value=serde_json::from_str(&payload).map_err(err)?;
        let owner=json!([project,portfolio,page]).to_string();
        bindings_for_owner(
            tx,&value,"page",&owner,&[project,portfolio,page],
            &styles,strict,&mut page_refs,
        )?;
    }
    for (kind,id,payload) in templates {
        let value:Value=serde_json::from_str(&payload).map_err(err)?;
        let owner=json!([kind,id]).to_string();
        bindings_for_owner(
            tx,&value,"template",&owner,&[kind,id],
            &styles,strict,&mut template_refs,
        )?;
    }
    reconcile_style_ref_table(
        tx,"style_page_element_refs",
        &["project_id","portfolio_id","page_id","element_path"],&page_refs,
    )?;
    reconcile_style_ref_table(
        tx,"style_template_element_refs",
        &["template_kind","template_id","element_path"],&template_refs,
    )?;
    Ok(())
}

fn delete_obsolete_styles(
    tx:&Transaction<'_>,desired:&HashSet<String>,
)->Result<(),String>{
    let present=known_style_ids(tx)?;
    for id in present.difference(desired){
        // FK RESTRICT refuses deletion if any valid live binding still exists.
        tx.execute("DELETE FROM shared_styles WHERE id=?1",[id]).map_err(err)?;
    }
    Ok(())
}

// Called after migration 009 creates FK-backed binding tables. Old malformed
// style references remain in JSON and are recorded for review, not destroyed.
pub fn backfill_style_bindings(tx:&Transaction<'_>)->Result<(),String>{
    reconcile_style_bindings(tx,None,false)
}

fn persist_project(
    tx: &Transaction<'_>, id: &str, name: &str, data: &Value, active: bool,
    seen: &mut SeenKeys,
) -> Result<(), String> {
    if id.is_empty() || name.trim().is_empty() { return Err("Invalid project identity".into()); }
    if !seen.projects.insert(vec![id.to_owned()]) {
        return Err(format!("Duplicate project ID: {id}"));
    }
    // Pages and portfolios are authoritative in their relational tables.
    // Do not duplicate their full arrays in each project JSON record.
    let mut snapshot = data.clone();
    if let Some(m) = snapshot.as_object_mut() {
        for key in ["projectWorkspaces", "globalTemplates", "styleLibrary", "globalImageAlbums", "portfolios", "pages"] {
            m.remove(key);
        }
    }
    tx.execute(
        "INSERT INTO workspace_projects(id,name,payload,is_active) VALUES(?1,?2,?3,?4)
         ON CONFLICT(id) DO UPDATE SET name=excluded.name,payload=excluded.payload,
            is_active=excluded.is_active,updated_at=CURRENT_TIMESTAMP
         WHERE name IS NOT excluded.name OR payload IS NOT excluded.payload
            OR is_active IS NOT excluded.is_active",
        params![id, name, snapshot.to_string(), if active { 1 } else { 0 }],
    ).map_err(err)?;

    let portfolios = data.get("portfolios").and_then(Value::as_array).ok_or("Missing portfolios")?;
    if portfolios.is_empty() { return Err("Each project needs a portfolio".into()); }
    for (i, portfolio) in portfolios.iter().enumerate() {
        let pid = identity(portfolio, "id")?;
        if !seen.portfolios.insert(vec![id.to_owned(), pid.to_owned()]) {
            return Err(format!("Duplicate portfolio {pid} in project {id}"));
        }
        let title = portfolio.get("name").and_then(Value::as_str).unwrap_or("Portfolio");
        let mut meta = portfolio.clone();
        if let Some(m) = meta.as_object_mut() { m.remove("pages"); }
        tx.execute(
            "INSERT INTO workspace_portfolios(project_id,id,name,position,payload) VALUES(?1,?2,?3,?4,?5)
             ON CONFLICT(project_id,id) DO UPDATE SET name=excluded.name,
                position=excluded.position,payload=excluded.payload
             WHERE name IS NOT excluded.name OR position IS NOT excluded.position
                OR payload IS NOT excluded.payload",
            params![id, pid, title, i as i64, meta.to_string()],
        ).map_err(err)?;
        let pages = portfolio.get("pages").and_then(Value::as_array).ok_or("Missing portfolio pages")?;
        for (n, page) in pages.iter().enumerate() {
            let page_id = identity(page, "id")?;
            if !seen.pages.insert(vec![id.to_owned(), pid.to_owned(), page_id.to_owned()]) {
                return Err(format!("Duplicate page {page_id} in portfolio {pid}"));
            }
            tx.execute(
                "INSERT INTO workspace_pages(project_id,portfolio_id,id,position,payload)
                 VALUES(?1,?2,?3,?4,?5)
                 ON CONFLICT(project_id,portfolio_id,id) DO UPDATE
                 SET position=excluded.position,payload=excluded.payload,
                     revision=workspace_pages.revision+1
                 WHERE position IS NOT excluded.position OR payload IS NOT excluded.payload",
                params![id, pid, page_id, n as i64, page.to_string()],
            ).map_err(err)?;
            for (field, kind) in [
                ("masterTemplateId", "masterTemplates"),
                ("sectionDesignId", "sectionDesigns"),
                ("templateId", "templates"),
            ] {
                if let Some(template) = page.get(field).and_then(Value::as_str) {
                    if template.is_empty() || template == "none" || template == "master" { continue; }
                    if !seen.templates.contains(&vec![kind.to_owned(), template.to_owned()]) {
                        return Err(format!("Page {page_id} references missing {kind}/{template}"));
                    }
                    tx.execute(
                        "INSERT INTO global_template_dependencies(
                           project_id,portfolio_id,page_id,template_kind,template_id
                         ) VALUES(?1,?2,?3,?4,?5)",
                        params![id, pid, page_id, kind, template],
                    ).map_err(err)?;
                }
            }
        }
    }
    Ok(())
}

pub fn persist_workspace(tx: &Transaction<'_>, workspace: &Value) -> Result<(), String> {
    let mut seen = SeenKeys::default();
    // Only dependency edges must be recreated; all other rows are differential UPSERTs.
    tx.execute("DELETE FROM global_template_dependencies", []).map_err(err)?;
    let global = workspace.get("globalTemplates").filter(|v|v.is_object()).unwrap_or(workspace);
    let context = json!({
        "master": global.get("master").cloned().unwrap_or(Value::Null),
        "sectionTypes": global.get("sectionTypes").cloned().unwrap_or(Value::Null),
        "globalImageAlbums": global.get("globalImageAlbums").cloned().unwrap_or_else(||json!([])),
    });
    tx.execute(
        "INSERT INTO shared_template_context(id,payload) VALUES(1,?1)
         ON CONFLICT(id) DO UPDATE SET payload=excluded.payload
         WHERE payload IS NOT excluded.payload",
        [context.to_string()],
    ).map_err(err)?;
    // Stage style UPSERTs; old IDs survive until their FK-bound design uses
    // have been reconciled below.
    let desired_styles=persist_shared_styles(tx, workspace)?;
    for kind in ["masterTemplates", "sectionDesigns", "templates"] {
        let entries = global.get(kind).and_then(Value::as_array)
            .ok_or_else(||format!("Missing {kind}"))?;
        for (position, item) in entries.iter().enumerate() {
            let id = identity(item, "id")?;
            if !seen.templates.insert(vec![kind.to_owned(), id.to_owned()]) {
                return Err(format!("Duplicate shared template: {kind}/{id}"));
            }
            tx.execute(
                "INSERT INTO shared_templates(kind,id,position,payload) VALUES(?1,?2,?3,?4)
                 ON CONFLICT(kind,id) DO UPDATE SET position=excluded.position,
                    payload=excluded.payload
                 WHERE position IS NOT excluded.position OR payload IS NOT excluded.payload",
                params![kind, id, position as i64, item.to_string()],
            ).map_err(err)?;
        }
    }

    let active_id = workspace.get("activeWorkspaceId").and_then(Value::as_str)
        .unwrap_or("legacy-default");
    let active_name = workspace.get("activeWorkspaceName").and_then(Value::as_str)
        .or_else(||workspace.get("title").and_then(Value::as_str)).unwrap_or("Main Project");
    // Release the previous active unique-index slot before upserting a new active project.
    tx.execute(
        "UPDATE workspace_projects SET is_active=0 WHERE is_active=1 AND id<>?1",
        [active_id],
    ).map_err(err)?;
    persist_project(tx, active_id, active_name, workspace, true, &mut seen)?;
    if let Some(others) = workspace.get("projectWorkspaces").and_then(Value::as_array) {
        for entry in others {
            persist_project(
                tx, identity(entry, "id")?, identity(entry, "name")?,
                entry.get("data").ok_or("Missing inactive project data")?,
                false, &mut seen,
            )?;
        }
    }
    // Delete only removed keys; FK cascades keep children and image owners consistent.
    delete_missing(tx, "workspace_pages", &["project_id", "portfolio_id", "id"], &seen.pages)?;
    delete_missing(tx, "workspace_portfolios", &["project_id", "id"], &seen.portfolios)?;
    delete_missing(tx, "workspace_projects", &["id"], &seen.projects)?;
    delete_missing(tx, "shared_templates", &["kind", "id"], &seen.templates)?;
    // Reconcile legacy JSON-path style refs before scene projections change.
    // N-05 element rows also reference shared_styles; deleting retired style
    // IDs is delayed until scene_store has replaced their old FK children.
    reconcile_style_bindings(tx,desired_styles.as_ref(),true)?;
    Ok(())
}

pub fn finalize_shared_styles(
    tx:&Transaction<'_>,workspace:&Value,
)->Result<(),String>{
    if let Some(styles)=style_catalog(workspace)?{
        let mut wanted=HashSet::new();
        for style in styles {
            wanted.insert(identity(style,"id")?.to_owned());
        }
        delete_obsolete_styles(tx,&wanted)?;
    }
    Ok(())
}
// N-06: scoped dependent indexes for ONE page, without rewriting global
// templates, images, styles, other pages or portfolio metadata.
pub fn persist_page_dependencies(
    tx:&Transaction<'_>,project:&str,portfolio:&str,page_id:&str,page:&Value,
)->Result<(),String>{
    if page.get("id").and_then(Value::as_str)!=Some(page_id) {
        return Err("Page identity mismatch".into());
    }
    tx.execute(
        "DELETE FROM global_template_dependencies
         WHERE project_id=?1 AND portfolio_id=?2 AND page_id=?3",
        params![project,portfolio,page_id],
    ).map_err(err)?;
    for (field,kind) in [
        ("masterTemplateId","masterTemplates"),
        ("sectionDesignId","sectionDesigns"),
        ("templateId","templates"),
    ]{
        if let Some(id)=page.get(field).and_then(Value::as_str){
            if id.is_empty()||id=="none"||id=="master"{continue;}
            let exists:i64=tx.query_row(
                "SELECT EXISTS(SELECT 1 FROM shared_templates WHERE kind=?1 AND id=?2)",
                params![kind,id],|r|r.get(0),
            ).map_err(err)?;
            if exists!=1 {
                return Err(format!("Page {page_id} references missing {kind}/{id}"));
            }
            tx.execute(
                "INSERT INTO global_template_dependencies(
                  project_id,portfolio_id,page_id,template_kind,template_id
                 ) VALUES(?1,?2,?3,?4,?5)",
                params![project,portfolio,page_id,kind,id],
            ).map_err(err)?;
        }
    }
    let mut desired=StyleBindings::new();
    let owner=json!([project,portfolio,page_id]).to_string();
    bindings_for_owner(
        tx,page,"page",&owner,
        &[project.to_owned(),portfolio.to_owned(),page_id.to_owned()],
        &known_style_ids(tx)?,true,&mut desired,
    )?;
    tx.execute(
        "DELETE FROM style_page_element_refs
         WHERE project_id=?1 AND portfolio_id=?2 AND page_id=?3",
        params![project,portfolio,page_id],
    ).map_err(err)?;
    for (key,(element_id,style_id)) in desired {
        tx.execute(
            "INSERT INTO style_page_element_refs(
              project_id,portfolio_id,page_id,element_path,element_id,style_id
             ) VALUES(?1,?2,?3,?4,?5,?6)",
            params![project,portfolio,page_id,&key[3],element_id,style_id],
        ).map_err(err)?;
    }
    Ok(())
}

fn load_pages(db:&Connection,project:&str,portfolio:&str)->Result<Vec<Value>,String>{
    let mut stmt=db.prepare("SELECT payload FROM workspace_pages WHERE project_id=?1 AND portfolio_id=?2 ORDER BY position").map_err(err)?;
    let rows=stmt.query_map(params![project,portfolio],|r|r.get::<_,String>(0)).map_err(err)?;
    let raw=rows.collect::<Result<Vec<_>,_>>().map_err(err)?;
    raw.iter().map(|v|serde_json::from_str(v).map_err(err)).collect()
}
fn load_portfolios(db:&Connection,project:&str)->Result<Vec<Value>,String>{
    let mut stmt=db.prepare("SELECT id,payload FROM workspace_portfolios WHERE project_id=?1 ORDER BY position").map_err(err)?;
    let rows=stmt.query_map([project],|r|Ok((r.get::<_,String>(0)?,r.get::<_,String>(1)?))).map_err(err)?;
    let raw=rows.collect::<Result<Vec<_>,_>>().map_err(err)?;
    let mut result=Vec::new();
    for (id,text) in raw{
        let mut portfolio:Value=serde_json::from_str(&text).map_err(err)?;
        portfolio["pages"]=Value::Array(load_pages(db,project,&id)?);
        result.push(portfolio);
    }
    Ok(result)
}
pub fn load_workspace(db:&Connection)->Result<Option<String>,String>{
    let projects:Vec<(String,String,String,i64)>={
        let mut stmt=db.prepare("SELECT id,name,payload,is_active FROM workspace_projects ORDER BY is_active DESC,id").map_err(err)?;
        let rows=stmt.query_map([],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?))).map_err(err)?;
        rows.collect::<Result<Vec<_>,_>>().map_err(err)?
    };
    if projects.is_empty(){return Ok(None);}
    let context:Option<String>=db.query_row("SELECT payload FROM shared_template_context WHERE id=1",[],|r|r.get(0)).optional().map_err(err)?;
    let mut global:Value=serde_json::from_str(&context.ok_or("Missing shared template context")?).map_err(err)?;
    global["styleLibrary"]=Value::Array(load_shared_styles(db)?);
    for kind in ["masterTemplates","sectionDesigns","templates"]{
        let mut stmt=db.prepare("SELECT payload FROM shared_templates WHERE kind=?1 ORDER BY position").map_err(err)?;
        let rows=stmt.query_map([kind],|r|r.get::<_,String>(0)).map_err(err)?;
        let raw=rows.collect::<Result<Vec<_>,_>>().map_err(err)?;
        global[kind]=Value::Array(raw.iter().map(|v|serde_json::from_str(v).map_err(err)).collect::<Result<Vec<_>,String>>()?);
    }
    let mut active:Option<(String,String,Value)>=None;
    let mut others=Vec::new();
    for (project_id,name,text,is_active) in projects{
        let mut data:Value=serde_json::from_str(&text).map_err(err)?;
        let portfolios=load_portfolios(db,&project_id)?;
        let active_pid=data.get("activePortfolioId").and_then(Value::as_str).unwrap_or("");
        let chosen=portfolios.iter().find(|p|p.get("id").and_then(Value::as_str)==Some(active_pid))
            .or_else(||portfolios.first());
        data["pages"]=chosen.and_then(|p|p.get("pages")).cloned().unwrap_or_else(||json!([]));
        if let Some(p)=chosen {data["activePortfolioId"]=p["id"].clone();}
        data["portfolios"]=Value::Array(portfolios);
        for key in ["master","sectionTypes","masterTemplates","sectionDesigns","templates","styleLibrary","globalImageAlbums"]{
            if let Some(value)=global.get(key){data[key]=value.clone();}
        }
        if is_active==1 && active.is_none(){active=Some((project_id,name,data));}
        else{others.push(json!({"id":project_id,"name":name,"data":data}));}
    }
    let (project_id,name,mut root)=active.ok_or("No active project")?;
    root["activeWorkspaceId"]=Value::String(project_id);
    root["activeWorkspaceName"]=Value::String(name);
    root["globalTemplates"]=global;
    root["projectWorkspaces"]=Value::Array(others);
    serde_json::to_string(&root).map(Some).map_err(err)
}
