# NSP Portfolio Builder — JSON template library

The repository `templates/` directory contains **five independently authored corporate portfolio template packs**, using schema `nsp.template-pack.v1` and the application’s existing editable objects (text, shape, circle, line). No third-party photographs, logos, or page designs are redistributed.

| JSON file | Source of general layout inspiration | Work research sections | Editable pages |
|---|---|---|---|
| `nsp-legrand-grms-v1.json` | Legrand — Guest Room Hotel Solutions | SEC-05, SEC-04, SEC-07 | 1 |
| `nsp-abb-hospitality-v1.json` | ABB — Hospitality Portfolio | SEC-03, SEC-05, SEC-10 | 1 |
| `nsp-crestron-case-study-v1.json` | Crestron — Hotel Renegade Case Study | SEC-11, SEC-12 | 2 |
| `nsp-vingcard-product-sheet-v1.json` | Vingcard — Hospitality / Product Sheets | SEC-14, SEC-16 | 1 |
| `nsp-siemens-multihotel-dashboard-v1.json` | Siemens — Connected hotel operations | SEC-09, SEC-17 | 1 |

**How to use:** Open the single-file `index.html` and go to **طراحی قالب‌ها → نمونه قالب‌های اختصاصی NSP**. For any pack, choose **ساخت صفحه و ویرایش** to create its page(s) in the current portfolio, **افزودن به کتابخانه** to register reusable page templates without creating pages, or **دریافت JSON** to save the external pack. **بارگذاری فایل JSON** imports an external `nsp.template-pack.v1` file. Duplicate imports preserve existing edits to registered templates.

**Image and data placeholders:** All logos, product photographs, hotel photographs, metrics and project facts are placeholders. Insert appropriately licensed images with the existing image tools; fill in only verified NSP data. The dashboard contains no invented occupancy, energy or performance figures. The case study does not claim an NSP project was completed.

**Storage semantics:** JSON files in this folder are distribution sources. The Browser cannot silently write files next to a local `index.html`; imported templates are persisted by the application's existing storage. The same five packs are embedded in `index.html` to work offline.

**Quality status:** Source/schema/geometry checks are separate from actual browser runtime acceptance. Review creation of both Crestron pages in sequence, edit/save/reload each, preserve existing page content, import duplicates without overwriting edits, and verify printing/PDF.
