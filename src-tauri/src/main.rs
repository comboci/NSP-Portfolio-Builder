#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde_json::{json, Value};
use std::{path::PathBuf, sync::Mutex};
use tauri::{Manager, State};

mod media_store;
mod project_store;
mod image_ownership;
mod scene_store;
mod backup_store;
struct AssetRoot(PathBuf);
struct Storage(Mutex<Connection>);
fn error(e: impl std::fmt::Display) -> String { e.to_string() }

#[tauri::command]
fn load_project(db: State<'_, Storage>, root: State<'_, AssetRoot>) -> Result<Option<String>, String> {
    let conn = db.0.lock().map_err(error)?;
    let saved: Option<String> = if let Some(payload)=project_store::load_workspace(&conn)? {
        Some(payload)
    } else {
        conn.query_row("SELECT payload FROM projects WHERE id='workspace'",[],|r|r.get(0)).optional().map_err(error)?
    };
    saved.map(|raw| {
        let mut workspace: Value = serde_json::from_str(&raw).map_err(error)?;
        workspace["globalImageLibrary"] =
            Value::Array(image_ownership::read_public_catalog(&conn)?);
        media_store::hydrate_payload(&conn, &root.0, &workspace.to_string())
    }).transpose()
}


// N-06: load both payload and its workspace revision under one SQLite lock.
// The previous load_project endpoint stays available for compatibility.
#[tauri::command]
fn load_project_state(
    db: State<'_, Storage>, root: State<'_, AssetRoot>,
) -> Result<Value, String> {
    let mut conn=db.0.lock().map_err(error)?;
    let tx=conn.transaction().map_err(error)?;
    let current:i64=tx.query_row(
        "SELECT revision FROM workspace_write_revision WHERE id=1",
        [],|r|r.get(0),
    ).map_err(error)?;
    let raw=match project_store::load_workspace(&tx)? {
        Some(payload)=>Some(payload),
        None=>tx.query_row(
            "SELECT payload FROM projects WHERE id='workspace'",
            [],|r|r.get::<_,String>(0),
        ).optional().map_err(error)?,
    };
    let payload=match raw {
        Some(raw)=>{
            let mut value:Value=serde_json::from_str(&raw).map_err(error)?;
            value["globalImageLibrary"]=
                Value::Array(image_ownership::read_public_catalog(&tx)?);
            Some(media_store::hydrate_payload(&tx,&root.0,&value.to_string())?)
        }
        None=>None,
    };
    tx.commit().map_err(error)?;
    Ok(json!({"payload":payload,"revision":current}))
}

fn require_workspace_revision(
    tx:&Transaction<'_>,expected:i64,
)->Result<(),String>{
    let stored:i64=tx.query_row(
        "SELECT revision FROM workspace_write_revision WHERE id=1",
        [],|r|r.get(0),
    ).map_err(error)?;
    if expected!=stored {
        return Err(format!(
            "WRITE_CONFLICT: workspace revision is {stored}, expected {expected}; reload before saving"
        ));
    }
    Ok(())
}
fn advance_workspace_revision(
    tx:&Transaction<'_>,expected:i64,
)->Result<i64,String>{
    let updated=tx.execute(
        "UPDATE workspace_write_revision
         SET revision=revision+1,updated_at=CURRENT_TIMESTAMP
         WHERE id=1 AND revision=?1",
        [expected],
    ).map_err(error)?;
    if updated!=1{
        return Err("WRITE_CONFLICT: workspace changed during save".into());
    }
    Ok(expected+1)
}

/* V110 TASK-027: only metadata changes; publication, identity and immutable
   original bytes are never revoked or replaced by this command. */
#[tauri::command]
fn rename_public_image(
    db: State<'_, Storage>, id: String, name: String,
) -> Result<(), String> {
    let mut conn = db.0.lock().map_err(error)?;
    image_ownership::rename_public_metadata(&mut conn, &id, &name)
}

