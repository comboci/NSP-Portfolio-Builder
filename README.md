# NSP Portfolio Builder — Version 92 (TASK-013 canvas view controls, source candidate)

V92 adds contextual editor Zoom (35–250%), Pan (hand-drag), Fit Page and portfolio Print/PDF controls in the top design toolbar, and places the existing page-only Show/Hide Guides action beside them. Canvas view state is session-only and per editor context, so zooming or panning does not change object geometry, page data, Project Evolution history or printed output. Existing object drag/resize calculations use the canvas bounding rectangle and should account for view zoom; this must be checked at runtime.

**Scope/remaining TASK-013:** This is a coherent partial source implementation, not completion of the whole task. Separate Save Page (Ctrl+S) and Save Project semantics, clipboard Cut/Copy/Paste and reliable dirty-page feedback are not yet implemented. The current persistence API saves an entire workspace and asynchronously queues SQLite writes, so a button claiming page-only durable save would be misleading until DEC-009 and TASK-023 are addressed explicitly. Print opens the existing portfolio print/preflight workflow rather than printing the editor canvas.

**Validation:** source review only; no Build, Test, browser/Tauri runtime, PDF comparison or owner acceptance. TASK-013 remains in_progress. Runtime review should check zoomed drag/resize and guide positioning, scrollbar/pan behavior, Fit Page across portrait/landscape, switching pages/templates and print/PDF scale independence.

---

# NSP Portfolio Builder — Version 91 (TASK-012 History source candidate)

V91 adds an editor History tab to the existing Visual Studio-style dock alongside Properties and Layers. Per-page/template history remains in memory only, retaining up to 100 atomic scene snapshots (including group/block and layer mutations), with descriptive operation labels, clickable timeline navigation and Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z outside text inputs. History survives changing pages during the current editing session, but is discarded on application restart/project reset. Zoom and pan are excluded.

The session history itself is never persisted in SQLite or the portable export. Jumping across multiple steps restores the scene and attempts a single page save; a failed save rolls back the scene and the history cursor.

**Validation:** source implementation only. No build, static-test execution, browser/Tauri runtime test, PDF comparison or owner acceptance performed; TASK-012 stays in progress pending owner runtime review. Existing TASK-005 through TASK-011 acceptance remains outstanding.

---

# NSP Portfolio Builder — Version 81 (source-only runtime review correction)

V81 introduces physical-left Add buttons in Master Templates and Page Designs, a live cross-project inherited-page count per master template, and deletion of all actual objects attached to a deleted local layer (the previous implementation mistakenly checked a computed layerKey on raw objects). No build, runtime tests, or owner acceptance performed.

Other V80 review requests (library selector redesign and configurable page autosave) remain to be incorporated before complete V81 runtime review. TASK-005/006/007 remain in progress pending owner runtime acceptance.

---

# NSP Portfolio Builder — Version 80 (source candidate)

## V80 — TASK-005 editor and numbering implementation

- New image objects receive sequential editor-only labels `Image 1`, `Image 2`, etc. Labels are metadata for Layers/Properties only; no automatic image captions print.
- A **Page Number** object can be added to templates or pages. It displays the actual 1-based position in the current portfolio, updating on reorder/delete. **Show on First Page** defaults to off and does not renumber later pages. Legacy footer numbers follow the same rule unless superseded by an explicit Page Number object.
- **Text Once** and **Image Once** are available only within the individual page editor, persisted in that page's visualObjects with an explicit once marker, and removed automatically when that page is deleted.
- No SQLite migration is required for this additive frontend metadata; native schema stays revision 5. Tauri/Cargo product version is 80.0.0.

**Validation:** source changes have not been built, functionally tested, run in Tauri or reviewed in PDF. User video/runtime acceptance is pending. TASK-005 stays in progress until the user verifies behavior.

---

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

