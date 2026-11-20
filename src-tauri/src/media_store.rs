use base64::{engine::general_purpose::STANDARD, Engine};
use rusqlite::{params, Connection, OptionalExtension, Transaction};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{collections::{HashMap, HashSet}, fs, io::Write, path::Path};

const REF_PREFIX: &str = "nsp-asset-v74:";
fn error(e: impl std::fmt::Display) -> String { e.to_string() }

fn extension(mime: &str) -> Option<&'static str> {
    match mime {
        "image/png" => Some("png"),
        "image/jpeg" => Some("jpg"),
        "image/webp" => Some("webp"),
        "image/gif" => Some("gif"),
        _ => None,
    }
}

fn signature_ok(mime: &str, bytes: &[u8]) -> bool {
    match mime {
        "image/png" => bytes.starts_with(b"\x89PNG\r\n\x1a\n"),
        "image/jpeg" => bytes.starts_with(&[0xff, 0xd8, 0xff]),
        "image/webp" => bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP".as_slice()),
        "image/gif" => bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a"),
        _ => false,
    }
}

pub fn store_file(tx: &Transaction<'_>, root: &Path, source: &str) -> Result<String, String> {
    let (header, encoded) = source.split_once(',').ok_or("Invalid image data URL")?;
    let mime = header.to_ascii_lowercase()
        .strip_prefix("data:").and_then(|x| x.strip_suffix(";base64"))
        .ok_or("Invalid image data URL")?.to_owned();
    let ext = extension(&mime).ok_or("Unsupported image type")?;
    let bytes = STANDARD.decode(encoded).map_err(error)?;
    if !signature_ok(&mime, &bytes) { return Err("Image signature does not match MIME type".into()); }
    let hash = format!("{:x}", Sha256::digest(&bytes));
    let relative = format!("assets/{hash}.{ext}");
    let path = root.join(&relative);
    // Files are content-addressed and immutable. Never trust a path from the frontend.
    if path.exists() {
        if fs::read(&path).map_err(error)? != bytes { return Err("Asset integrity mismatch".into()); }
    } else {
        let tmp = root.join(format!("assets/{hash}.pending"));
        let mut f = fs::File::create(&tmp).map_err(error)?;
        f.write_all(&bytes).map_err(error)?;
        f.sync_all().map_err(error)?;
        drop(f);
        fs::rename(&tmp, &path).map_err(error)?;
    }
    tx.execute(
        "INSERT OR IGNORE INTO asset_files(hash,mime,relative_path,byte_length) VALUES (?1,?2,?3,?4)",
        params![hash, mime, relative, bytes.len() as i64],
    ).map_err(error)?;
    Ok(hash)
}

fn validate_hash(s: &str) -> Result<&str, String> {
    if s.len() != 64 || !s.bytes().all(|b| b.is_ascii_hexdigit() && !b.is_ascii_uppercase()) {
        return Err("Invalid asset reference".into());
    }
    Ok(s)
}

// Replace base64 image bodies ANYWHERE in the project/backup JSON with immutable references.
// This also covers legacy inline images and avoids silently losing unknown fields.
pub fn compact_value(tx: &Transaction<'_>, root: &Path, value: &mut Value) -> Result<(), String> {
    match value {
        Value::String(s) => {
            if s.len() >= 20 && s.get(..11).is_some_and(|p| p.eq_ignore_ascii_case("data:image/")) {
                let hash = store_file(tx, root, s)?;
                *s = format!("{REF_PREFIX}{hash}");
            } else if let Some(hash) = s.strip_prefix(REF_PREFIX) {
                validate_hash(hash)?;
                let exists: i64 = tx.query_row(
                    "SELECT EXISTS(SELECT 1 FROM asset_files WHERE hash=?1)", [hash], |r| r.get(0),
                ).map_err(error)?;
                if exists != 1 { return Err("Unknown local image asset".into()); }
            }
        }
        Value::Array(items) => for item in items { compact_value(tx, root, item)?; },
        Value::Object(props) => for (name, item) in props.iter_mut() {
            if name == "tilesJson" {
                if let Value::String(raw) = item {
                    if raw.contains("data:image/") || raw.contains(REF_PREFIX) {
                        let mut nested: Value = serde_json::from_str(raw).map_err(error)?;
                        compact_value(tx, root, &mut nested)?;
                        *raw = serde_json::to_string(&nested).map_err(error)?;
                    }
                    continue;
                }
            }
            compact_value(tx, root, item)?;
        },
        _ => {}
    }
    Ok(())
}