#[tauri::command]
fn save_project(
    db: State<'_, Storage>, root: State<'_, AssetRoot>,
    payload: String, expected_revision:i64,
) -> Result<i64, String> {
    let value: Value = serde_json::from_str(&payload).map_err(error)?;
    if !value["pages"].is_array() || !value["templates"].is_array() || !value["master"].is_object() {
        return Err("Invalid project".into());
    }
    let mut conn = db.0.lock().map_err(error)?;
    let tx = conn.transaction().map_err(error)?;
    require_workspace_revision(&tx,expected_revision)?;
    let mut compact = value;
    // Persist immutable originals first, then commit ONLY references in all SQLite JSON rows.
    media_store::compact_value(&tx, &root.0, &mut compact)?;
    let compact_payload = serde_json::to_string(&compact).map_err(error)?;
    // Only a newly retained previous revision needs asset-reference indexing.
    // Named and older automatic backups are never rescanned on an ordinary save.
    // The relational workspace is canonical after an isolated Save Page.
    // Never take a historical snapshot from stale legacy projects.payload.
    let previous:Option<String>=match project_store::load_workspace(&tx)? {
        Some(raw)=>{
            let mut value:Value=serde_json::from_str(&raw).map_err(error)?;
            value["globalImageLibrary"]=
                Value::Array(image_ownership::read_public_catalog(&tx)?);
            Some(value.to_string())
        }
        None=>tx.query_row(
            "SELECT payload FROM projects WHERE id='workspace'",
            [],|r|r.get::<_,String>(0),
        ).optional().map_err(error)?,
    };
    if let Some(prior)=previous.filter(|p|p!=&compact_payload) {
        tx.execute("INSERT INTO backups(payload) VALUES(?1)",[&prior]).map_err(error)?;
        let backup_id=tx.last_insert_rowid();
        let prior_value:Value=serde_json::from_str(&prior).map_err(error)?;
        image_ownership::index_backup_refs(&tx,"automatic",backup_id,&prior_value)?;
    }
    tx.execute(
        "INSERT INTO projects(id,payload) VALUES('workspace',?1) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=CURRENT_TIMESTAMP",
        [&compact_payload],
    ).map_err(error)?;

    // The relational projection is rebuilt in one SQL transaction; the lossless compact JSON
    // remains authoritative for forward-compatible optional fields.
    for table in ["image_files", "image_refs", "scene_links", "scene_entities", "pages", "templates", "images"] {
        tx.execute(&format!("DELETE FROM {table} WHERE project_id='workspace'"), []).map_err(error)?;
    }
    if let Some(images) = compact["imageLibrary"].as_array() {
        for image in images {
            tx.execute(
                "INSERT INTO images(project_id,id,payload) VALUES('workspace',?1,?2)",
                params![image["id"].as_str().ok_or("Image id missing")?, image.to_string()],
            ).map_err(error)?;
        }
    }
    for kind in ["masterTemplates", "sectionDesigns", "templates"] {
        if let Some(items) = compact[kind].as_array() {
            for item in items {
                let id = item["id"].as_str().ok_or("Template id missing")?;
                tx.execute(
                    "INSERT INTO templates(project_id,kind,id,payload) VALUES('workspace',?1,?2,?3)",
                    params![kind, id, item.to_string()],
                ).map_err(error)?;
                index_refs(&tx, kind, id, item)?;
            }
        }
    }
    if let Some(portfolios) = compact["portfolios"].as_array() {
        for portfolio in portfolios {
            if let Some(pages) = portfolio["pages"].as_array() {
                for page in pages {
                    let owner = portfolio["id"].as_str().unwrap_or("default");
                    let id = page["id"].as_str().ok_or("Page id missing")?;
                    tx.execute(
                        "INSERT INTO pages(project_id,portfolio_id,id,payload) VALUES('workspace',?1,?2,?3)",
                        params![owner, id, page.to_string()],
                    ).map_err(error)?;
                    index_refs(&tx, "page", &format!("{owner}/{id}"), page)?;
                }
            }
        }
    }
    media_store::persist_image_links(&tx, &compact)?;
    media_store::project_links(&tx, &compact)?;
    project_store::persist_workspace(&tx, &compact)?;
    image_ownership::persist_ownership(&tx, &compact)?;
    // JSON payloads are the only editable source; scene rows are derived
    // and are refreshed after their page/template/media FK parents exist.
    scene_store::persist_scene_projections(&tx)?;
    // Delay retired style deletion until old scene element FKs are gone.
    project_store::finalize_shared_styles(&tx, &compact)?;
    // N-07: no implicit automatic-backup deletion before owner-verified recovery.
    // Any future approved retention remains inside this same SQLite transaction.
    backup_store::apply_automatic_retention(&tx)?;
    let next_revision=advance_workspace_revision(&tx,expected_revision)?;
    tx.commit().map_err(error)?;
    Ok(next_revision)
}

