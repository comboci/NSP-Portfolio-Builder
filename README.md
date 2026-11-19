# NSP Portfolio Builder — Version 72

Open `index.html` in Edge/Chrome. The complete frontend stays in this file. Browser storage uses IndexedDB, migrating the existing localStorage project without deleting it. JSON backups include original local images and thumbnails.

The existing editor now has a Library dock tab for images. Image Tiles begin at **0 × 1**: the vertical input counts extra rows, and the horizontal input counts images per row. Thus 0 × 2 means two images side by side; 1 × 2 means four images. Use the two Properties inputs or the + buttons at the upper/lower right of the selected grid. Hidden cells are retained when shrinking a grid.

Library supports previews, insertion/replacement, original download, safe deletion and library Undo/Redo. Selected images and individual tiles have interactive crop, fit/fill, zoom/position, filters and frame shapes. Existing layer/selection/template/history behavior is used.

Desktop source uses Tauri 2, SQLite migrations, managed immutable originals/thumbnails, automatic previous-save snapshots and named backups. Wait for **saved** before closing; retry or export JSON if storage reports an error.

User-run commands after installing Windows Tauri prerequisites and Rust/Cargo:

```powershell
Set-Location 'G:\ChatGPT\outputs\NSP-Portfolio-Builder'
cargo install tauri-cli --version '^2' --locked
cargo tauri dev --no-dev-server
```

No build or runtime tests were run. Static-only source checks: `node scripts/static-check.cjs`.

See [LOCAL_IMPLEMENTATION_REPORT.md](LOCAL_IMPLEMENTATION_REPORT.md) for the complete implementation inventory, migration behavior, limitations and Runtime Review steps. Validation results are in `STATIC_VALIDATION.json`.
