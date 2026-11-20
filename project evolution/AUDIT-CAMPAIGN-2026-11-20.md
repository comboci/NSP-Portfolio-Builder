# NSP Portfolio Builder — ممیزی بازنگرانه مرحله‌ای Project Evolution

تاریخ: 2026-11-20  
مخزن: `comboci/NSP-Portfolio-Builder` / `main`  
نسخه مبنای بررسی سورس: V125، SQLite schema 12، `57cb574f33903d9aed3b28327ab5fbf4ce44ca68`  
دامنه: تطبیق پیوسته TASK-001 تا آخرین TASK جاری، نه صرفاً خواندن وضعیت task یا ادعای تأیید Runtime.

## قرارداد هر N
- هر پیام **N** از مالک در این چت = **اجرای فقط یک مرحله ممیزی** از جدول زیر، با خواندن `main` تازه و حفظ تغییرات موازی.
- تسک‌های اصلاحی حاصل به‌صورت `planned` و دارای Priority، Evidence، Acceptance و پیوند تسک‌های قبلی در فایل PES-14 ثبت می‌شوند. زمان‌بندی ساعتی موجود می‌تواند طبق `open_state.next_work_record_ids` به سراغ آن‌ها برود؛ audit N خودش کد را اصلاح نمی‌کند.
- تا دستور خلاف از مالک صادر نشده، **Build/Test/static-check توسط دستیار ممنوع** است (DEC-006)؛ پیاده‌سازی سورس ≠ تأیید Runtime ≠ Acceptance مالک.
- شماره نسخه محصول فقط با تغییر واقعی سورس افزایش می‌یابد. ممیزی و ثبت PE تغییری در نسخه محصول نمی‌دهد.
- اگر یک یافته پیش‌تر در تسک دیگری پوشش داده شده باشد، به همان تسک لینک شود و کار تکراری ساخته نشود؛ اگر مستقل و بدون پوشش باشد، Task جدید ایجاد گردد.

| فاز | حوزه بازبینی | وضعیت |
| --- | --- | --- |
| 01 | SQLite، Schema/Migrations 001–012، FK، مالکیت داده، CAS، پروژه و رابطه صفحه/قالب، تطبیق TASK-001..037 | **انجام شد: سورس‌محور، بدون اجرای برنامه** |
| 02 | ذخیره صفحه/پروژه، Autosave، Dirty State، Backup/Restore، فایل‌ها، WAL و شکست عملیات/rollback | **نوبت بعد با N** |
| 03 | Import/Export (JSON، پروژه/پورتفولیو، وابستگی‌ها، سازگاری نسخه، برخورد شناسه‌ها) | در انتظار N |
| 04 | UI/UX پروژه‌ها، ناوبری، صفحات، Dockها، Responsive و دسترس‌پذیری | در انتظار N |
| 05 | موتور طراحی، Template inheritance، Region Block، Layer/Group، history، snapping و Transform | در انتظار N |
| 06 | Image Library، مالکیت خصوصی/عمومی، Assetها، Tile/Stash، crop/mask، حذف ایمن | در انتظار N |
| 07 | PDF/Print، صفحه‌بندی، DPI، Preflight، مقیاس و برابری رندر | در انتظار N |
| 08 | کارایی، حافظه، امنیت ورودی، خطایابی و پایداری، کارهای چندپنجره‌ای | در انتظار N |
| 09 | ممیزی نهایی ردیابی Task 001 تا آخرین Task، Gapهای پوشش و ماتریس تأیید مالک | در انتظار N |

## خروجی فاز 01 — دیتابیس / یکپارچگی داده