// N-06 / DEC-009: Save Page does not persist project metadata, another page,
// shared templates or global media catalogs. All scoped dependent indexes are
// committed together. Optimistic workspace revision prevents lost updates.
#[tauri::command]
fn save_page(
    db:State<'_, Storage>,root:State<'_, AssetRoot>,
    project_id:String,portfolio_id:String,page_id:String,
    payload:String,expected_revision:i64,
)->Result<i64,String>{
    if project_id.is_empty()||portfolio_id.is_empty()||page_id.is_empty(){
        return Err("Invalid page scope".into());
    }
    let value:Value=serde_json::from_str(&payload).map_err(error)?;
    if !value.is_object()||value.get("id").and_then(Value::as_str)!=Some(page_id.as_str()){
        return Err("Page payload identity mismatch".into());
    }
    if !value.get("visualObjects").is_some_and(Value::is_array)
        || value.get("templateId").and_then(Value::as_str).is_none()
        || value.get("title").and_then(Value::as_str).is_none()
        || value.get("layers").is_some_and(|v|!v.is_array())
    {
        return Err("Save Page requires a normalized page; draft preserved".into());
    }
    let mut conn=db.0.lock().map_err(error)?;
    let tx=conn.transaction().map_err(error)?;
    require_workspace_revision(&tx,expected_revision)?;
    let active:i64=tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM workspace_projects
          WHERE id=?1 AND is_active=1)",
        [&project_id],|r|r.get(0),
    ).map_err(error)?;
    if active!=1{return Err("Save Page requires the active project".into());}
    let present:i64=tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM workspace_pages
         WHERE project_id=?1 AND portfolio_id=?2 AND id=?3)",
        params![&project_id,&portfolio_id,&page_id],|r|r.get(0),
    ).map_err(error)?;
    if present!=1{
        return Err("Page is not persisted; use Save Project to add it first".into());
    }

    let mut page=value;
    media_store::compact_value(&tx,&root.0,&mut page)?;
    let compact=page.to_string();
    let count=tx.execute(
        "UPDATE workspace_pages SET payload=?4,revision=revision+1
         WHERE project_id=?1 AND portfolio_id=?2 AND id=?3",
        params![&project_id,&portfolio_id,&page_id,&compact],
    ).map_err(error)?;
    if count!=1{return Err("Page disappeared while saving".into());}

    // Keep only this page's legacy compatibility projection in sync; the
    // canonical relational parent is still workspace_pages.payload.
    tx.execute(
        "INSERT INTO pages(project_id,portfolio_id,id,payload)
         VALUES('workspace',?1,?2,?3)
         ON CONFLICT(project_id,portfolio_id,id) DO UPDATE
         SET payload=excluded.payload
         WHERE payload IS NOT excluded.payload",
        params![&portfolio_id,&page_id,&compact],
    ).map_err(error)?;
    let owner=format!("{portfolio_id}/{page_id}");
    tx.execute(
        "DELETE FROM image_refs WHERE project_id='workspace'
          AND owner_kind='page' AND owner_id=?1",
        [&owner],
    ).map_err(error)?;
    index_refs(&tx,"page",&owner,&page)?;

    project_store::persist_page_dependencies(
        &tx,&project_id,&portfolio_id,&page_id,&page,
    )?;
    image_ownership::persist_page_usage(
        &tx,&project_id,&portfolio_id,&page_id,&page,
    )?;
    // Save Page only updates its own derived scene and FK child rows.
    scene_store::persist_page_scene_projection(
        &tx,&project_id,&portfolio_id,&page_id
    )?;
    let next=advance_workspace_revision(&tx,expected_revision)?;
    tx.commit().map_err(error)?;
    Ok(next)
}

fn index_refs(tx: &Transaction<'_>, kind: &str, owner: &str, v: &Value) -> Result<(), String> {
    if let Some(id) = v.get("assetId").and_then(Value::as_str) { add_ref(tx, kind, owner, id)?; }
    if let Some(s) = v.get("tilesJson").and_then(Value::as_str) {
        if let Ok(tiles) = serde_json::from_str::<Value>(s) {
            let mut cells: Vec<&Value> = Vec::new();
            if let Some(items) = tiles["cells"].as_array() { cells.extend(items.iter()); }
            if let Some(items) = tiles["stash"].as_object() { cells.extend(items.values()); }
            for cell in cells {
                if let Some(id) = cell.as_str().or_else(|| cell.get("assetId").and_then(Value::as_str)) {
                    add_ref(tx, kind, owner, id)?;
                }
            }
        }
    }
    match v {
        Value::Object(map) => for child in map.values() { index_refs(tx, kind, owner, child)?; },
        Value::Array(items) => for child in items { index_refs(tx, kind, owner, child)?; },
        _ => {}
    }
    Ok(())
}
fn add_ref(tx: &Transaction<'_>, kind: &str, owner: &str, id: &str) -> Result<(), String> {
    tx.execute(
        "INSERT OR IGNORE INTO image_refs(project_id,owner_kind,owner_id,image_id) SELECT 'workspace',?1,?2,id FROM images WHERE project_id='workspace' AND id=?3",
        params![kind, owner, id],
    ).map_err(error)?;
    Ok(())
}

