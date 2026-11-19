# NSP Portfolio Builder — Version 79 (source candidate)

## V79 — TASK-007: private/public image ownership

- Projects can independently own the same immutable asset without duplicating physical bytes. Explicit sharing grants another project a durable logical image record; a source project cannot remove the recipient's copy.
- Users can explicitly publish an image into a permanent public catalog, browse it from the library/editor, and optionally add it to a private project library. Merely viewing or using a public image does not grant private ownership.
- New SQLite migration `005.sql` introduces image ownership, irreversible public catalog, image usage edges and backup asset-reference indexes. The original image bytes remain in Tauri's writable `storage/assets/` folder, content-addressed by SHA-256. The public program-install directory is **not** used as a writable image root.
- New and edited global templates may only bind public image resources. Physical asset garbage collection remains **disabled**, including after project deletion, to avoid breaking shared owners or historical backups.
- Image edits, thumbnails, tiles and their hidden/stashed cells remain tied to the original immutable asset.

**Validation status:** SOURCE ONLY. GitHub commit does not mean build, migration, browser/Tauri runtime review, restore test, or owner acceptance. Per Project Evolution's PES-14 startup policy, the owner will run build/runtime checks. TASK-007 remains `in_progress` until those results are recorded.

**Runtime-review scenarios when owner starts:** (1) publish from project A, view in Global Library and project B; (2) explicitly grant B ownership; (3) remove unused A-side record and verify B/public copies still work; (4) add public image to B, save/reopen; (5) confirm global templates use public images; (6) test backups and tiles with hidden cells; (7) inspect SQLite ownership, catalog and reference rows.

**Known limit:** The `image_project_owners`, `image_public_catalog` and image-usage tables are a new source implementation; no native build or functional test has been executed. V78 global-template and relational-workspace changes also await owner review. Garbage collection remains intentionally absent.

---

# Historical V78 source handoff

## V78: TASK-006 implementation scope

- The HTML interface uses one shared master/page-template catalog for all project workspaces. Each project still owns its portfolios, pages and private image library.
- The Tauri/SQLite layer introduces independent relational records for projects, portfolios and pages; a separate global template catalog and page-to-template dependency index are stored transactionally.
- An additive `004.sql` migration preserves the V74 legacy `workspace` snapshot and all named/automatic backups; existing saved workspaces can be read before their first V78 save. **No existing database was reset by this change.**
- Inherited objects permit per-child visibility and stacking order only; their geometry, content and style are read from the source template.
- Native package and UI versions are `78.0.0` and `V78`. The immutable image reference format remains `nsp-asset-v74:` for compatibility.

**Validation:** this is a source handoff only. No build, test, browser runtime, Windows Tauri runtime, migration execution, or owner acceptance has been performed. Run owner runtime review before trusting the new storage model.

**Outstanding:** TASK-007 (global/private image ownership and safe shared deletion) and TASK-005 (Once elements and numbering) remain open. Shared-template image resources that belong to a different project's private image library require TASK-007; until then, cross-project image binding is not guaranteed. Legacy assets/backups are deliberately retained.

---

## V74 storage background (historical)

Version 74 preserves the Version 72 HTML editor, image library, crop/tiles, and browser IndexedDB storage, while changing **native Tauri/SQLite asset persistence**. The branch also retains the separate Project Evolution commits.

## Desktop storage

The Tauri app saves the project's complete editable *metadata and references* in SQLite. The binary original images and thumbnails are stored **once** in the application-local `storage/assets/` folder, identified by SHA-256. SQLite JSON records use `nsp-asset-v74:<sha256>` instead of Base64 image bodies. This also applies to automatic and named backup records. Files referenced by any backup are retained; asset garbage collection is intentionally **not** performed.

When loading a project or restoring a backup, the native backend verifies the image file and rebuilds the previous compatible data-URL representation for the existing editor. The portable JSON export generated in the editor still embeds images and is self-contained. The standalone HTML browser build **continues to use IndexedDB** and has no access to native SQLite.

### Non-destructive SQLite migration

The first native startup upgrades schema version 2 to 3 in a transaction, converting legacy Base64 payloads in projects, image metadata, templates, pages and automatic/named backups to immutable asset references. The old database tables are retained. If the conversion fails, SQLite rolls back; any content-addressed files already created remain safe. Because the new format is not recognized by V72, **do not downgrade the desktop app with an already migrated database**.

**Before first desktop launch:** make an independent backup of the whole `storage/` folder **including** `portfolio.sqlite3`, any WAL/SHM companion files, and `assets/` (close the application before copying). Keeping only the SQLite file will not preserve the images in V74. Exporting JSON from inside the app provides an independent portable backup.

### Running

Browser: open `index.html` with Edge/Chrome. Desktop (on a Windows host with Rust, MSVC C++ and WebView2):

```powershell
cargo install tauri-cli --version '^2' --locked
cargo tauri dev --no-dev-server
```

Static check from repository root:

```powershell
node scripts/static-check.cjs
```

**Validation status:** No Rust build, Tauri runtime test, or browser functional test has been executed by this handoff. A static source check cannot establish that the application works at runtime. See `V74_STORAGE_HANDOFF.md` for change scope, risks and the user-run acceptance checklist.

