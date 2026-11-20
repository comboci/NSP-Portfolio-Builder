# NSP Portfolio Builder — Version 117 (TASK-023, source-only)

Partial continuation of TASK-023: Page Save/Return, page-editor Back to Projects/table, new/edit-page entry and project thumbnail switching now wait for database persistence acknowledgement before navigating. If a write fails or the edited page changes during the wait, the page remains open. Page save status reflects pending/failed/acknowledged storage instead of assuming autosave success. No autosave-off checkbox or page-level Save/Discard/Cancel yet, and Save Page/Save Project are not isolated. V116 N-02 SQLite schema 008 and prior data remain unchanged. No Build, Test, static-check script, browser/Tauri runtime or PDF review was executed; owner acceptance remains pending.

---

## NSP Portfolio Builder — Version 114 (TASK-030, source-only)

Updated `scripts/static-check.cjs` to derive the release version from Tauri, require the matching Cargo package version, HTML title/header/meta and every inline JavaScript `appVersion` marker, and check that all SQLite migrations are consecutive and registered in Rust with matching `PRAGMA user_version` declarations. Existing source-parse, IPC, backup and immutable-media consistency checks are retained. A stale V112 main-header label and two V112 JS version overrides were aligned to V114, alongside the Tauri/Cargo release markers.

`STATIC_VALIDATION.json` is intentionally marked **not_executed** with a V114 plan rather than incorrectly claiming that the stale V74 report or the new checker passed. An owner may explicitly invoke `node scripts/static-check.cjs` in a checkout to produce a dated static-only result. That command does not build Tauri or run the application, and it cannot substitute for runtime/PDF acceptance.

**Review required by owner:** inspect version consistency; explicitly run the static checker if desired; separately perform browser/Tauri functionality and SQLite migration reviews. No Build, Test, browser/Tauri execution, PDF verification or owner acceptance was performed by the assistant.

---

# NSP Portfolio Builder — Version 113 (TASK-029, source-only)

The shared image Properties inspector now provides non-destructive grayscale, sepia, blur (0–12 px) and sharpen (0–100%) alongside brightness/contrast/saturation, with independent **Reset Filters** preserving source image, Crop, mask, position, zoom and frame. Per-image and per-Tile settings persist in existing imageEdit JSON, without changing immutable library bytes, project ownership or SQLite schema (6). Canvas/preview/print use the shared image pipeline, with CSS filters and a per-image local SVG convolution kernel for sharpening.

Print preflight reports a non-blocking warning for image/visible Tile assets whose estimated effective DPI drops below 200 after crop/zoom at the selected A4/A3 page geometry. This estimate uses known original pixel dimensions, not printer data; missing assets and geometry overflow remain errors. Missing pixel dimensions do not generate ungrounded quality warnings.

**Review required by owner:** grayscale/sepia/blur/sharpen in browser/Tauri, Crop/Zoom/mask and per-Tile independence, Reset Filters vs Reset All, Undo/Redo, save/reopen, A4/A3 DPI warnings and PDF export/office print parity. No Build, Test, browser/Tauri execution, PDF verification or owner acceptance performed. TASK-029 remains in progress.

---

# NSP Portfolio Builder — Version 109 (TASK-023 partial, source-only)

V109 adds a three-option **Save / Discard / Cancel** confirmation when leaving a dirty Master Template for the master list/another master, or switching from a dirty Section Template to another section. Save uses the V108 durable SQLite/IndexedDB acknowledgement before leaving. Failure or new edits retain the draft and stay in the editor; Discard explicitly drops the draft; Cancel leaves it untouched. The existing two-button dialog API remains backward-compatible.

**Still pending:** A visible autosave checkbox, true page-scoped Save Page / Save Project separation, page dirty snapshots, unsaved page navigation/window-exit handling, and confirmation for other navigation paths. This change does not disable automatic page saves. No Build/Test or runtime/PDF/owner verification. Owner should review each choice for both template types, force a database-save failure to confirm the editor remains open, and check existing two-button dialogs.

---

# NSP Portfolio Builder — Version 108 (TASK-023 partial, source-only)