// A light list avoids hydrating all 30 historical revisions into Base64 at once.
#[tauri::command]
fn list_backups(db: State<'_, Storage>, before_id: Option<i64>) -> Result<Vec<(i64, String)>, String> {
    let conn = db.0.lock().map_err(error)?;
    // Every retained snapshot stays reachable; paginate rather than silently
    // hiding older entries when automatic pruning is disabled.
    let before=before_id.filter(|id|*id>0).unwrap_or(i64::MAX);
    let mut query=conn.prepare(
        "SELECT id,created_at FROM backups WHERE id<?1 ORDER BY id DESC LIMIT 30"
    ).map_err(error)?;
    let rows=query.query_map([before], |r| Ok((r.get(0)?, r.get(1)?))).map_err(error)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(error)
}

#[tauri::command]
fn backup_retention_status(db:State<'_,Storage>)->Result<Value,String>{
    let conn=db.0.lock().map_err(error)?;
    backup_store::retention_status(&conn)
}

#[tauri::command]
fn inspect_backup(
    db:State<'_,Storage>,root:State<'_,AssetRoot>,kind:String,id:i64,
)->Result<Value,String>{
    let conn=db.0.lock().map_err(error)?;
    backup_store::inspect_backup(&conn,&root.0,&kind,id)
}

#[tauri::command]
fn read_backup(db: State<'_, Storage>, root: State<'_, AssetRoot>, id: i64) -> Result<String, String> {
    let conn = db.0.lock().map_err(error)?;
    let payload: String = conn.query_row("SELECT payload FROM backups WHERE id=?1", [id], |r| r.get(0)).map_err(error)?;
    media_store::hydrate_payload(&conn, &root.0, &payload)
}

#[tauri::command]
fn create_backup(
    db: State<'_, Storage>, root: State<'_, AssetRoot>, name: String, payload: Option<String>,
) -> Result<i64, String> {
    if name.trim().is_empty() || name.len() > 300 { return Err("Invalid backup name".into()); }
    let mut conn = db.0.lock().map_err(error)?;
    let tx = conn.transaction().map_err(error)?;
    let compact = if let Some(payload) = payload {
        let mut value: Value = serde_json::from_str(&payload).map_err(error)?;
        if !value["pages"].is_array() || !value["templates"].is_array() {
            return Err("Invalid backup".into());
        }
        media_store::compact_value(&tx, &root.0, &mut value)?;
        value.to_string()
    } else {
        match project_store::load_workspace(&tx)? {
            Some(raw)=>{
                let mut value:Value=serde_json::from_str(&raw).map_err(error)?;
                value["globalImageLibrary"]=
                    Value::Array(image_ownership::read_public_catalog(&tx)?);
                value.to_string()
            }
            None=>tx.query_row(
                "SELECT payload FROM projects WHERE id='workspace'",
                [],|r|r.get::<_,String>(0),
            ).optional().map_err(error)?.ok_or("Save the project first")?,
        }
    };
    // Do not claim a durable named recovery point if any referenced asset is
    // unreadable or has the wrong content hash. Failure rolls back metadata.
    media_store::verify_snapshot_integrity(&tx,&root.0,&compact)?;
    let value: Value = serde_json::from_str(&compact).map_err(error)?;
    tx.execute(
        "INSERT INTO named_backups(name,payload) VALUES(?1,?2)",
        params![name.trim(), compact],
    ).map_err(error)?;
    let id = tx.last_insert_rowid();
    // Keep the backup and its asset-reference index in the SAME commit.
    image_ownership::index_backup_refs(&tx, "named", id, &value)?;
    tx.commit().map_err(error)?;
    Ok(id)
}

#[tauri::command]
fn list_named_backups(db: State<'_, Storage>) -> Result<Vec<(i64, String, String)>, String> {
    let conn = db.0.lock().map_err(error)?;
    let mut query = conn.prepare("SELECT id,name,created_at FROM named_backups ORDER BY id DESC").map_err(error)?;
    let rows = query.query_map([], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?))).map_err(error)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(error)
}

