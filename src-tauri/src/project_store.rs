//! V78 persistent relational projects/portfolios/pages with a shared template catalog.
//! The previous workspace record remains readable for pre-V78 migrations and backups.
//! Image ownership across projects is implemented separately in TASK-007.
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde_json::{json, Value};

fn err(e: impl std::fmt::Display) -> String { e.to_string() }
fn identity<'a>(value:&'a Value,field:&str)->Result<&'a str,String>{
    let s=value.get(field).and_then(Value::as_str).ok_or_else(||format!("Missing {field}"))?;
    if s.is_empty(){return Err(format!("Empty {field}"));}
    Ok(s)
}
fn persist_project(tx:&Transaction<'_>,id:&str,name:&str,data:&Value,active:bool)->Result<(),String>{
    if id.is_empty()||name.trim().is_empty(){return Err("Invalid project identity".into());}
    let mut snapshot=data.clone();
    if let Some(m)=snapshot.as_object_mut(){
        m.remove("projectWorkspaces");
        m.remove("globalTemplates");
    }
    tx.execute("INSERT INTO workspace_projects(id,name,payload,is_active) VALUES(?1,?2,?3,?4)",
        params![id,name,snapshot.to_string(),if active {1}else{0}]).map_err(err)?;
    let portfolios=data.get("portfolios").and_then(Value::as_array).ok_or("Missing portfolios")?;
    if portfolios.is_empty(){return Err("Each project needs a portfolio".into());}
    for (i,portfolio) in portfolios.iter().enumerate(){
        let pid=identity(portfolio,"id")?;
        let title=portfolio.get("name").and_then(Value::as_str).unwrap_or("Portfolio");
        let mut meta=portfolio.clone();
        if let Some(m)=meta.as_object_mut(){m.remove("pages");}
        tx.execute("INSERT INTO workspace_portfolios(project_id,id,name,position,payload) VALUES(?1,?2,?3,?4,?5)",
            params![id,pid,title,i as i64,meta.to_string()]).map_err(err)?;
        let pages=portfolio.get("pages").and_then(Value::as_array).ok_or("Missing portfolio pages")?;
        for (n,page) in pages.iter().enumerate(){
            let page_id=identity(page,"id")?;
            tx.execute("INSERT INTO workspace_pages(project_id,portfolio_id,id,position,payload) VALUES(?1,?2,?3,?4,?5)",
                params![id,pid,page_id,n as i64,page.to_string()]).map_err(err)?;
            for (field,kind) in [("masterTemplateId","masterTemplates"),("sectionDesignId","sectionDesigns"),("templateId","templates")]{
                if let Some(template)=page.get(field).and_then(Value::as_str){
                    if template.is_empty()||template=="none"{continue;}
                    tx.execute("INSERT OR IGNORE INTO global_template_dependencies(project_id,portfolio_id,page_id,template_kind,template_id) SELECT ?1,?2,?3,?4,?5 WHERE EXISTS(SELECT 1 FROM shared_templates WHERE kind=?4 AND id=?5)",
                        params![id,pid,page_id,kind,template]).map_err(err)?;
                }
            }
        }
    }
    Ok(())
}
pub fn persist_workspace(tx:&Transaction<'_>,workspace:&Value)->Result<(),String>{
    // Rebuild the projection transactionally. Never delete legacy workspace/backups/assets.
    for table in ["global_template_dependencies","workspace_pages","workspace_portfolios","workspace_projects","shared_templates","shared_template_context"]{
        tx.execute(&format!("DELETE FROM {table}"),[]).map_err(err)?;
    }
    let global=workspace.get("globalTemplates").filter(|v|v.is_object()).unwrap_or(workspace);
    let context=json!({"master":global.get("master").cloned().unwrap_or(Value::Null),
                       "sectionTypes":global.get("sectionTypes").cloned().unwrap_or(Value::Null)});
    tx.execute("INSERT INTO shared_template_context(id,payload) VALUES(1,?1)",[context.to_string()]).map_err(err)?;
    for kind in ["masterTemplates","sectionDesigns","templates"]{
        let entries=global.get(kind).and_then(Value::as_array).ok_or_else(||format!("Missing {kind}"))?;
        for (position,item) in entries.iter().enumerate(){
            tx.execute("INSERT INTO shared_templates(kind,id,position,payload) VALUES(?1,?2,?3,?4)",
                params![kind,identity(item,"id")?,position as i64,item.to_string()]).map_err(err)?;
        }
    }
    let active_id=workspace.get("activeWorkspaceId").and_then(Value::as_str).unwrap_or("legacy-default");
    let active_name=workspace.get("activeWorkspaceName").and_then(Value::as_str)
        .or_else(||workspace.get("title").and_then(Value::as_str)).unwrap_or("Main Project");
    persist_project(tx,active_id,active_name,workspace,true)?;
    if let Some(others)=workspace.get("projectWorkspaces").and_then(Value::as_array){
        for entry in others{
            persist_project(tx,identity(entry,"id")?,identity(entry,"name")?,
                entry.get("data").ok_or("Missing inactive project data")?,false)?;
        }
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
        for key in ["master","sectionTypes","masterTemplates","sectionDesigns","templates"]{
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