| Priority | Finding | Task قابل اجرا | منبع و اثر |
| --- | --- | --- | --- |
| P0 | FND-015 | TASK-038 — خطای ذخیره قدیمی در صف با ذخیره جدید پنهان می‌شود | \`index.html:5708-5725\` |
| P1 | FND-016 | TASK-039 — ذخیره IndexedDB بین تب‌های مختلف کنترل Revision ندارد | \`index.html:5687-5706\`، \`index.html:5844-5846\` |
| P1 | FND-017 | TASK-040 — تغییر نام تصویر عمومی خارج از SQLite CAS انجام می‌شود | \`src-tauri/src/main.rs:97-102\`، \`src-tauri/src/image_ownership.rs:379-403\`، \`index.html:1910-1919\` |
| P1 | FND-018 | TASK-041 — تصویر گم‌شده می‌تواند بارگذاری کل پروژه را مسدود کند | \`src-tauri/src/media_store.rs:101-155\`، \`src-tauri/src/main.rs:53-62\`، \`index.html:5844-5847\` |

### شرح و سناریوها
#### 1. FND-015 / TASK-038 — خطای ذخیره قدیمی در صف با ذخیره جدید پنهان می‌شود
index.html enqueue() catches each rejected write and reports it only when rev===revision, while a later success sets completed=latestRevision, clears lastError and makes flushStorage() succeed. When save A and save B are queued and A fails but B succeeds (especially distinct pages), A can remain unpersisted while the user sees Saved. This is a source-supported failure path; reproduction remains owner-only.

**معیار رفع:** Preserve each write result and pending dirty scope; any failure must block a global 'saved' claim until recovery is durably acknowledged. flushStorage/Save/Leave/Retry must surface an earlier failed page even after another page successfully saves; WRITE_CONFLICT must remain fail-closed. No silent retry that overwrites newer data.

**شواهد سورس:** [index.html:5708-5725](https://github.com/comboci/NSP-Portfolio-Builder/blob/57cb574f33903d9aed3b28327ab5fbf4ce44ca68/index.html#L5708-L5725).

#### 2. FND-016 / TASK-039 — ذخیره IndexedDB بین تب‌های مختلف کنترل Revision ندارد
Browser openBrowser() reads one KEY snapshot, and both write() and writePage() issue blind IndexedDB put(payload,KEY). There is no compare-and-swap application revision or cross-tab stale-write detection. Two open tabs can silently overwrite each other; native SQLite CAS does not apply in browser mode. No runtime execution has been performed.

**معیار رفع:** Persist a monotonic browser revision and enforce atomic compare-and-write in a single IndexedDB readwrite transaction; reject stale snapshots without overwriting data; provide an export/reload recovery flow and a safe upgrade path for existing IndexedDB state; distinguish the localStorage fallback contract.

**شواهد سورس:** [index.html:5687-5706](https://github.com/comboci/NSP-Portfolio-Builder/blob/57cb574f33903d9aed3b28327ab5fbf4ce44ca68/index.html#L5687-L5706)، [index.html:5844-5846](https://github.com/comboci/NSP-Portfolio-Builder/blob/57cb574f33903d9aed3b28327ab5fbf4ce44ca68/index.html#L5844-L5846).

#### 3. FND-017 / TASK-040 — تغییر نام تصویر عمومی خارج از SQLite CAS انجام می‌شود
rename_public_image directly commits image_public_catalog.payload without expected_revision, require_workspace_revision or advance_workspace_revision; frontend calls invoke outside the storage queue. Concurrent renames may silently overwrite each other and do not invalidate a stale workspace revision. This violates the intended revision discipline of Migration 011 for shared mutations.

**معیار رفع:** Apply expectedRevision CAS to public-image metadata rename in the same SQLite transaction; return the new revision and route frontend operations through the serialized persistence queue. A stale second-window rename reports WRITE_CONFLICT without overwriting the canonical name. Preserve published identity/hash, ownership, usage and original files.

**شواهد سورس:** [src-tauri/src/main.rs:97-102](https://github.com/comboci/NSP-Portfolio-Builder/blob/57cb574f33903d9aed3b28327ab5fbf4ce44ca68/src-tauri/src/main.rs#L97-L102)، [src-tauri/src/image_ownership.rs:379-403](https://github.com/comboci/NSP-Portfolio-Builder/blob/57cb574f33903d9aed3b28327ab5fbf4ce44ca68/src-tauri/src/image_ownership.rs#L379-L403)، [index.html:1910-1919](https://github.com/comboci/NSP-Portfolio-Builder/blob/57cb574f33903d9aed3b28327ab5fbf4ce44ca68/index.html#L1910-L1919).

#### 4. FND-018 / TASK-041 — تصویر گم‌شده می‌تواند بارگذاری کل پروژه را مسدود کند
Normal load_project_state() calls hydrate_payload(), whose fetch_image() returns an error for missing/corrupt asset files/metadata; the error aborts the whole load. REQ-011 explicitly requires an unavailable-source placeholder for missing files. Backup integrity inspection/restore must remain strict; normal workspace load needs a separate degraded-read policy.

**معیار رفع:** Allow the project, portfolios, pages and other healthy assets to open with explicit missing-image placeholders and warnings; retain original immutable hash/metadata without silent replacement. Keep backup restore and integrity checks fail-closed, and do not silently save a degraded snapshot that would discard unavailable images.

**شواهد سورس:** [src-tauri/src/media_store.rs:101-155](https://github.com/comboci/NSP-Portfolio-Builder/blob/57cb574f33903d9aed3b28327ab5fbf4ce44ca68/src-tauri/src/media_store.rs#L101-L155)، [src-tauri/src/main.rs:53-62](https://github.com/comboci/NSP-Portfolio-Builder/blob/57cb574f33903d9aed3b28327ab5fbf4ce44ca68/src-tauri/src/main.rs#L53-L62)، [index.html:5844-5847](https://github.com/comboci/NSP-Portfolio-Builder/blob/57cb574f33903d9aed3b28327ab5fbf4ce44ca68/index.html#L5844-L5847).

### ملاحظات و محدودیت‌ها
- در هنگام آغاز ممیزی HEAD از V123/Schema 11 به V124/Schema 12 و سپس V125 تغییر کرد. ارجاع اولیه به نبود `backup_store.rs` ناشی از تغییر هم‌زمان شاخه بود و **باگ محسوب نشد**؛ این مورد وارد تسک‌ها نشد.
- TASK-031..037 همگی پیاده‌سازی سورس یا برنامه معماری هستند؛ تأیید Build/Test/Windows/SQLite واقعی یا Restore مالک ندارند. در این ممیزی هیچ تسکی به اشتباه `completed` نشده است.
- معیارهای پذیرش چهار تسک تازه به‌صورت source review تعریف شده‌اند؛ تأیید Runtime بعداً باید توسط مالک ثبت شود.
- هنگام اجرای N بعدی HEAD و PE را مجدد بخوانید؛ یافته‌های رفع‌شده در Commitهای هم‌زمان باید با Evidence و حفظ history به‌روز شوند، نه حذف شوند.

**Checkpoint:** `OBS-046`. **مرحله بعد با N: 02 — ذخیره‌سازی، فایل‌ها، پشتیبان و rollback.**