fn fetch_image(
    db: &Connection, root: &Path, hash: &str, cache: &mut HashMap<String, String>,
) -> Result<String, String> {
    validate_hash(hash)?;
    if let Some(data) = cache.get(hash) { return Ok(data.clone()); }
    let record: Option<(String, String, i64)> = db.query_row(
        "SELECT mime,relative_path,byte_length FROM asset_files WHERE hash=?1",
        [hash], |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    ).optional().map_err(error)?;
    let (mime, path, length) = record.ok_or("Image asset metadata missing; restore requires an intact asset folder")?;
    let ext = extension(&mime).ok_or("Unsupported stored image MIME")?;
    if path != format!("assets/{hash}.{ext}") { return Err("Unsafe asset path in database".into()); }
    let bytes = fs::read(root.join(path)).map_err(error)?;
    if length < 0 || bytes.len() as i64 != length || !signature_ok(&mime, &bytes)
        || format!("{:x}", Sha256::digest(&bytes)) != hash {
        return Err("Image file missing, modified or corrupt".into());
    }
    let data = format!("data:{mime};base64,{}", STANDARD.encode(&bytes));
    cache.insert(hash.to_string(), data.clone());
    Ok(data)
}

fn hydrate_value_inner(
    db: &Connection, root: &Path, value: &mut Value,
    cache: &mut HashMap<String, String>,
) -> Result<(), String> {
    match value {
        Value::String(s) => if let Some(hash) = s.strip_prefix(REF_PREFIX) {
            let data = fetch_image(db, root, hash, cache)?;
            *s = data;
        },
        Value::Array(items) => for item in items { hydrate_value_inner(db, root, item, cache)?; },
        Value::Object(props) => for (name, item) in props.iter_mut() {
            if name == "tilesJson" {
                if let Value::String(raw) = item {
                    if raw.contains(REF_PREFIX) {
                        let mut nested: Value = serde_json::from_str(raw).map_err(error)?;
                        hydrate_value_inner(db, root, &mut nested, cache)?;
                        *raw = serde_json::to_string(&nested).map_err(error)?;
                    }
                    continue;
                }
            }
            hydrate_value_inner(db, root, item, cache)?;
        },
        _ => {}
    }
    Ok(())
}

// The frontend still receives the compatible V72 JSON shape for editing and portable exports.
// Base64 is reconstructed only on load/restore, not persisted in internal SQLite snapshots.
pub fn hydrate_payload(db: &Connection, root: &Path, payload: &str) -> Result<String, String> {
    let mut value: Value = serde_json::from_str(payload).map_err(error)?;
    hydrate_value_inner(db, root, &mut value, &mut HashMap::new())?;
    serde_json::to_string(&value).map_err(error)
}

// N-07: preflight a compact backup without modifying projects, image owners,
// backup rows or the asset directory. Legacy inline Base64 remains self-contained.
fn collect_snapshot_hashes(value:&Value, hashes:&mut HashSet<String>)->Result<(),String>{
    match value {
        Value::String(s)=>{
            if let Some(hash)=s.strip_prefix(REF_PREFIX){
                validate_hash(hash)?;
                hashes.insert(hash.to_owned());
            }
        },
        Value::Array(items)=>for item in items{
            collect_snapshot_hashes(item,hashes)?;
        },
        Value::Object(props)=>for (name,item) in props {
            if name=="tilesJson" {
                if let Some(raw)=item.as_str(){
                    if raw.contains(REF_PREFIX){
                        let nested:Value=serde_json::from_str(raw).map_err(error)?;
                        collect_snapshot_hashes(&nested,hashes)?;
                        continue;
                    }
                }
            }
            collect_snapshot_hashes(item,hashes)?;
        },
        _=>{}
    }
    Ok(())
}

