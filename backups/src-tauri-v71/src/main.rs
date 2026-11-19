#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use rusqlite::{params, Connection};
use serde_json::Value;
use std::sync::Mutex;
use tauri::{Manager, State};
struct Storage(Mutex<Connection>);
fn error(e: impl std::fmt::Display) -> String { e.to_string() }
#[tauri::command]
fn load_project(db: State<Storage>) -> Result<Option<String>, String> {
    let conn=db.0.lock().map_err(error)?;
    let mut q=conn.prepare("SELECT payload FROM projects WHERE id='workspace'").map_err(error)?;
    let mut rows=q.query([]).map_err(error)?;
    Ok(rows.next().map_err(error)?.map(|r|r.get(0)).transpose().map_err(error)?)
}
#[tauri::command]
fn save_project(db: State<Storage>, payload: String) -> Result<(), String> {
    let v: Value=serde_json::from_str(&payload).map_err(error)?;
    if !v["pages"].is_array() || !v["templates"].is_array() || !v["master"].is_object() { return Err("Invalid project".into()); }
    let mut conn=db.0.lock().map_err(error)?;
    let tx=conn.transaction().map_err(error)?;
    tx.execute("INSERT INTO backups(payload) SELECT payload FROM projects WHERE id='workspace' AND payload<>?1",[&payload]).map_err(error)?;
    tx.execute("INSERT INTO projects(id,payload) VALUES('workspace',?1) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP",[&payload]).map_err(error)?;
    // Searchable relational projection. The complete, lossless JSON stays authoritative.
    for table in ["image_refs","pages","templates","images"] {tx.execute(&format!("DELETE FROM {table} WHERE project_id='workspace'"),[]).map_err(error)?;}
    if let Some(images)=v["imageLibrary"].as_array(){for a in images {tx.execute("INSERT INTO images(project_id,id,payload) VALUES('workspace',?1,?2)",params![a["id"].as_str().ok_or("Image id missing")?,a.to_string()]).map_err(error)?;}}
    for kind in ["masterTemplates","sectionDesigns","templates"] {if let Some(items)=v[kind].as_array(){for a in items {tx.execute("INSERT INTO templates(project_id,kind,id,payload) VALUES('workspace',?1,?2,?3)",params![kind,a["id"].as_str().ok_or("Template id missing")?,a.to_string()]).map_err(error)?; index_refs(&tx,kind,a["id"].as_str().unwrap_or(""),a)?;}}}
    if let Some(portfolios)=v["portfolios"].as_array(){for p in portfolios {if let Some(pages)=p["pages"].as_array(){for a in pages {let owner=p["id"].as_str().unwrap_or("default");let id=a["id"].as_str().ok_or("Page id missing")?;tx.execute("INSERT INTO pages(project_id,portfolio_id,id,payload) VALUES('workspace',?1,?2,?3)",params![owner,id,a.to_string()]).map_err(error)?;index_refs(&tx,"page",&format!("{owner}/{id}"),a)?;}}}}
    tx.execute("DELETE FROM backups WHERE id NOT IN (SELECT id FROM backups ORDER BY id DESC LIMIT 30)",[]).map_err(error)?;
    tx.commit().map_err(error)
}
fn index_refs(tx:&rusqlite::Transaction,kind:&str,owner:&str,v:&Value)->Result<(),String>{
    if let Some(id)=v.get("assetId").and_then(Value::as_str){add_ref(tx,kind,owner,id)?;}
    if let Some(s)=v.get("tilesJson").and_then(Value::as_str){if let Ok(t)=serde_json::from_str::<Value>(s){if let Some(cells)=t["cells"].as_array(){for id in cells.iter().filter_map(Value::as_str){add_ref(tx,kind,owner,id)?;}}}}
    match v {Value::Object(m)=>for a in m.values(){index_refs(tx,kind,owner,a)?},Value::Array(a)=>for x in a{index_refs(tx,kind,owner,x)?},_=>{}} Ok(())
}
fn add_ref(tx:&rusqlite::Transaction,kind:&str,owner:&str,id:&str)->Result<(),String>{
    tx.execute("INSERT OR IGNORE INTO image_refs(project_id,owner_kind,owner_id,image_id) SELECT 'workspace',?1,?2,id FROM images WHERE project_id='workspace' AND id=?3",params![kind,owner,id]).map_err(error)?;Ok(())
}
#[tauri::command]
fn list_backups(db:State<Storage>)->Result<Vec<(i64,String,String)>,String>{
    let conn=db.0.lock().map_err(error)?;
    let mut q=conn.prepare("SELECT id,created_at,payload FROM backups ORDER BY id DESC LIMIT 30").map_err(error)?;
    let rows=q.query_map([],|r|Ok((r.get(0)?,r.get(1)?,r.get(2)?))).map_err(error)?;
    rows.collect::<Result<Vec<_>,_>>().map_err(error)
}
fn main(){
    tauri::Builder::default().setup(|app|{
        let dir=app.path().app_local_data_dir()?.join("storage");std::fs::create_dir_all(&dir)?;
        let mut conn=Connection::open(dir.join("portfolio.sqlite3"))?;
        conn.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;")?;
        let tx=conn.transaction()?;
        tx.execute_batch(include_str!("../migrations/001.sql"))?;tx.commit()?;
        app.manage(Storage(Mutex::new(conn)));Ok(())
    }).invoke_handler(tauri::generate_handler![load_project,save_project,list_backups])
    .run(tauri::generate_context!()).expect("Failed to start NSP Portfolio Builder");
}