V108 delays clearing Master Template and Section Template drafts until SQLite/IndexedDB persistence is acknowledged (V13.flushStorage). Previously save() merely queued the asynchronous write and Save-and-Return could leave prematurely. A failed write restores the previous in-memory template, retains the editable unsaved draft and displays an error. Changes made while a save is pending stay in the unsaved draft; duplicate in-flight template-save requests are ignored. The editor now gives storage errors priority over the pending draft label.

**Still pending:** Autosave on/off checkbox, independent Save Page / Save Project, manual dirty-page snapshots and Save / Discard / Cancel on navigation and exit. The global queue is not yet atomic across unrelated edits; this is a partial TASK-023 source candidate. No Build/Test, browser/Tauri, runtime, PDF or owner verification. Owner should review master/section save success/failure/retry, Save-and-Return and editing while a write is pending.

---

# NSP Portfolio Builder — Version 107 (TASK-023 partial, source-only)

V107 begins TASK-023 by making persistence feedback in the shared page/template editor truthful: **saving**, **durably saved**, **error** and **recovery required** now reflect the SQLite/IndexedDB/localStorage write pipeline, instead of labeling a queued write as saved. A retry button invokes the existing global database retry mechanism; it does not pretend to be a separate Save Page command. A failed write remains visible until a subsequent successful write is acknowledged.

**Still outstanding:** the autosave on/off checkbox; independent Save Page / Save Project; manual-mode dirty page snapshots; and Save / Discard / Cancel navigation and close flows. These require an atomic state/persistence boundary under DEC-009. TASK-023 remains in progress. No Build/Test/browser/Tauri/runtime/PDF evaluation was performed. Owner should review editor statuses under save latency, simulated storage failure, retry, page switch, and reopen.

---

# NSP Portfolio Builder — Version 106 (TASK-021, source-only)

V106 improves image replacement through the existing contextual project/public library picker. Replacing a selected image or Tile updates only its immutable asset reference, descriptive filename and legacy inline-source fallbacks, leaving object identity, x/y/w/h, Crop/mask metadata, rounded corners, border, shadow, opacity and other effects unchanged. If the new image aspect ratio differs from the selected frame or Tile by more than 1%, the default Fit view switches to non-distorting **Fill (cover)**; explicitly selected Cover, Stretch or Original modes remain unchanged. The user can change the fit afterwards, including independently per Tile. The image-status label now recognizes SQLite/library asset IDs and the currently selected Tile. Existing editor snapshots provide a single Undo/Redo operation per replacement. No original library bytes or SQLite schema are modified (schema 6).

**Validation:** SOURCE ONLY. No Build/Test, browser/Tauri execution, print/PDF parity check or owner acceptance. TASK-021 remains in_progress. Review regular-image and Tile replacement from private/public libraries, frame and effects preservation with different aspect ratios, Fit adjustments, history, save/reopen, inherited/locked restrictions and PDF preview.

---

# NSP Portfolio Builder — Version 105 (TASK-020, source-only)

V105 exposes the previously hidden Image Crop/Zoom/Position controls directly in the shared Properties panel for image objects, including a per-Tile selector. It adds rectangle/circle/ellipse and editable custom polygon masks (up to 24 vertices), an interactive polygon editor (add, drag, undo vertex, clear), bounded coordinate validation for imported imageEdit metadata, and separate crop-only vs full image-edit reset. Source assets are not rewritten: edits are stored per image/tile and rendered by the existing shared canvas/preview/print renderer. SQLite schema remains revision 6. V104 transactional storage changes are preserved.

**Validation:** SOURCE ONLY. No Build/Test, browser/Tauri execution, PDF parity check or owner acceptance. TASK-020 remains in_progress. Review rectangle/circle/polygon masks, polygon editing in portrait/landscape and non-square frames, Crop drag/resize, Zoom/Position, Tile-specific editing, Undo/Redo, project save/reopen, output PDF and preservation of original library bytes.

---

# NSP Portfolio Builder — Version 103 (TASK-019, source-only)

V103 introduces per-object opacity (0–100% user input, persisted as existing 0–1 fraction), shadow X/Y offset (±100 px), blur (0–100 px), shadow strength (0–100%), border width (0–30px) and color, and rounded corners (0–200 px) for image and rectangle objects. Circles remain circular. Image, Rectangle and Circle use common Properties controls; the editor, page previews and print/PDF use a shared effect renderer. Edits use existing Undo/Redo snapshots and storage; inherited properties remain read-only. No SQLite migration is needed.

