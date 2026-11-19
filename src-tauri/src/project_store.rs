//! V78 persistent relational projects/portfolios/pages with a shared template catalog.
//! The previous workspace record remains readable for pre-V78 migrations and backups.
//! Image ownership across projects is implemented separately in TASK-007.
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde_json::{json, Value};
use std::collections::HashSet;

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
fn persist_shared_styles(tx:&Transaction<'_>,workspace:&Value)->Result<(),String>{
    // Old workspaces without styles must not clear an existing central catalog.
    // A provided empty list deliberately clears the central catalog.
    let Some(styles)=style_catalog(workspace)? else {return Ok(());};
    let mut ids=HashSet::new();
    let mut names=HashSet::new();
    for style in styles {
        let id=identity(style,"id")?;
        let name=identity(style,"name")?.trim();
        if name.is_empty()||name.chars().count()>80{return Err("Invalid central style name".into());}
        if !ids.insert(id.to_owned())||!names.insert(name.to_lowercase()){
            return Err(format!("Duplicate central style identity or name: {name}"));
        }
        if !style.is_object(){return Err("Invalid central style record".into());}
    }
    // These operations run inside the same transaction as all portfolio writes;
    // failure rolls back both the catalogue and the rest of the workspace.
    tx.execute("DELETE FROM shared_styles",[]).map_err(err)?;
    for (index,style) in styles.iter().enumerate(){
        tx.execute("INSERT INTO shared_styles(id,name,position,payload) VALUES(?1,?2,?3,?4)",
            params![identity(style,"id")?,identity(style,"name")?.trim(),index as i64,style.to_string()]).map_err(err)?;
    }
    Ok(())
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
        for key in ["projectWorkspaces", "globalTemplates", "styleLibrary", "portfolios", "pages"] {
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
                 SET position=excluded.position,payload=excluded.payload
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
    });
    tx.execute(
        "INSERT INTO shared_template_context(id,payload) VALUES(1,?1)
         ON CONFLICT(id) DO UPDATE SET payload=excluded.payload
         WHERE payload IS NOT excluded.payload",
        [context.to_string()],
    ).map_err(err)?;
    persist_shared_styles(tx, workspace)?;
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
        for key in ["master","sectionTypes","masterTemplates","sectionDesigns","templates","styleLibrary"]{
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
