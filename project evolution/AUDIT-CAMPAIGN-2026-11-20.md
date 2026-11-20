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
| 02 | ذخیره صفحه/پروژه، Autosave، Dirty State، Backup/Restore، فایل‌ها، WAL و شکست عملیات/rollback | **انجام شد: سورس‌محور، بدون Build/Test** |
| 03 | Import/Export (JSON، پروژه/پورتفولیو، وابستگی‌ها، سازگاری نسخه، برخورد شناسه‌ها) | **نوبت بعد با N** |
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

**Checkpoint فاز 01:** `OBS-046`. فاز 02 در ادامه این گزارش ثبت شده است.

## رفع یک نقص مستقل در V126 — TASK-040 / FND-017

Commit سورس: [`05a22522`](https://github.com/comboci/NSP-Portfolio-Builder/commit/05a225224e6e2b96821fb17da6f22443aa71055c).

تغییر نام تصویر عمومی در نسخه V125 از کنترل Revision و صف ذخیره خارج بود؛ در V126 کنترل `expectedRevision`، تشخیص `WRITE_CONFLICT`، افزایش Revision و Metadata Rename در یک Transaction اتمیک قرار گرفت. کلاینت Tauri نیز همان صف Save Page/Save Project را برای این دستور به کار می‌برد. وضعیت TASK-040 در PES-14 به **in_progress / source-only / owner verification pending** تغییر کرد؛ FND-017 از «رفع‌نشده» به «سورس اصلاح‌شده، اجرای واقعی تأیید نشده» رسید.

**محدودیت:** هیچ Build، Test، Static Checker یا Windows Runtime اجرا نشده است (DEC-006). ورژن محصول V126، SQLite Schema 12 بدون Migration جدید. سایر FND-015/016/018 و TASK-038/039/041 همچنان باز هستند؛ فاز ۰۲ ممیزی مستقل و در انتظار N کاربر باقی می‌ماند.


## خروجی فاز 02 — ذخیره، بکاپ، فایل، WAL و Rollback

مبنای ممیزی: `dd5ccf594c0d41c696250b3e3949ceb580983e71` (نسخه سورس **V126**، SQLite schema **12**). این مرحله فقط بررسی است و هیچ فایل اجرایی، Migration یا تستی تولید/اجرا نشده است. تسک TASK-040 در Commit `05a22522` در سورس اصلاح شده ولی همچنان تأیید Runtime ندارد؛ تکرار نشد.

| اولویت | Finding | Task | توضیح کوتاه |
| --- | --- | --- | --- |
| P1 | FND-019 | TASK-042 | Fallback خاموش از IndexedDB به localStorage باعث ایجاد دو شاخه داده می‌شود |
| P1 | FND-020 | TASK-043 | بکاپ نام‌دار الزاماً Snapshot تأییدشده همان Revision دیتابیس نیست |
| P1 | FND-021 | TASK-044 | دکمه خروجی بازیابی هنگام خطای بارگذاری ممکن است داده حافظه را جای داده واقعی معرفی کند |
| P2 | FND-022 | TASK-045 | Rollback پایگاه داده نمی‌تواند فایل‌های موقت یا Asset منتشرشده را خودکار برگرداند |

### FND-019 / TASK-042 — Fallback خاموش از IndexedDB به localStorage باعث ایجاد دو شاخه داده می‌شود

**وضعیت:** P1؛ یافته سورس‌محور، نیازمند بررسی Runtime مالک.

در شروع نسخه مرورگر، خطای openBrowser()/IndexedDB در index.html:5870 بدون انتخاب و هشدار مسدودکننده باعث mode='localStorage' می‌شود. v13ReadInitialState() پیشاپیش از localStorage داده می‌خواند، در حالی که نسخه معتبر احتمالی IndexedDB در آن لحظه قابل دسترس نیست. ویرایش/Save بعدی در localStorage انجام می‌شود و هنگام بازگشت IndexedDB محتوای دیگری نمایش داده خواهد شد. این خطر Split-brain و سردرگمی درباره محل نسخه معتبر است؛ شکست در اجرای واقعی هنوز آزمایش نشده.

**معیار پذیرش:** در خطای موقت، blocked یا denied شدن IndexedDB، برنامه بدون تأیید آگاهانه کاربر به یک پایگاه دیگر سوئیچ نکند و آن را «نسخه اصلی و ذخیره‌شده» اعلام نکند؛ حالت recovery/export/read-only و انتخاب منبع با منشأ مشخص ارائه شود؛ نه IndexedDB قبلی overwrite شود نه داده localStorage از بین برود؛ مسیر بازگشت و reconciliation نسخه‌ها بدون بازنویسی خودکار تعریف شود.

**مراجع:** [index.html#L558-L564](https://github.com/comboci/NSP-Portfolio-Builder/blob/dd5ccf594c0d41c696250b3e3949ceb580983e71/index.html#L558-L564)، [index.html#L5688-L5706](https://github.com/comboci/NSP-Portfolio-Builder/blob/dd5ccf594c0d41c696250b3e3949ceb580983e71/index.html#L5688-L5706)، [index.html#L5869-L5873](https://github.com/comboci/NSP-Portfolio-Builder/blob/dd5ccf594c0d41c696250b3e3949ceb580983e71/index.html#L5869-L5873).

### FND-020 / TASK-043 — بکاپ نام‌دار الزاماً Snapshot تأییدشده همان Revision دیتابیس نیست

**وضعیت:** P1؛ یافته سورس‌محور، نیازمند بررسی Runtime مالک.

V.createBackup() بعد از save()/flushStorage نسخه دلخواه backupPayload() فرانت‌اند را به create_backup ارسال می‌کند. backupPayload() پیش‌نویس Master/Section را نیز روی Snapshot اعمال می‌کند. Backend با payload=Some آن را می‌پذیرد و فقط کمپکت/صحت فایل‌های Asset را اعتبارسنجی می‌کند؛ از snapshot رابطه‌ای تاییدشده و شماره Revision به عنوان منبع قطعی استفاده نمی‌کند. میان ACK ذخیره و ساخت بکاپ امکان تغییر توسط پنجره دیگر نیز وجود دارد. بکاپ می‌تواند با آخرین وضعیت قطعی SQLite متفاوت باشد؛ این اختلاف به خودی خود اثبات خرابی فایل نیست.

**معیار پذیرش:** برای named recovery checkpoint که «وضعیت ذخیره‌شده» نام دارد، در همان تراکنش DB نسخه canonical load_workspace همراه Revision و کنترل تعارض انتخاب شود و Backup و reference index اتمیک ثبت شوند. پیش‌نویس‌های ذخیره‌نشده فقط با عنوان/گزینه مستقل Export Draft قرار گیرند. رفتار Backup Before Restore، حفظ Asset و رمزگشایی Snapshot در هر دو backend بررسی شود. از فعال‌کردن pruning خودکار بدون تأیید مالک خودداری شود.

**مراجع:** [index.html#L5777-L5789](https://github.com/comboci/NSP-Portfolio-Builder/blob/dd5ccf594c0d41c696250b3e3949ceb580983e71/index.html#L5777-L5789)، [index.html#L5867-L5867](https://github.com/comboci/NSP-Portfolio-Builder/blob/dd5ccf594c0d41c696250b3e3949ceb580983e71/index.html#L5867-L5867)، [src-tauri/src/main.rs#L359-L397](https://github.com/comboci/NSP-Portfolio-Builder/blob/dd5ccf594c0d41c696250b3e3949ceb580983e71/src-tauri/src/main.rs#L359-L397).

### FND-021 / TASK-044 — دکمه خروجی بازیابی هنگام خطای بارگذاری ممکن است داده حافظه را جای داده واقعی معرفی کند

**وضعیت:** P1؛ یافته سورس‌محور، نیازمند بررسی Runtime مالک.

در خطای load_project_state و startup، catch index.html:5873 دکمه «خروجی JSON از داده فعلی» را به download() وصل می‌کند؛ state اولیه از localStorage یا defaultState ساخته شده و در این مسیر لزوماً از SQLite شکست‌خورده بازیابی نشده است. download() از state فعلی خروجی می‌گیرد و هیچ کپی خام از DB/WAL/Assets یا Snapshot قابل اعتبارسنجی ارائه نمی‌کند. بنابراین خروجی می‌تواند نسخه معتبر پیشین را نمایندگی نکند؛ در خطای Asset این ریسک با TASK-041 هم‌پوشانی دارد ولی مسئله پیام/منبع ریکاوری مستقل است.

**معیار پذیرش:** در خطای Startup، خروجی را صریحاً «حافظه محلی/پیش‌فرض ـ نه بازیابی از SQLite» معرفی و خطر عدم تطابق را هشدار بده؛ تا بازیابی معتبر صورت نگرفته از ذخیره خودکار و ادعای موفقیت جلوگیری کن. مسیر امن و فقط‌خواندنی برای نگهداری کپی واقعی storage/ شامل SQLite/WAL/SHM و assets و/یا raw persisted payload طراحی کن؛ اگر خواندن ممکن نیست راهنمای بازیابی کامل بده؛ نه دیتابیس قبلی بازنویسی شود و نه خروجی ساختگی به عنوان Backup اصلی ارائه شود.

**مراجع:** [index.html#L556-L564](https://github.com/comboci/NSP-Portfolio-Builder/blob/dd5ccf594c0d41c696250b3e3949ceb580983e71/index.html#L556-L564)، [index.html#L1544-L1547](https://github.com/comboci/NSP-Portfolio-Builder/blob/dd5ccf594c0d41c696250b3e3949ceb580983e71/index.html#L1544-L1547)، [index.html#L5869-L5873](https://github.com/comboci/NSP-Portfolio-Builder/blob/dd5ccf594c0d41c696250b3e3949ceb580983e71/index.html#L5869-L5873).

### FND-022 / TASK-045 — Rollback پایگاه داده نمی‌تواند فایل‌های موقت یا Asset منتشرشده را خودکار برگرداند

**وضعیت:** P2؛ یافته سورس‌محور، نیازمند بررسی Runtime مالک.

media_store::store_file تصویر immutable را در assets/{hash}.pending نوشته و پیش از اتمام transaction دیتابیس به assets/{hash}.{ext} rename می‌کند. سپس INSERT جدول asset_files و سایر مراحل save_project/save_page ممکن است rollback شوند. بنابراین فایل فیزیکی یا pending می‌تواند بدون رکورد نهایی باقی بماند. این خطر orphan/storage growth است، نه اثبات پاک‌شدن تصویر دارای ارجاع؛ GC عمداً طبق N-07 خاموش است.

**معیار پذیرش:** گزارش read-only از .pending و فایل‌های بدون ارجاع SQLite (در تمام workspace/backup/legacy referenceها) و سیاست staging/recovery در Startup طراحی کن؛ پس از خطا علت و شمار Orphanهای احتمالی قابل مشاهده باشد. هیچ حذف خودکار فایل واقعی، Asset مشترک یا Snapshot بدون قرارداد مالکیت کامل، تأیید بازیابی مالک و سیاست مصوب مجاز نیست. مسیر crash و rollback/commit failure را مالک بررسی کند، بدون فعال‌کردن GC ناایمن.

**مراجع:** [src-tauri/src/media_store.rs#L30-L56](https://github.com/comboci/NSP-Portfolio-Builder/blob/dd5ccf594c0d41c696250b3e3949ceb580983e71/src-tauri/src/media_store.rs#L30-L56)، [src-tauri/src/main.rs#L111-L124](https://github.com/comboci/NSP-Portfolio-Builder/blob/dd5ccf594c0d41c696250b3e3949ceb580983e71/src-tauri/src/main.rs#L111-L124)، [src-tauri/src/main.rs#L214-L290](https://github.com/comboci/NSP-Portfolio-Builder/blob/dd5ccf594c0d41c696250b3e3949ceb580983e71/src-tauri/src/main.rs#L214-L290).

### کنترل‌های موجود و دامنه باقی‌مانده

- **Save Page / Save Project:** تفکیک تراکنشی Native و CAS در N-06 (TASK-036) از نظر سورس وجود دارد. مشکلات صف خطا و چندتب مرورگر پیش‌تر در TASK-038 و TASK-039 ثبت شده‌اند؛ این مرحله آن‌ها را تکرار نکرد.
- **Autosave / Dirty / Leave:** نسخه V125 برای ناوبری Sidebar محافظت اضافه کرده است، اما checkbox خاموش/روشن Autosave، prompt سه‌گزینه‌ای تمام خروجی‌های صفحه و محافظت کامل Window Close در TASK-023 باز است. `beforeunload` فقط pending/error/template drafts را می‌سنجد و نباید «تأیید Native Close» فرض شود.
- **Backup:** در N-07 سیاست نگهداری پیش‌فرض بدون حذف است و `inspect_backup` برای صحت بایت‌ها/هش و index فراهم است؛ اجرای Restore واقعی و تأیید مالک ثبت نشده. بکاپ خودکار فقط در Save Project ساخته می‌شود، نه Save Page؛ این یک محدودیت طراحی مستند N-06 است و باید در پذیرش TASK-036/037 از نظر تازگی Recovery Point بازبینی شود، نه اینکه بدون تصمیم مالک سیاست بکاپ مخفیانه تغییر کند.
- **WAL و فولدر:** `main.rs` از WAL و busy_timeout استفاده می‌کند. کپی مطمئن خارج برنامه باید SQLite، فایل‌های WAL/SHM (در صورت وجود) و کل `assets/` را با برنامه بسته در بر بگیرد؛ هیچ بکاپ آنلاین/Crash-Test اجرا نشده است.
- **Asset:** ذخیره فیزیکی به‌صورت immutable است؛ `fs::sync_all` برای فایل موقت وجود دارد، اما Rollback SQLite فایل قبلاً منتقل‌شده را بازنمی‌گرداند. مطابق Q-005 و N-07 هیچ پاکسازی فیزیکی خودکار پیشنهاد/انجام نشد.

**پیگیری:** ۴ تسک مستقل جدید TASK-042..TASK-045 به `open_state.next_work_record_ids` اضافه شدند تا زمان‌بندی موجود بتواند انتخابشان کند. هیچ تسکی به completed ارتقا نیافت و هیچ تأیید کاربر جعل نشد. **Checkpoint: OBS-048. نوبت بعد با N: فاز 03 — Import/Export.**