pub fn verify_snapshot_integrity(
    db:&Connection, root:&Path, payload:&str,
)->Result<HashSet<String>,String>{
    let snapshot:Value=serde_json::from_str(payload).map_err(error)?;
    let mut hashes=HashSet::new();
    collect_snapshot_hashes(&snapshot,&mut hashes)?;
    for hash in &hashes {
        // Reuse the restore path's validated hash, MIME, length and safe-path checks.
        // Limit Base64 working memory to one referenced asset at a time.
        let mut one_asset=HashMap::new();
        let _=fetch_image(db,root,hash,&mut one_asset)?;
    }
    Ok(hashes)
}

pub fn persist_image_links(tx: &Transaction<'_>, value: &Value) -> Result<(), String> {
    if let Some(images) = value["imageLibrary"].as_array() {
        for image in images {
            let id = image["id"].as_str().ok_or("Missing image ID")?;
            let original = image["src"].as_str().and_then(|s| s.strip_prefix(REF_PREFIX))
                .ok_or("Missing persisted original image")?;
            validate_hash(original)?;
            let thumb = image["thumbnail"].as_str()
                .and_then(|s| s.strip_prefix(REF_PREFIX));
            if let Some(hash) = thumb { validate_hash(hash)?; }
            tx.execute(
                "INSERT INTO image_files(project_id,image_id,original_hash,thumbnail_hash) VALUES('workspace',?1,?2,?3)",
                params![id, original, thumb],
            ).map_err(error)?;
        }
    }
    Ok(())
}

fn entity(tx: &Transaction<'_>, kind: &str, id: &str) -> Result<(), String> {
    tx.execute("INSERT OR IGNORE INTO scene_entities VALUES('workspace',?1,?2)", params![kind, id])
        .map_err(error)?;
    Ok(())
}
fn link(tx: &Transaction<'_>, fk: &str, fi: &str, rel: &str, tk: &str, ti: &str) -> Result<(), String> {
    if ti.is_empty() || ti == "none" || ti == "master" { return Ok(()); }
    tx.execute(
        "INSERT OR IGNORE INTO scene_links SELECT 'workspace',?1,?2,?3,?4,?5 WHERE EXISTS(SELECT 1 FROM scene_entities WHERE project_id='workspace' AND kind=?4 AND id=?5)",
        params![fk, fi, rel, tk, ti],
    ).map_err(error)?;
    Ok(())
}

pub fn project_links(tx: &Transaction<'_>, v: &Value) -> Result<(), String> {
    for kind in ["masterTemplates", "sectionDesigns", "templates"] {
        if let Some(items) = v[kind].as_array() {
            for a in items { entity(tx, kind, a["id"].as_str().ok_or("Missing template ID")?)?; }
        }
    }
    if let Some(portfolios) = v["portfolios"].as_array() {
        for p in portfolios {
            let pid = p["id"].as_str().ok_or("Missing portfolio ID")?;
            entity(tx, "portfolio", pid)?;
            if let Some(pages) = p["pages"].as_array() {
                for page in pages {
                    let id = format!("{pid}/{}", page["id"].as_str().ok_or("Missing page ID")?);
                    entity(tx, "page", &id)?;
                    link(tx, "page", &id, "portfolio", "portfolio", pid)?;
                    for (field, target) in [
                        ("masterTemplateId", "masterTemplates"),
                        ("sectionDesignId", "sectionDesigns"),
                        ("templateId", "templates"),
                    ] {
                        if let Some(to) = page[field].as_str() {
                            link(tx, "page", &id, field, target, to)?;
                        }
                    }
                }
            }
        }
    }
    for kind in ["masterTemplates", "sectionDesigns", "templates"] {
        if let Some(items) = v[kind].as_array() {
            for a in items {
                let id = a["id"].as_str().ok_or("Missing template ID")?;
                for field in ["parentMasterId", "masterTemplateId", "masterId"] {
                    if let Some(to) = a[field].as_str() { link(tx, kind, id, field, "masterTemplates", to)?; }
                }
            }
        }
    }
    Ok(())
}
