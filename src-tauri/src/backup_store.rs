//! N-07: conservative backup lifecycle; never deletes physical asset files.
//! Until the owner explicitly verifies a named restore, automatic snapshots
//! are append-only. Named snapshots are always exempt from automatic retention.
use crate::{image_ownership, media_store};
use rusqlite::{Connection, OptionalExtension, Transaction};
use serde_json::{json, Value};
use std::{collections::HashSet, path::Path};

fn error(e: impl std::fmt::Display) -> String { e.to_string() }

pub fn apply_automatic_retention(tx: &Transaction<'_>) -> Result<(), String> {
    let (limit, approved, checkpoint): (i64, i64, Option<i64>) = tx.query_row(
        "SELECT automatic_limit,prune_approved,verified_named_backup_id
         FROM backup_retention_policy WHERE id=1", [], |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?))
        },
    ).map_err(error)?;
    // A schema upgrade never opts into deletion and never trims historical rows.
    if approved != 1 { return Ok(()); }
    let checkpoint=checkpoint.ok_or("Retention requires an owner-verified named backup")?;
    let exists: i64=tx.query_row(
        "SELECT EXISTS(SELECT 1 FROM named_backups WHERE id=?1)",
        [checkpoint], |r| r.get(0),
    ).map_err(error)?;
    if exists != 1 { return Err("Retention recovery checkpoint is unavailable".into()); }
    // Restrict pruning to automatic metadata/snapshots in this transaction.
    // FK-backed asset edges cascade; immutable asset_files and files on disk remain.
    tx.execute(
        "DELETE FROM backups WHERE id NOT IN
         (SELECT id FROM backups ORDER BY id DESC LIMIT ?1)",
        [limit],
    ).map_err(error)?;
    image_ownership::prune_automatic_backup_refs(tx)?;
    Ok(())
}

pub fn retention_status(conn: &Connection) -> Result<Value, String> {
    let (limit, approved, checkpoint): (i64, i64, Option<i64>)=conn.query_row(
        "SELECT automatic_limit,prune_approved,verified_named_backup_id
         FROM backup_retention_policy WHERE id=1", [], |r| {
            Ok((r.get(0)?, r.get(1)?, r.get(2)?))
        },
    ).map_err(error)?;
    let automatic_count:i64=conn.query_row(
        "SELECT COUNT(*) FROM backups", [], |r| r.get(0),
    ).map_err(error)?;
    let named_count:i64=conn.query_row(
        "SELECT COUNT(*) FROM named_backups", [], |r| r.get(0),
    ).map_err(error)?;
    Ok(json!({
        "automaticCount":automatic_count,
        "namedCount":named_count,
        "automaticLimitAfterApproval":limit,
        "automaticPruneEnabled":approved==1 && checkpoint.is_some(),
        "verifiedNamedBackupId":checkpoint,
        "physicalAssetDeletionEnabled":false
    }))
}

pub fn inspect_backup(
    conn:&Connection, root:&Path, kind:&str, id:i64,
)->Result<Value,String>{
    if id<=0{return Err("Invalid backup ID".into());}
    let (parent, refs)=match kind {
        "automatic"=>("backups","automatic_backup_asset_refs"),
        "named"=>("named_backups","named_backup_asset_refs"),
        _=>return Err("Unsupported backup kind".into()),
    };
    // Table names are selected from a hardcoded allow-list, not interpolated input.
    let payload:Option<String>=conn.query_row(
        &format!("SELECT payload FROM {parent} WHERE id=?1"),
        [id], |r|r.get(0),
    ).optional().map_err(error)?;
    let payload=payload.ok_or("Backup not found; no data was changed")?;
    // Full physical byte-length, MIME signature, path and SHA-256 are checked
    // for each referenced immutable asset. This is read-only, not a restore.
    let hashes=media_store::verify_snapshot_integrity(conn,root,&payload)?;
    let mut stmt=conn.prepare(&format!(
        "SELECT asset_hash FROM {refs} WHERE backup_id=?1"
    )).map_err(error)?;
    let indexed:HashSet<String>=stmt.query_map([id],|r|r.get(0))
        .map_err(error)?.collect::<Result<HashSet<_>,_>>().map_err(error)?;
    let workspace_revision:Option<i64>=if kind=="named" {
        conn.query_row(
            "SELECT workspace_revision FROM named_backups WHERE id=?1",
            [id],|r|r.get(0),
        ).map_err(error)?
    } else { None };
    Ok(json!({
        "workspaceRevision":workspace_revision,
        "revisionProvenance":if kind=="named" {
            if workspace_revision.is_some() {"committed_sqlite"} else {"legacy_unknown"}
        } else {"automatic_snapshot"},
        "kind":kind, "id":id, "integrityOk":true,
        "referencedAssetCount":hashes.len(),
        "indexMatchesSnapshot":hashes==indexed,
        "indexedAssetCount":indexed.len(),
        "readOnly":true
    }))
}
