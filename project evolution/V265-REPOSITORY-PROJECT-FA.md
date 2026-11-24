# V265 — پروژه‌های پوشه‌ای و General Portfolio

**Browser V265** (index.html). Native Tauri V138 remains unchanged. This release is a source candidate, not an owner-approved runtime release.

## روش استفاده

1. Git Pull; run root index.html locally. Use Edge/Chrome for direct folder writes; Firefox can read a user-selected root folder and export a ZIP for manual extraction.
2. In project list choose «باز کردن پروژه»; select repository **root** containing `project file` and `Image`, then General-Portfolio. Grant browser access. The app resolves and validates all images before adding the project to its existing registry. Existing projects are never overwritten on import; opening a duplicate opens the registered local project only after confirmation.
3. Open the portfolio and edit individual image/text layers. Normal in-app saving still writes the app database. «ذخیره پروژه» on the project row explicitly writes disk project.json and the shared images; select repo root, confirm any existing JSON replacement. On browsers without folder-write access, extract the offered ZIP to the repository root. The app does not perform Git commits from the browser.
4. Legacy portable backups remain supported through «ورود Backup JSON» and Export. The GitHub importer is unchanged and remains for legacy JSON backups; V265 folder projects need no internet.

## Disk contract

```
Image/nsp-*.svg or .webp
project file/General-Portfolio/project.json
```
The JSON carries only `../../Image/<filename>` refs, not Base64. Original conceptual SVG images are decoded as browser images and rasterized into PNG in the current app image store, which only accepts PNG/JPEG/WebP/GIF. The logo and D05 room image are recovered from the existing D05 project. Newly designed illustrations are conceptual SVGs, not photos of executed NSP installations. Same-session save preserves original image bytes. The browser database retains the source-relative path plus source/runtime fingerprints; direct save after refresh can reuse the original SVG/WebP when both fingerprints match. Missing or modified originals fall back to content-named current raster data. Existing files are verified byte-for-byte and are not knowingly overwritten when different. ZIP exported after refresh without original-folder read access may contain the rasterized image instead. Files are written before the JSON; successful direct save includes re-reading the files.

## Validation status

- 10 pages, 40 independent named layers, 235 editable objects, 11 external assets; no page is empty. Bounds and safe text margin checked. Existing project normalizer tested with placeholder image payloads.
- All 34 executable script blocks individually and jointly parsed in JavaScript; embedded seed JSON parsed.
- Actual transport helpers exercised using synthetic image bytes and in-memory file handles: relative path rejection, missing assets, hydrate/pack round trip, ZIP signatures, known CRC-32 and folder-save readback. These checks do not constitute real browser or native runtime acceptance.
- Reproducible repository check: `node scripts/v265-project-layout-check.cjs` (source + actual file dependencies; mock image decoding).
- **Outstanding:** full browser runtime with real decoded SVG/WebP images, visual review of all 10 pages, file picker permission, direct Save/reopen, duplicate protection and persistence after refresh. No native Build, test or release performed.

### Follow-up integration checks

Actual V265 import, dependency remap, project switch and normalizer were executed with mocked persistence and image decoding, using the D05 WebP bytes and all nine checked-in SVG sources. The simulated registry preserved the old project, rejected duplicate import, imported all 235 objects and 11 public image references, and round-tripped a text edit and original asset bytes. No full browser runtime is claimed.

Source-fingerprint helpers were exercised with synthetic assets after serializing/restoring the hydrated payload: matching originals were reused; altered originals were not reused; disk JSON remained free of image data and internal source metadata.
