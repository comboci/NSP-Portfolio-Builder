# NSP Portfolio Builder — Curated A4 Templates

Two independent, authored-in-NSP, editable page templates as JSON packs. Works with current browser-first single-file `index.html`.

- `nsp-legrand-grms-v1.json`: GRMS architecture, mapped to research Work sections **SEC-05, SEC-04, SEC-07**. Inspired by high-level layout patterns in Legrand hotel solution materials.
- `nsp-abb-hospitality-v1.json`: hotel solution benefits, mapped to **SEC-03, SEC-05, SEC-10**. Inspired by general hospitality presentation patterns in ABB materials.

No Legrand/ABB images, logos, or catalog pages are copied. Every placeholder is a simple editable text/shape object. Replace the logo or photo placeholders through the existing image library and editor. No vendor claims are implied for NSP.

Each pack is `nsp.template-pack.v1` with metadata and `pages`. Select **طراحی قالب‌ها → نمونه قالب‌های اختصاصی NSP → ساخت صفحه و ویرایش** for a new editable page, **افزودن به کتابخانه** to keep a template without adding a page, or **بارگذاری فایل JSON** to import a downloaded pack. Imported template ID is stable and duplicate imports preserve local edits.

Because standalone HTML cannot silently write to adjacent directories, these JSONs live in this repository folder for distribution; the same packs are embedded in the HTML for offline use. Imported templates persist through existing application storage, not by overwriting external JSON.

Source syntax/JSON checks are not proof of runtime acceptance. Test loading, editing, saving, reloading and creating pages in the browser.
