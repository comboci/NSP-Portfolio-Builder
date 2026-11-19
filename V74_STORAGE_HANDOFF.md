# NSP Portfolio Builder — V74 source handoff

Date: 2026-11-19
Basis: Version 72, with concurrent Project Evolution commits preserved.
Target: GitHub `main`, source version **74**.

## First handoff (A–H) vs source V72

| Requirement | Observed in V72 source | Acceptance status |
|---|---|---|
| A. Tauri 2 integration | Native commands, app config and IPC registration | Source present; desktop not built |
| B. SQLite/migrations | 001/002 SQL, transactional saves, project/page/template/image projections | Source present; runtime not verified |
| C. Image Library | Upload, thumbnails, dedupe, replace/remove/download, history | Source present; interaction not verified |
| D. Dock | Image Library tab with editor integration and pin controls | Source present; interaction not verified |
| E. Dynamic Tiles | Rows/cols/gap, editable cells, stash, 0x1 / 0x2 / 1x2 contract | Source present; interaction not verified |
| F. Image editing | Non-destructive crop, fit, zoom, position, frames and filters | Source present; render/PDF not verified |
| G. Editor integration | Master/section/page contexts, layers, snapshots, undo/redo | Source present; regression not verified |
| H. Transfer/backup | JSON import/export, PDF renderer, named/automatic backups | Source present; restore not verified |

## V74 actual changes

1. Native Tauri `save_project` recursively replaces supported `data:image/...;base64` fields with hash references after writing immutable image files to `storage/assets/`. The complete metadata is retained in SQLite JSON and relational projections; image bodies are no longer repeatedly stored there.
2. On native `load_project`, `read_backup`, and `read_named_backup`, assets are read, validated by size/signature/SHA-256, and rehydrated as inline image data for compatibility with the existing frontend. Asset references in nested `tilesJson` are handled too.
3. Migration `003.sql` plus `migrate_payload_table` converts all previous project/page/template/image and backup payloads using one SQLite transaction. It does not delete the old schema, databases, or image files.
4. `list_backups` now returns only ID and date. The selected historical backup is loaded separately by `read_backup`, avoiding a mass payload transfer.
5. Standalone HTML keeps IndexedDB behavior and portable JSON output with images. Version markers and Tauri package version are 74.
6. Project Evolution changes from other developers are retained, not refactored or reverted.

## Known risks / validation limits

- **The app has not been built or executed.** Syntax/source inspection is not a Windows functional test.
- Migrated native storage requires the **asset folder and SQLite database together**; copying just the database is insufficient. Downgrading the native app to V72 is unsafe without restoring the pre-migration backup.
- Assets are immutable and old assets are intentionally not garbage-collected, to avoid breaking historical backups. Disk usage can still grow over time, but repeated Base64 images no longer bloat SQLite JSON snapshots.
- A portable JSON export still includes Base64 images by design. The frontend rehydrates Base64 in memory, so extremely large libraries can consume RAM despite the new on-disk format.
- Test migration on a copied V72 workspace before any production use. There is no evidence of successful Windows/Tauri runtime execution in this handoff.

## Suggested user-run acceptance checks

1. Back up the entire native `storage/` directory before first launch. Start V74 and inspect all existing pages, images, templates and historical backups.
2. Import an image twice; verify it is deduplicated, crop/tiles and PDF still work, save/exit/reopen restores it, and original download is byte-identical.
3. Make changes and save multiple times; compare SQLite size with V72 and confirm image bytes appear under `storage/assets/` while JSON rows contain short asset references.
4. Restore a named backup and an automatic previous revision; verify old images, hidden image tiles, and Undo/Redo still work.
5. Export JSON, import it in another browser profile or machine, and verify the images survive without the source machine's `assets/` directory.
6. Verify Project Evolution files remain unchanged, and test Windows installer separately before release.

Current handoff state: **source prepared for user runtime review only; runtime correctness not yet certified**.