#[tauri::command]
fn read_named_backup(db: State<'_, Storage>, root: State<'_, AssetRoot>, id: i64) -> Result<String, String> {
    let conn = db.0.lock().map_err(error)?;
    let payload: String = conn.query_row("SELECT payload FROM named_backups WHERE id=?1", [id], |r| r.get(0)).map_err(error)?;
    media_store::hydrate_payload(&conn, &root.0, &payload)
}

// In-place V74 migration. Each previous payload, including named and
// automatic backups, is rewritten in the SAME SQLite transaction as PRAGMA user_version=3.
// Binary files are immutable and remain on disk. On any failure the database rolls back.
fn migrate_payload_table(
    tx: &Transaction<'_>, root: &std::path::Path, table: &str,
) -> Result<(), String> {
    // Stream one legacy snapshot at a time: avoid collecting up to 30 Base64-heavy backups.
    let ids: Vec<i64> = {
        let mut stmt = tx.prepare(&format!("SELECT rowid FROM {table} ORDER BY rowid")).map_err(error)?;
        let rows = stmt.query_map([], |r| r.get(0)).map_err(error)?;
        let result = rows.collect::<Result<Vec<_>, _>>().map_err(error)?;
        result
    };
    for id in ids {
        let json: String = tx.query_row(&format!("SELECT payload FROM {table} WHERE rowid=?1"), [id], |r| r.get(0)).map_err(error)?;
        let mut value: Value = serde_json::from_str(&json).map_err(error)?;
        media_store::compact_value(tx, root, &mut value)?;
        let compact = serde_json::to_string(&value).map_err(error)?;
        if compact != json {
            tx.execute(&format!("UPDATE {table} SET payload=?1 WHERE rowid=?2"), params![compact, id]).map_err(error)?;
        }
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let root = app.path().app_local_data_dir()?.join("storage");
            std::fs::create_dir_all(root.join("assets"))?;
            let mut conn = Connection::open(root.join("portfolio.sqlite3"))?;
            conn.execute_batch("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;")?;
            let tx = conn.transaction()?;
            let version: i64 = tx.query_row("PRAGMA user_version", [], |r| r.get(0))?;
            if version > 12 { return Err("Database schema is newer than this application".into()); }
            if version < 1 { tx.execute_batch(include_str!("../migrations/001.sql"))?; }
            if version < 2 { tx.execute_batch(include_str!("../migrations/002.sql"))?; }
            if version < 3 {
                for table in ["projects", "images", "backups", "named_backups", "pages", "templates"] {
                    migrate_payload_table(&tx, &root, table).map_err(|e| std::io::Error::other(e))?;
                }
                tx.execute_batch(include_str!("../migrations/003.sql"))?;
            }
            if version < 4 { tx.execute_batch(include_str!("../migrations/004.sql"))?; }
            if version < 5 { tx.execute_batch(include_str!("../migrations/005.sql"))?; }
            if version < 6 {
                tx.execute_batch(include_str!("../migrations/006.sql"))?;
                project_store::migrate_style_library(&tx)
                    .map_err(|e| std::io::Error::other(e))?;
            }
            if version < 7 { tx.execute_batch(include_str!("../migrations/007.sql"))?; }
            if version < 8 { tx.execute_batch(include_str!("../migrations/008.sql"))?; }
            if version < 9 {
                tx.execute_batch(include_str!("../migrations/009.sql"))?;
                project_store::backfill_style_bindings(&tx)
                    .map_err(|e|std::io::Error::other(e))?;
            }
            if version < 10 {
                tx.execute_batch(include_str!("../migrations/010.sql"))?;
                scene_store::backfill_scene_projections(&tx)
                    .map_err(|e|std::io::Error::other(e))?;
            }
            if version < 11 {
                tx.execute_batch(include_str!("../migrations/011.sql"))?;
            }
            if version < 12 {
                tx.execute_batch(include_str!("../migrations/012.sql"))?;
            }
            tx.commit()?;
            app.manage(AssetRoot(root));
            app.manage(Storage(Mutex::new(conn)));
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_project, load_project_state, save_project, save_page, rename_public_image, list_backups, read_backup, create_backup, list_named_backups, read_named_backup, backup_retention_status, inspect_backup,
        ])
        .run(tauri::generate_context!())
        .expect("Failed to start NSP Portfolio Builder");
}