**Validation:** SOURCE ONLY; no Build/Test, browser/Tauri runtime, PDF comparison or owner acceptance. TASK-019 stays in progress. Review zero/100% opacity, negative shadow offsets, image cropping under rounded corners, border defaults, changes near page edges, repeated edits/Undo, save/reopen, inherited objects and PDF parity.

---

# NSP Portfolio Builder — Version 98 (TASK-018, source-only)

V98 adds the Transform panel to shared Properties: numeric X/Y/W/H, rotation (-360° to +360°), horizontal/vertical mirroring, nine pivot choices and an aspect-ratio lock. The source renderer shares CSS transforms in editor, preview and print/PDF. Bounds checks consider transformed corners and Region Block containment; ordinary pointer resize honors aspect lock while Ctrl/Command independently resizes around the center. Locked and inherited geometry stays read-only.

**Known limit:** canvas resize handles for rotated/flipped objects are deliberately hidden because those handles require local-axis pointer geometry. Use numeric width/height. TASK-018 remains **in_progress**. **Validation: SOURCE ONLY.** No Build/Test, browser/Tauri runtime review, PDF check or owner acceptance. Review 90° rotations, origin pivots, mirrored text/images, numeric and pointer aspect lock, Ctrl-center, Region Block and Group constraints, Undo/Redo, save/reopen and print output.

---

# NSP Portfolio Builder — Version 97 (TASK-017, source-only)

V97 implements Smart Duplicate in the shared page, section-template and master-template designer. The **Smart Duplicate** toolbar menu keeps signed X/Y offsets (mm) per editing context; the existing Duplicate action and **Ctrl+D** duplicate selected local objects, then select the copies so that repeated Ctrl+D reuses the same displacement vector. Group members and Region Block descendants are duplicated together with fresh IDs and remapped membership; separately duplicated child objects remain inside their original Region Block. Image and Block labels are assigned new sequential names. Inherited/locked selections and offsets that cross page or Block boundaries are refused before mutation. Each duplicate is one Undo/Redo history operation.

**Validation status:** SOURCE ONLY. No Build, Test, browser/Tauri runtime, PDF check or owner acceptance has been executed. TASK-017 remains in progress. Owner review should cover: repeated Ctrl+D (including negative/zero mm offsets), single image/text/shape, linked Group, Region Block with children, individually selected Block child, locked Group member, inherited master object, edges/overflow, undo/redo, saved/reopened objects and PDF layout.

---

# NSP Portfolio Builder — Version 94 (TASK-015, source-only)

V94 refines Group/Ungroup as a membership relation distinct from Region Blocks. Local ordinary elements in the same local layer and outside Region Blocks may join a Group even if some are individually locked. Ungroup removes membership only and preserves each child lock. The Layers group folder exposes chain, selection and direct Ungroup controls. Canvas drag expands all group peers before transformations and refuses to move/resize a linked selection when any member is locked. Inherited master objects cannot be re-owned by grouping, and Region Block parent links are unchanged.

**Validation:** source-only review; no Build, Test, Windows/Tauri/browser runtime or PDF confirmation. TASK-015 remains in progress. Owner review: group locked and unlocked local text/image; attempt group movement while locked; Ungroup and confirm locks unchanged; undo/redo; repeat group movement after unlocking; reject mixed-layer, Region Block and inherited selections; save/reopen and compare PDF geometry.

---

# NSP Portfolio Builder — Version 93 (TASK-014, source-only)

V93 adds a single system-wide Style Library of named text styles (font, size, color and weight). Editable text objects can link to a style from Properties; the shared renderer resolves linked styles for canvas/preview/printing and inherited objects without changing geometry or local inheritance rules. Style creation, editing, and referenced-style deletion protection are accessible under Templates. Central styles follow the V78 global catalog across project switches and are excluded from project-local snapshots; old projects start with an empty catalog. This is additive to the existing schema-2 JSON and requires no SQLite reset.

**Validation:** no Build/Test, Windows/Tauri/browser runtime or PDF review performed. TASK-014 remains in progress pending owner review: cross-project propagation, save/reopen, import/export, inherited text, print parity and deletion safeguards.

---

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

