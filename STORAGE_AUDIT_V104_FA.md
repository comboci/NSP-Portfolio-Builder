# NSP Portfolio Builder — Storage audit & corrections (V104)

Date: 2026-11-19
Base: V103 (Project Evolution TASK-019 preserved)
Branch: main
SQLite schema: **6** (no destructive migration)

## Changes

1. **Differential relational persistence:** `project_store.rs` now upserts project/portfolio/page/template records only when they change, compares primary keys before deleting removed records, and keeps page/portfolio collections out of duplicate per-project JSON payloads. The original portable workspace snapshot and all historical backups stay available for recovery.
2. **Referential integrity:** a page referencing a nonexistent shared template now fails the entire transaction instead of disappearing silently from `global_template_dependencies`.
3. **Backup image references:** named backup creation writes `image_backup_refs` in the same SQL transaction. Automatic backup pruning occurs before the reference-index rebuild, preventing stale retention rows.
4. **User-visible save confirmation:** critical project/portfolio create, rename, copy, delete and switch operations await the storage queue before reporting success. Failed writes undo their in-memory mutation and show an error; noncritical save failures now show an explicit warning and preserve the current state for JSON export.
5. **Read-only operator audit:** `python scripts/sqlite-audit.py /path/to/portfolio.sqlite3` inspects integrity, foreign keys, missing tables and orphaned asset references without modifying data.

## Verification and risks

- **Verified:** SQL semantics of the new UPSERTs, active-project unique-index turnover, cascading project deletion, and `PRAGMA foreign_key_check` on an isolated in-memory SQLite model.
- **Not verified:** native Rust/Tauri compilation, actual existing-user migration, Windows runtime interactions, project import/export, PDF rendering and recovery under power loss. No Rust toolchain was available in this execution environment.
- A normal editor `save()` still uses an optimistic asynchronous queue; the main P0 is **mitigated for critical project operations** rather than fully removed across every editor call site.
- Legacy `projects/pages/templates/images` projections and some ownership indexes still rebuild on save. The project/portfolio/page relational projection is now differential, but this is not yet end-to-end incremental persistence.
- Asset garbage collection remains disabled by design so historical backups are never broken. Named backup retention is intentionally unlimited until a user-defined policy exists.
- SQLite and `storage/assets/` must be backed up together. Do not downgrade an upgraded installation to an incompatible older version.

## Owner regression checklist

- Create two projects, switch repeatedly; rename, clone and delete a project; kill the app mid-write and reopen.
- Create/rename/clone/delete portfolios, add pages, test the active-project constraint and reopen.
- Delete/rename templates in use: missing references must reject the transaction without loss of prior rows.
- Create named/automatic backups, restore old snapshots and verify every image including hidden tiles; inspect `image_backup_refs`.
- Import the same image twice and publish/share it between projects, verify physical image bytes are retained.
- Run `scripts/sqlite-audit.py` on a copy of the production DB (ideally with the app stopped) and confirm `ok: true`.
- Test both Windows Tauri/SQLite and standalone HTML/IndexedDB separately.

No automatic production database rewrite or physical asset deletion was introduced.
