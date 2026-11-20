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
| 03 | Import/Export (JSON، پروژه/پورتفولیو، وابستگی‌ها، سازگاری نسخه، برخورد شناسه‌ها) | **انجام شد: سورس‌محور، بدون Build/Test** |
| 04 | UI/UX پروژه‌ها، ناوبری، صفحات، Dockها، Responsive و دسترس‌پذیری | **انجام شد: سورس‌محور، بدون Build/Test** |
| 05 | موتور طراحی، Template inheritance، Region Block، Layer/Group، history، snapping و Transform | **انجام شد: سورس‌محور، بدون Build/Test** |
| 06 | Image Library، مالکیت خصوصی/عمومی، Assetها، Tile/Stash، crop/mask، حذف ایمن | **انجام شد: سورس‌محور، بدون Build/Test** |
| 07 | PDF/Print، صفحه‌بندی، DPI، Preflight، مقیاس و برابری رندر | **انجام شد: سورس‌محور، بدون Build/Test** |
| 08 | کارایی، حافظه، امنیت ورودی، خطایابی و پایداری، کارهای چندپنجره‌ای | **نوبت بعد با N** |
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


## خروجی فاز 03 — Import/Export پروژه و پورتفولیو

مبنای بازبینی: `621a3c9485d57bfa14af430f5559f6787562ee08`، سورس V126 / SQLite schema 12. فایل‌های `index.html`، شروع پروژه PES-14، TASK-001 تا TASK-045، قواعد و تصمیم‌های مالک بررسی شدند. مطابق DEC-006 هیچ Build/Test/Static Check یا Runtime اجرا نشده و هیچ فایل محصولی تغییر نکرده است.

| اولویت | Finding | Task | موضوع |
| --- | --- | --- | --- |
| P0 | FND-023 | TASK-046 | خروجی قدیمی یک پورتفولیو می‌تواند پروژه‌های دیگر را نیز افشا کند |
| P1 | FND-024 | TASK-047 | هم‌نام بودن شناسه یا Hash تصویر می‌تواند تصویر اشتباهی را در Import جایگزین کند |
| P1 | FND-025 | TASK-048 | وابستگی قالب و استایل با شناسه موجود سنجیده می‌شود، نه با محتوای واقعی آن |
| P1 | FND-026 | TASK-049 | نتیجه نرمال‌سازی Import پورتفولیو دور ریخته می‌شود |
| P2 | FND-027 | TASK-050 | خروجی بزرگ‌تر از ۸۰MiB تولید می‌شود ولی همان Import آن را رد می‌کند |
| P2 | FND-028 | TASK-051 | Import از بکاپ چندپورتفولیویی بدون انتخاب کاربر فقط اولین پورتفولیو را برمی‌دارد |

### FND-023 / TASK-046 — خروجی قدیمی یک پورتفولیو می‌تواند پروژه‌های دیگر را نیز افشا کند

**اولویت P0؛ بررسی سورس‌محور، بدون تأیید اجرایی.**

Legacy v30ExportPortfolio copies the entire current state, narrows snapshot.portfolios but retains projectWorkspaces and other unrelated project/global fields. The v28/v29 portfolio action still invokes this legacy function. A file presented as one portfolio can therefore contain private records and assets belonging to other projects. The scoped v111ExportPortfolio is a separate implementation; no runtime execution was performed.

**معیار پذیرش:** Replace all accessible single-portfolio export entry points with a single scoped serializer and versioned envelope; whitelist only the requested portfolio, permitted dependencies and explicitly intended assets. Exclude projectWorkspaces, unrelated portfolios, inactive-project image libraries and private content. Provide a privacy/content-manifest preview and source-only review of every export entry. Owner verifies export JSON on a multi-project fixture; no loss of project-level full-backup feature.

**مراجع سورس:** [index.html#L5245-L5248](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L5245-L5248)، [index.html#L5546-L5559](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L5546-L5559)، [index.html#L1051-L1066](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L1051-L1066)

### FND-024 / TASK-047 — هم‌نام بودن شناسه یا Hash تصویر می‌تواند تصویر اشتباهی را در Import جایگزین کند

**اولویت P1؛ بررسی سورس‌محور، بدون تأیید اجرایی.**

Portfolio export includes publicImages id/hash/src, but portfolio import skips all source-content checks when a public image with the same ID exists at destination (if(publicAsset)continue). Private-image dedupe also trusts declared a.hash===imported.hash before validating actual imported.src bytes. Cross-installation ID/hash collisions or manipulated metadata may silently bind a different image. This is independent of TASK-041 missing-file load.

**معیار پذیرش:** Validate each imported image's decoded bytes against a trusted computed SHA-256 (when supported) and validate source/destination identity before using an existing public ID. If same ID has different content reject with an actionable conflict or use explicit safe remap to matching immutable asset; do not silently alias. Never trust the backup's hash field without verifying its bytes; include Tile/Stash, project/private/public scopes and previous backups in owner-run review.

**مراجع سورس:** [index.html#L1381-L1390](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L1381-L1390)، [index.html#L1435-L1455](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L1435-L1455)، [index.html#L1942-L1946](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L1942-L1946)

### FND-025 / TASK-048 — وابستگی قالب و استایل با شناسه موجود سنجیده می‌شود، نه با محتوای واقعی آن

**اولویت P1؛ بررسی سورس‌محور، بدون تأیید اجرایی.**

Project export explicitly drops globalTemplates and styleLibrary and only sets requiresSharedCatalog:true; portfolio export has no shared-catalog revision/fingerprint manifest. Project import substitutes the destination global catalog; the normalizer verifies referenced IDs exist but not that same-ID templates, section designs, styles, or inherited scene content match those used at export. Portfolio import also inherits current global definitions. An imported design may therefore be valid yet visually different without a conflict warning.

**معیار پذیرش:** Record a dependency manifest for referenced Master/Page/Section templates, section types, central styles and their revision/digests; compare at import before mutation. Preserve system-wide shared ownership (no silent catalog overwrite) and explicitly report missing, changed or same-ID/different-content dependencies. Offer reject, view exact differences or explicit reviewed mapping as owner decides; verify inherited geometry, images, style references and print parity with owner-run cross-install review.

**مراجع سورس:** [index.html#L1373-L1409](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L1373-L1409)، [index.html#L1381-L1390](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L1381-L1390)، [index.html#L1455-L1465](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L1455-L1465)، [index.html#L518-L548](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L518-L548)

### FND-026 / TASK-049 — نتیجه نرمال‌سازی Import پورتفولیو دور ریخته می‌شود

**اولویت P1؛ بررسی سورس‌محور، بدون تأیید اجرایی.**

The portfolio import builds next, calls v13NormalizeProject(normalized), then discards its returned deep-cloned normalized state. It commits target.portfolios with the earlier clone, even when normalization would supply missing legacy defaults (for instance visualObjects/layers/page fields). A later native Save Page requires a normalized page. This is a source-level mismatch; actual failure depends on imported legacy input.

**معیار پذیرش:** Use the returned normalized result or explicitly canonicalize the imported portfolio and image additions before any target mutation; maintain new IDs and rebinding provenance. Invalid input must leave target untouched; accepted legacy records must be immediately usable by Save Page, Save Project, render, undo/redo and reopen without reliance on a subsequent restart normalization.

**مراجع سورس:** [index.html#L1429-L1465](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L1429-L1465)، [index.html#L468-L469](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L468-L469)، [index.html#L537-L549](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L537-L549)، [src-tauri/src/main.rs#L208-L225](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/src-tauri/src/main.rs#L208-L225)

### FND-027 / TASK-050 — خروجی بزرگ‌تر از ۸۰MiB تولید می‌شود ولی همان Import آن را رد می‌کند

**اولویت P2؛ بررسی سورس‌محور، بدون تأیید اجرایی.**

v111BackupJSON emits arbitrary-sized JSON blobs (including base64 media), but v111ReadBackup always rejects files larger than 80 MiB. A valid project/portfolio exported by this application may be impossible to import using its matching scoped command; the restriction is not disclosed before export.

**معیار پذیرش:** Define a symmetric, documented size contract: preflight/reject or stream/chunk/export package with compatible limits, preserve hash/asset integrity and show a clear size warning before download. Round-trip check with small/large single-portfolio and project files in owner runtime; never truncate images or silently drop dependencies.

**مراجع سورس:** [index.html#L1314-L1332](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L1314-L1332)، [index.html#L1373-L1390](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L1373-L1390)

### FND-028 / TASK-051 — Import از بکاپ چندپورتفولیویی بدون انتخاب کاربر فقط اولین پورتفولیو را برمی‌دارد

**اولویت P2؛ بررسی سورس‌محور، بدون تأیید اجرایی.**

When a source is not kind NSP-Portfolio-Backup, v111ImportPortfolio accepts backup.state?.portfolios?.[0]. A full workspace JSON containing multiple portfolios silently selects index 0 regardless of the intended portfolio, and the confirmation names only this selected one. A project export uses a different envelope. No author intent is inferred from a file just because it contains a state object.

**معیار پذیرش:** Enforce known backup envelopes, and if importing from a full-workspace/multi-portfolio file, require an explicit selection by stable ID and display project/portfolio title and count; reject ambiguous or mismatched formats without mutating existing projects. Preserve backward compatibility only through an explicit documented migration path.

**مراجع سورس:** [index.html#L1418-L1432](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L1418-L1432)، [index.html#L1373-L1390](https://github.com/comboci/NSP-Portfolio-Builder/blob/621a3c9485d57bfa14af430f5559f6787562ee08/index.html#L1373-L1390)

### پوشش قبلی و مواردی که دوباره تسک نشدند

- `TASK-026`: محل منوهای contextual Import/Export/Print و ورود پروژه/پورتفولیو در سورس V111 وجود دارد، اما تا تأیید مالک در وضعیت in_progress باقی می‌ماند. این مرحله روی شکاف‌های واقعی قرارداد داده، امنیت و سازگاری متمرکز بود.
- `TASK-039`: تعارض نسخه IndexedDB بین تب‌ها؛ با اشکال‌های Import/Export جدید تکرار نشد.
- `TASK-043`: تطبیق named backup با Revision پایدار SQLite؛ متفاوت از امنیت فایل پورتفولیو و واردکردن Assetهاست.
- `TASK-007` و `TASK-037`: مالکیت و بازیابی Image Asset / نگهداری بکاپ؛ هیچ کد حذف فیزیکی یا GC تجویز نشد.
- تبعات احتمالی Cross-installation و تصاویر/قالب‌های هم‌شناسه به‌عنوان ریسک سورس مستندند، نه مشاهده خرابی در اجرا. 

**Checkpoint:** OBS-049. تسک‌های TASK-046، TASK-047، TASK-048، TASK-049، TASK-050، TASK-051 به `open_state.next_work_record_ids` اضافه شدند؛ نسخه نرم‌افزار، SQLite schema، تاریخچه و وضعیت Acceptance تغییری نکرد. **مرحله بعد با N: فاز 04 — UI/UX پروژه‌ها، ناوبری، Dock و دسترس‌پذیری.**


## خروجی فاز 04 — UI/UX پروژه‌ها، صفحات، Dock، Responsive و دسترس‌پذیری

HEAD مبنای بررسی: `c710ae870fe438f3ef63ed6740e2f820eb97a7ca`؛ سورس V126 و SQLite schema 12. سورس زنده، CSS/HTML/JS مربوط به مدیریت پروژه‌ها، منوی اصلی، نوار صفحات، Dock/Pin/Auto-hide، واکنش‌گرایی و کنترل‌های صفحه‌کلید با TASK-001 تا TASK-051 تطبیق شد. مطابق DEC-006 هیچ Build/Test/Static Check و تأیید اجرایی انجام نشده؛ هیچ فایل محصولی تغییر نکرد.

| اولویت | Finding | Task | نقص مستقل |
| --- | --- | --- | --- |
| P1 | FND-029 | TASK-052 | جابه‌جایی صفحات با Save Page انجام می‌شود و ترتیب پایدار ممکن است ثبت نشود |
| P1 | FND-030 | TASK-053 | مسیر Print پیش از پایان ناوبری ناهمگام، پیش‌نمایش را می‌خواند |
| P2 | FND-031 | TASK-054 | نوار کناری ۲۳۵ پیکسلی در عرض کوچک همچنان ثابت می‌ماند |
| P2 | FND-032 | TASK-055 | بازشدن پروژه‌ها و نقش دکمه در کارت صفحه فاقد ساختار و فوکوس مناسب است |
| P2 | FND-033 | TASK-056 | انتخاب فایل پروژه و تصاویر با ورودی مخفی از مسیر Tab قابل دستیابی نیست |

### FND-029 / TASK-052 — جابه‌جایی صفحات با Save Page انجام می‌شود و ترتیب پایدار ممکن است ثبت نشود

**اولویت P1؛ یافته سورس‌محور (Runtime تأیید نشده).**

In project-mode thumbnail sidebar, v85MovePage mutates state.pages order but invokes generic save(). When the page editor is active, save() dispatches to V.queuePageSave and the native save_page transaction updates one page payload, not workspace_pages.position or global portfolio order. The UI then renders the reordered list and may report a successful page save although the structural order can revert on reload. Previous TASK-022/TASK-025 cover UI functionality and TASK-036 the Save separation, but none explicitly tracked this call-site regression.

**معیار پذیرش:** Treat thumbnail arrow/drag reorder as project-structure change: await durable full Save Project, or add an explicit revision-guarded atomic order-change API; do not route through scoped Save Page. Block repeated drag/arrow actions until ACK, preserve original order on write failure, keep current editor/selection and Undo semantics, and verify order after reopen across portfolios and browsers (owner-run).

**شواهد:** [index.html#L3805-L3814](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L3805-L3814)، [index.html#L3820-L3820](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L3820-L3820)، [index.html#L3843-L3850](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L3843-L3850)، [index.html#L5724-L5725](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L5724-L5725)، [src-tauri/src/main.rs#L208-L285](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/src-tauri/src/main.rs#L208-L285)، [src-tauri/src/project_store.rs#L388-L403](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/src-tauri/src/project_store.rs#L388-L403)

### FND-030 / TASK-053 — مسیر Print پیش از پایان ناوبری ناهمگام، پیش‌نمایش را می‌خواند

**اولویت P1؛ یافته سورس‌محور (Runtime تأیید نشده).**

V125 changed go(destination) to an async leave guard that may await page persistence or master/section draft confirmation. Legacy v30PrintPortfolio swaps state.pages, calls go('preview') without awaiting the promise, then immediately queries '#app .print-zone', creates a print snapshot and restores state.pages in finally. From an edited page with pending save/draft, printing can inspect stale DOM or fail while navigation continues later; a rejected leave must not produce a misleading print snapshot. The generic printAll preflight also calls go('preview') without awaiting.

**معیار پذیرش:** Refactor print/preview entry points to await a single navigation/persistence result and obtain an immutable selected-portfolio snapshot only after guards resolve; if canceled or backend fails, do not change page state or print. Ensure preflight executes on that exact snapshot, avoid concurrent navigation/race with project switching, and owner-check browser/Tauri print/preview from editing, other screens and cancellation.

**شواهد:** [index.html#L4590-L4613](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L4590-L4613)، [index.html#L5561-L5586](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L5561-L5586)، [index.html#L5426-L5435](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L5426-L5435)، [index.html#L1471-L1477](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L1471-L1477)

### FND-031 / TASK-054 — نوار کناری ۲۳۵ پیکسلی در عرض کوچک همچنان ثابت می‌ماند

**اولویت P2؛ یافته سورس‌محور (Runtime تأیید نشده).**

The main .shell stays grid-template-columns:235px minmax(0,1fr)!important even below the 850px and 650px media breakpoints. The breakpoint changes nav contents into two columns but does not stack/collapse the parent side rail. The 165px page thumbnail sidebar and designer dock remain inside the now narrower main column. This is a concrete source-level responsive-layout gap; exact overflow and usability are not runtime-verified. Native Tauri minWidth is 800px, but browser and constrained window widths still need a contract.

**معیار پذیرش:** At appropriate viewports collapse the outer shell into full-width navigation/accessible drawer and full-width content; keep physical-left Dock and right-hand page thumbnails without clipping. Provide an explicit responsive layout policy for 800px native minimum and narrow browser view; verify focus, scroll, touch, action menus and canvas at 1280/1024/800/650/390px with owner-run review.

**شواهد:** [index.html#L2-L3](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L2-L3)، [index.html#L5529-L5532](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L5529-L5532)، [index.html#L5479-L5494](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L5479-L5494)، [src-tauri/tauri.conf.json](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/src-tauri/tauri.conf.json#Lundefined)

### FND-032 / TASK-055 — بازشدن پروژه‌ها و نقش دکمه در کارت صفحه فاقد ساختار و فوکوس مناسب است

**اولویت P2؛ یافته سورس‌محور (Runtime تأیید نشده).**

Project expand/collapse buttons display only +/− with aria-expanded but no project-specific accessible name/controlled-region reference; v77ToggleProject calls render() which replaces #nav and #app via innerHTML without restoring the clicked control's focus. Page thumbnail items are div role=button/tabindex=0 while containing actual action buttons for reorder/copy/delete, making nested interactive structure confusing for keyboard/screen-reader navigation. Pointer/keyboard click routing exists but semantic/focus continuity is not guaranteed.

**معیار پذیرش:** Give expander controls an accessible project-specific name, aria-controls and stable controlled-region identity; preserve/reposition focus and announce expanded state after render. Use a separate focusable page-select button plus sibling action buttons instead of an interactive div containing buttons; indicate selected page accessibly, preserve keyboard arrow/reorder, and validate screen-reader, Tab/Shift+Tab and focus after row refresh (owner-run).

**شواهد:** [index.html#L1147-L1150](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L1147-L1150)، [index.html#L1491-L1496](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L1491-L1496)، [index.html#L1507-L1527](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L1507-L1527)، [index.html#L3784-L3803](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L3784-L3803)، [index.html#L3815-L3830](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L3815-L3830)

### FND-033 / TASK-056 — انتخاب فایل پروژه و تصاویر با ورودی مخفی از مسیر Tab قابل دستیابی نیست

**اولویت P2؛ یافته سورس‌محور (Runtime تأیید نشده).**

The system-level project import uses a <label class=btn> wrapping a file input with hidden; private/public Image Library uses the same label + input style='display:none' pattern. Neither label is focusable by default, and the hidden input is not in normal keyboard Tab order; pointer clicking a label can open the picker but a keyboard-only user lacks an equivalent focusable upload control. This is independent of the persisted import data contracts covered by TASK-026 and phase 03.

**معیار پذیرش:** Provide actual focusable buttons that invoke hidden file input via explicit ref/click, or a labeled visually-hidden focusable file input with robust focus and key handling. Supply accessible names, accepted-file descriptions, error announcements and focus restoration after cancellation/upload; owner-check keyboard and screen-reader usage for system project Import, private and public image imports.

**شواهد:** [index.html#L572-L572](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L572-L572)، [index.html#L834-L848](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L834-L848)، [index.html#L850-L859](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L850-L859)، [index.html#L1311-L1332](https://github.com/comboci/NSP-Portfolio-Builder/blob/c710ae870fe438f3ef63ed6740e2f820eb97a7ca/index.html#L1311-L1332)

### موارد موجود که تسک تکراری ندارند

- **TASK-022/024/025:** یکپارچه‌سازی فهرست پروژه، thumbnail و ویرایشگر همچنان in_progress و نیازمند بررسی Runtime مالک است؛ تسک‌های جدید صرفاً نقص‌های جداگانه Save Scope/ARIA/Responsive را پوشش می‌دهند.
- **TASK-023 و TASK-036:** Autosave Checkbox، Save/Discard/Cancel و تفکیک Save Page/Save Project از قبل ثبت شده‌اند. نواقص جدید Call-Site مستندند و به این تسک‌ها لینک شدند.
- **TASK-008 و TASK-026:** تعارض Print/Navigation در فاز 04 ثبت شد؛ فاز 07 در N آینده بر برابری PDF، اندازه/حاشیه و DPI تمرکز می‌کند تا دوباره‌کاری نشود.
- **TASK-030:** در `index.html:1` متای `application-version=125` با عنوان و نسخه محصول `V126` ناسازگار است؛ چون TASK-030 موجود است، تسک جدید ساخته نشد. نیازمند هماهنگی source markers است و هیچ تستی انجام نشده.
- Dock دارای profile مستقل، keyboard arrow navigation، pin/hover و reduced-motion branch در سورس است؛ بدون اجرای واقعی نمی‌توان آن را پذیرفته یا رد کرد. بررسی هدفمند Runtime مالک برای فضای کوچک و focus پیشنهاد شده است.

**Checkpoint:** OBS-050؛ TASK-052، TASK-053، TASK-054، TASK-055، TASK-056 در `open_state.next_work_record_ids` ثبت شد. هیچ رکورد قدیمی حذف یا Completed نشد؛ هیچ source/product version تغییر نکرد. **مرحله بعد با N: فاز 05 — موتور طراحی، ارث‌بری، Layers/Groups، History، Snapping و Transform.**


## خروجی فاز 05 — موتور طراحی، ارث‌بری و هندسه

**مبنای ممیزی سورس:** `1207b87689523ff3b095df45ade70217b9b0838b`؛ محصول V126 / SQLite schema 12. با TASK-001..TASK-056، الزامات ارث‌بری، Region Block، Group، Smart Duplicate، Align/Distribute، Transform، Snap و Undo/Redo تطبیق شد. بدون اجرای برنامه و بدون تغییر کد محصول.

| اولویت | Finding | Task | نقص مستقل |
| --- | --- | --- | --- |
| P1 | FND-034 | TASK-057 | Resize با ماوس می‌تواند فرزندان Region Block را بیرون قاب باقی بگذارد |
| P1 | FND-035 | TASK-058 | تراز و تکثیر هوشمند محدوده چرخش و Pivot را کنترل نمی‌کنند |
| P2 | FND-036 | TASK-059 | Snap راهنما با Clamp مستقل می‌تواند شکل گروه را تغییر دهد |
| P2 | FND-037 | TASK-012 (از قبل موجود) | History از تغییر راهنماها، پس‌زمینهٔ صفحه و Legacy Flow بی‌خبر است؛ بدون تسک تکراری |

### FND-034 / TASK-057 — Resize با ماوس می‌تواند فرزندان Region Block را بیرون قاب باقی بگذارد

**P1، یافته سورس‌محور؛ Runtime تأیید نشده.**

The numeric property() path checks every existing Block child against the proposed frame after any x/y/w/h change. However pointerMove for a Region Block builds child patches only when blockResizeMode==='proportional'. In the 'frame' resize mode, changes contains only the Block; its frame passes v98BoundsValid but unchanged children are never checked against the new frame. A top/left/right/bottom frame shrink can therefore leave an attached child outside the Block, despite the document/Block containment invariant. No runtime repro was performed.

**معیار پذیرش:** Apply one shared atomic frame/child validation for pointer and numeric transforms. In frame mode keep children at the intended absolute position, refuse any resize that would exclude a descendant (or offer an explicit user-selected containment behavior), and never commit an out-of-Block child. Preserve proportional mode and locked descendants; honor pointer cancel, Undo/Redo, Save Page, reopen and owner-run Windows/browser checks.

**شواهد:** [index.html#L2513-L2516](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L2513-L2516)، [index.html#L3990-L4002](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L3990-L4002)، [index.html#L4044-L4055](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L4044-L4055)، [index.html#L4263-L4272](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L4263-L4272)، [index.html#L4280-L4322](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L4280-L4322)

### FND-035 / TASK-058 — تراز و تکثیر هوشمند محدوده چرخش و Pivot را کنترل نمی‌کنند

**P1، یافته سورس‌محور؛ Runtime تأیید نشده.**

property() uses v98BoundsValid to check the four rotated/flipped corners around transformPivot. In contrast, v97Duplicate preflights only nx,ny,nx+w,ny+h and v96Apply preflights only x,y,x+w,y+h against document/Block bounds. For rotated objects near document/Region Block edges, a copied or aligned object may pass these axis-aligned checks even while its rendered transformed corners exceed the clipping surface; the aligned bounds also use raw w/h rather than visual bounding boxes. This gap is source-supported; exact UI outcome is pending runtime review.

**معیار پذیرش:** Use a common transformed-corner validator for every changed object in Align, Distribute and Smart Duplicate; include rotation, flip, pivot and Region Block parent (including cloned parent). Make visual alignment semantics explicit for rotated objects, preflight every affected object before mutation, reject invalid operations without changing scene/history/save and owner-check with rotated/flip/multi-selection at page and Block borders.

**شواهد:** [index.html#L2625-L2639](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L2625-L2639)، [index.html#L2747-L2832](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L2747-L2832)، [index.html#L3990-L4002](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L3990-L4002)، [index.html#L4044-L4047](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L4044-L4047)

### FND-036 / TASK-059 — Snap راهنما با Clamp مستقل می‌تواند شکل گروه را تغییر دهد

**P2، یافته سورس‌محور؛ Runtime تأیید نشده.**

pointerMove represents a Group/multi-selection movement with a common dx/dy. v83SnapMoves chooses one x and y correction but then clamps each child's values.x and values.y independently to page edges. If a selection spans the page width and a guide matches one member, another member against the opposite edge may be clamped while its peer moves. That silently changes relative distances despite an intended rigid group translation, and the later validator checks each object's bounds but not pairwise offsets.

**معیار پذیرش:** Compute one legal shared snap delta by intersecting allowable x/y translation ranges of all affected members/Region Block parents. If the best guide correction would alter member spacing, ignore or reduce the snap for the whole selection, never clamp individuals separately. Preserve locked members and group/Block semantics, and check group spacing and Undo after an edge snap with owner-run runtime validation.

**شواهد:** [index.html#L2507-L2532](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L2507-L2532)، [index.html#L3101-L3121](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L3101-L3121)، [index.html#L4263-L4272](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L4263-L4272)، [index.html#L4309-L4322](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L4309-L4322)

### FND-037 — History از تغییر راهنماها، پس‌زمینهٔ صفحه و Legacy Flow بی‌خبر است (پیگیری در TASK-012)

objectSnapshot and v91ContentSnapshot track objects, styles and layer/order fields, but not designGuides, guidesVisible or legacyLayout. v83MutateGuide and the pageBackground/content-flow handlers directly mutate the page and queue storage without calling commit(), so these edits neither create a History step nor participate in session Undo/Redo. The pageBackground handler also lacks a local rollback when the queue rejects a save before acceptance. This is an explicit gap within existing TASK-012 History scope, TASK-023/038 persistence handling and TASK-013 Guides; no duplicate new task is required.

**معیار پذیرش افزوده به TASK-012:** Extend TASK-012 acceptance to include reversible editor guide additions/deletions/moves/visibility, page background reset/color and legacy content-flow toggles with atomic history snapshots, correct redo invalidation, scoped Save Page persistence and rollback/error feedback. Preserve current session-only history and do not add zoom/pan or persisted historical metadata.

**شواهد:** [index.html#L2903-L2923](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L2903-L2923)، [index.html#L2947-L2952](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L2947-L2952)، [index.html#L3032-L3054](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L3032-L3054)، [index.html#L3399-L3414](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L3399-L3414)، [index.html#L3982-L3988](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L3982-L3988)، [index.html#L4496-L4500](https://github.com/comboci/NSP-Portfolio-Builder/blob/1207b87689523ff3b095df45ade70217b9b0838b/index.html#L4496-L4500)

### مواردی که باگ مستقل جدید نبودند

- **ارث‌بری:** `setObject/getObject` روی شیء ارثی فقط نمایش/عدم نمایش را به‌عنوان Override مجاز نگه می‌دارد و `objectOrder` امکان تنظیم ترتیب محلی را فراهم می‌کند. بدون اجرای مالک، پیاده‌سازی منبع با TASK-006 و BR-008..010 تطبیق نهایی داده نمی‌شود؛ ادعای شکست Runtime نکردیم.
- **Group/Region Block:** پیش از Drag، عضوهای هم‌گروه و فرزند Block جمع‌آوری و Lock کنترل می‌شود؛ مشکل فاز حاضر صرفاً تفاوت اعتبارسنجی Frame Resize با ماوس و Property است. TASK-010/015 عمداً تکرار نشدند.
- **History:** تاریخچه تا ۱۰۰ مرحله در حافظه جلسه پیاده شده و Zoom/Pan به‌درستی خارج از آن است؛ نقطه کور Guide و تنظیمات صفحه در FND-037 به TASK-012 موجود پیوست شد.
- **Save/Conflict:** اشکال Queue ACK قدیمی در TASK-038 و scoped Save در TASK-036 باقی است و تکرار نشد. هیچ Build/Test/Static-check/Windows/Browser یا Acceptance توسط دستیار انجام نشد.

**Checkpoint:** `OBS-051`. TASK-057، TASK-058، TASK-059 در صف اجرای زمان‌بندی ساعتی ثبت شدند. محصول و SQLite schema تغییری نکردند. **مرحله بعد با N: فاز 06 — Image Library، مالکیت، Asset، Tile/Stash، Crop/Mask و حذف ایمن.**


## خروجی فاز 06 — Image Library، مالکیت، Asset، Tile و Mask

مبنای ممیزی: `7c3a53732082f1d36e8edb5a2c1e6858ca710715`؛ V127 (SQLite schema 12). سورس `index.html`، `media_store.rs`، `image_ownership.rs`، `scene_store.rs` و Project Evolution TASK-001..059 بررسی شدند. تغییرات موازی V127 / TASK-038 حفظ شدند. هیچ Build/Test/Static Checker یا Windows/Browser runtime اجرا نشده است.

| اولویت | Finding | Task | موضوع |
| --- | --- | --- | --- |
| P0 | FND-038 | TASK-060 | کد یتیم بیرون تابع M.place موجب توقف راه‌اندازی ابزارهای تصویر می‌شود |
| P1 | FND-039 | TASK-061 | جایگزینی اصل تصویر با همان شناسه، قرارداد تغییرناپذیری Asset را نقض می‌کند |
| P2 | FND-040 | TASK-062 | تعداد زیاد ستون با Gap بزرگ باعث سلول‌های Tile بدون فضای قابل نمایش می‌شود |
| P2 | FND-041 | TASK-063 | رسم و ویرایش رأس‌های ماسک چندضلعی فقط با اشاره‌گر ممکن است |
| P2 | FND-042 | TASK-020/029 (موجود) | Crop و ابزار تنظیم تصویر باید خطای ذخیره و محدوده مقادیر را صریح نشان دهند؛ تسک تکراری ساخته نشد |

### FND-038 / TASK-060 — کد یتیم بیرون تابع M.place موجب توقف راه‌اندازی ابزارهای تصویر می‌شود

**اولویت P0، یافته سورس‌محور و فاقد تأیید اجرایی.**

After `M.place=function(id,forceNew=false){...};` closes at line 2056, duplicated placement statements remain at the IIFE top level (2057-2063). Line 2063 evaluates `if(!forceNew&&...)`, but `forceNew` is defined only as an M.place parameter, not in this outer lexical scope. The image initialization IIFE therefore throws ReferenceError during script evaluation, stopping subsequent registration of M.grid, M.markup, M.openPicker, mask/crop extensions and their event handlers. Source check found no other forceNew declaration in index.html. No runtime execution is claimed. This is not a new feature request; it is a bootstrap-blocking code defect.

**معیار پذیرش:** Remove the unreachable duplicated top-level placement block and retain one complete M.place method with the strict context/global-public authorization and frame-preserving replacement logic. Verify source script load completes, all media APIs are present, editor and global/private image pickers open, tile grid and crop/mask actions register, and no startup exception. Owner performs Windows/Tauri and browser runtime tests per DEC-006; do not run assistant Build/Test/static-check. Preserve all existing image metadata/ownership/asset files.

**شواهد:** [index.html#L2030-L2064](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L2030-L2064)، [index.html#L2064-L2112](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L2064-L2112)، [index.html#L2125-L2185](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L2125-L2185)، [index.html#L4536-L4545](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L4536-L4545)

### FND-039 / TASK-061 — جایگزینی اصل تصویر با همان شناسه، قرارداد تغییرناپذیری Asset را نقض می‌کند

**اولویت P1، یافته سورس‌محور و فاقد تأیید اجرایی.**

In M.replaceAsset, the gallery lets the user choose an unrelated file and then uses `Object.assign(old,fresh,{id})`, retaining the existing library image ID while changing src/hash and other immutable-original metadata. All page elements referencing that ID now resolve to a different image without replacing their own bindings, and ownership projections can migrate the ID to a different physical hash. Only exact public-src matches are blocked. This is a deliberate operation in the UI but contradicts BR-004/REQ-011 no direct replacement of the original image library asset and is distinct from valid element-level M.place binding replacement.

**معیار پذیرش:** Preserve the original image record and immutable source/hash/ownership under its existing ID. Change the gallery operation into an explicitly named, non-destructive workflow that imports the new file as a distinct immutable asset and offers reviewed rebinding of selected page elements/tiles without changing their frames, edits, groups, provenance or other project owners. Require confirmation and auditable mapping; never remap every occurrence silently. Undo/Redo, backups, project sharing and owners remain intact. Owner tests multi-project and shared/public scenarios; no Build/Test by assistant.

**شواهد:** [index.html#L1945-L1948](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L1945-L1948)، [index.html#L2030-L2055](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L2030-L2055)، [src-tauri/src/image_ownership.rs#L157-L171](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/src-tauri/src/image_ownership.rs#L157-L171)، [src-tauri/src/image_ownership.rs#L307-L333](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/src-tauri/src/image_ownership.rs#L307-L333)

### FND-040 / TASK-062 — تعداد زیاد ستون با Gap بزرگ باعث سلول‌های Tile بدون فضای قابل نمایش می‌شود

**اولویت P2، یافته سورس‌محور و فاقد تأیید اجرایی.**

M.grid accepts rows/cols up to 12 and gap up to 60px independently, and adjusts the object frame width/height by clamping to available document bounds. It never verifies that (cols-1)*gap fits inside the resulting object width (or rows for height). For example 12 columns × 60px gaps require 660px of horizontal gap alone, more than a 595px page; M.markup still renders a CSS grid with 12 `minmax(0,1fr)` tracks, so image cells can collapse or be clipped. The grid can remain serialized and stash referenced images despite unusable visible cells.

**معیار پذیرش:** Preflight Tile grid geometry atomically before changing rows/cols/gap or frame; require sufficient positive effective tile width/height and valid page/Region Block bounds, or offer explicit auto-scale/gap reduction with confirmation. Refuse invalid layouts without modifying cells or stash; keep all existing cell IDs and per-tile crop/filter state across grid edits and Undo. Owner checks small frames, 1×1, max 12×12, gap 0/60, landscape/portrait and reopening.

**شواهد:** [index.html#L2010-L2013](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L2010-L2013)، [index.html#L2064-L2069](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L2064-L2069)، [index.html#L2071-L2093](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L2071-L2093)، [index.html#L2105-L2112](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L2105-L2112)

### FND-041 / TASK-063 — رسم و ویرایش رأس‌های ماسک چندضلعی فقط با اشاره‌گر ممکن است

**اولویت P2، یافته سورس‌محور و فاقد تأیید اجرایی.**

M.editCustomMask creates SVG polygon/circle vertices with only pointerdown/pointermove events for adding, moving and selecting points. The vertices are SVG circles with no tabindex, keyboard handlers, accessible coordinate editor or alternative numeric per-vertex controls. A keyboard-only user can open the dialog and remove/clear points via buttons but cannot construct or move the polygon vertices needed to apply a custom mask. This is a distinct image-editor accessibility gap, not a claim that the existing pointer UI fails.

**معیار پذیرش:** Provide labeled numeric X/Y percentage controls and keyboard vertex selection/add/move/delete, or an equivalent fully keyboard-operable vertex list alongside pointer drag; expose current count/selection/invalid polygon alerts accessibly. Preserve numeric validation, 3–24-point limits, close/cancel/focus restoration, per-tile mask settings, immutable source, and undo. Owner tests with keyboard/screen reader and mouse on browser/Tauri.

**شواهد:** [index.html#L2221-L2269](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L2221-L2269)، [index.html#L1994-L2008](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L1994-L2008)

### FND-042 — Crop و ابزار تنظیم تصویر باید خطای ذخیره و محدوده مقادیر را صریح نشان دهند (به TASK-020 و TASK-029 پیوست شد)

M.crop's Apply handler checks the media-context token but calls writeCell(...) and closes the dialog unconditionally, unlike editCustomMask where a false writeCell result leaves the dialog open and reports failure. M.adjust clamps only grayscale, sepia, blur and sharpen, but directly stores out-of-range zoom, x/y, brightness/contrast/saturation and radius values; frame() merely clamps them at display time, producing a mismatch between saved JSON and shown pixels. Existing TASK-020 and TASK-029 already own crop/filter semantics, and TASK-038 covers queued failure acknowledgement, so register a linked finding and enhance acceptance rather than creating a duplicate task.

**پذیرش تکمیلی:** In TASK-020/029, validate and normalize all image-edit limits before write, keep the Crop/Mask dialog open and report when writeCell rejects the edit, distinguish queue acknowledgement from synchronous enqueue, and preserve exact per-tile editor/preview/print settings with explicit rollback/retry. No assistant-run Build/Test.

**شواهد:** [index.html#L2010-L2029](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L2010-L2029)، [index.html#L2105-L2111](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L2105-L2111)، [index.html#L2263-L2274](https://github.com/comboci/NSP-Portfolio-Builder/blob/7c3a53732082f1d36e8edb5a2c1e6858ca710715/index.html#L2263-L2274)

### تطبیق قراردادهای قبلی و نقاطی که تسک جدید نشدند

- **مالکیت مستقل:** `image_project_owners` و بازسازی FK-backed references در سورس وجود دارد؛ اجازه حذف تصویر عمومی، تحت `Q-005` هنوز تصمیم‌گیری نشده است. این ممیزی هیچ حذف فیزیکی یا تغییر سیاست pruning را مجاز نمی‌داند.
- **Stash و ذخیره‌سازی:** شناسه‌های تصاویر در `tilesJson.cells` و `stash` توسط ایندکس Rust و Import traversal خوانده می‌شوند؛ نقص جدید مربوط به شرط هندسی سلول‌هاست، نه ادعای حذف قطعی Stash.
- **Missing Asset/Backup:** بازشدن پروژه با تصویر مفقود زیر `TASK-041` و گزارش فایل orphan زیر `TASK-045` باقی است؛ دوباره تسک نشد. تطبیق Content Hash در Import نیز زیر `TASK-047` است.
- **Crop/Mask:** اصلاح مستقیم فایل فیزیکی در `M.crop` انجام نمی‌شود؛ ایرادهای بازخورد رد شدن و صحت ورودی به تسک‌های قدیمی پیوست شدند.
- **Source vs Runtime:** یافتهٔ بحرانی `forceNew` از بررسی محدوده متغیر در JavaScript است؛ هیچ ادعای اجرای برنامه، Build/Test، واقعی‌شدن خرابی نصب یا تأیید مالک وجود ندارد.

**Checkpoint:** `OBS-053`؛ تسک‌های TASK-060، TASK-061، TASK-062، TASK-063 در صف `open_state.next_work_record_ids` ثبت شدند، بدون تغییر سورس محصول یا نسخه. **مرحله بعد با N: فاز 07 — PDF/Print، DPI، Preflight، صفحه‌بندی و برابری رندر.**


## خروجی فاز 07 — PDF/Print، Preflight، DPI، صفحه‌بندی و رندر

**مبنای ممیزی:** HEAD `eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07`؛ سورس V129 / SQLite schema 12. بررسی مسیر مشترک `V.renderDocument`، تنظیمات A4/A3 و `@page`، Preflight، شماره صفحه، Image Tiles/Hidden Stash، بارگذاری SVG/Font/Image، `window.print()` و محاسبه DPI. هیچ Build/Test/Static Checker یا Print/PDF واقعی اجرا نشد؛ داده/سورس محصول تغییر نکردند.

| اولویت | Finding | Task | موضوع |
| --- | --- | --- | --- |
| P1 | FND-043 | TASK-064 | Preflight یک Image Tiles سالم را تصویر گم‌شده تشخیص می‌دهد |
| P1 | FND-044 | TASK-065 | چاپ می‌تواند پس از خطای بارگذاری تصویر یا پایان Timeout بدون بازبینی نهایی اجرا شود |
| P2 | FND-045 | TASK-066 | Preflight روی شماره صفحه پنهان کاور و قاب Region Block غیرچاپی هشدار می‌دهد |
| P2 | FND-046 | TASK-029 (موجود) | DPI هشدار چاپ برای Fit/Fill/Cover از یک فرمول یکسان استفاده می‌کند؛ تسک جدید تکراری ندارد |

### FND-043 / TASK-064 — Preflight یک Image Tiles سالم را تصویر گم‌شده تشخیص می‌دهد

**اولویت P1، نتیجه بازبینی سورس (نه مشاهده Runtime).**

M.tiles creates one type=image element with tilesJson cells, without requiring a top-level assetId. M.markup renders each visible cell asset; however collectIssues unconditionally checks `o.type==='image'&&!imagePresent(o)` before entering its Tile branch. imagePresent only inspects the container's direct assetId/src/image/dataUrl. Therefore valid filled Image Tiles are flagged as missingImage and printAll blocks printing with an error, even if all visible cells resolve. The Tile branch also loops `tiles.stash`, even though stash cells are dormant and are not rendered; it treats a missing hidden image as a printable missing-image error. Confirmed from source, not runtime.

**معیار پذیرش:** Branch on valid tilesJson before applying standalone-image checks. Validate visible cells by row/column and asset identity, display helpful cell-indexed errors for required missing/broken visible assets and intentional placeholders according to the approved policy, and do not block print solely because a dormant stash item is missing (report stash integrity separately). Prevent false missingImage on the Tile container; preserve per-tile DPI, crop, group ownership, source immutability, active/stashed references and blocked printing for genuinely broken visible assets. Owner validates populated/empty/partially-filled Tile, shrink/expand stash and multi-page PDF in browser/Tauri.

**مراجع:** [index.html#L2134-L2136](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L2134-L2136)، [index.html#L2151-L2153](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L2151-L2153)، [index.html#L5337-L5344](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L5337-L5344)، [index.html#L5365-L5401](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L5365-L5401)، [index.html#L5468-L5477](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L5468-L5477)

### FND-044 / TASK-065 — چاپ می‌تواند پس از خطای بارگذاری تصویر یا پایان Timeout بدون بازبینی نهایی اجرا شود

**اولویت P1، نتیجه بازبینی سورس (نه مشاهده Runtime).**

The preflight wrapper runs collectIssues before the oldPrintAll waits for fonts and image loading. In collectIssues, a raster img is marked broken only if `img.complete&&img.naturalWidth===0`; an image still loading is not an error yet. oldPrintAll then treats both image `load` and `error` as completion; after at most four seconds via Promise.race it always calls window.print() without recalculating broken resources or presenting unresolved-image warnings. SVG <image> readiness also resolves on error. A late failure or 4-second timeout can therefore proceed to a print/PDF with missing image content despite an earlier green preflight. This is separate from TASK-053 async navigation/print selection.

**معیار پذیرش:** Use the exact immutable target print snapshot and await/decode all printable raster and SVG-linked images plus fonts, with bounded timeouts and explicit unresolved/error statuses. Re-run media/broken-resource preflight on the final snapshot immediately before window.print. Hard-block known failed required images; on timeout give a clear retry/cancel or owner-approved explicit override with affected page/asset names. Preserve TASK-053 awaited navigation, printing state cleanup, named @page settings, PDF snapshot isolation and no duplicate print invocation. Owner tests slow/failed/recovered images, fonts, remote SVG and 4+ second loads.

**مراجع:** [index.html#L1821-L1836](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L1821-L1836)، [index.html#L1872-L1879](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L1872-L1879)، [index.html#L5411-L5427](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L5411-L5427)، [index.html#L5468-L5477](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L5468-L5477)، [index.html#L5594-L5619](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L5594-L5619)

### FND-045 / TASK-066 — Preflight روی شماره صفحه پنهان کاور و قاب Region Block غیرچاپی هشدار می‌دهد

**اولویت P2، نتیجه بازبینی سورس (نه مشاهده Runtime).**

The print renderer filters out pageNumber on the first page unless `showOnFirstPage===true`, and filters out Region Block frames whenever not rendering an editor. collectIssues loops all resolved doc.objects except explicit visible/renderVisible/layerVisible flags; it does not replicate the print-only page-number or Region Block filters. An invisible first-page page-number object or an editor-only Block frame near the configured safe margin may therefore create a bounds/margin warning even when that object is not in the printable output. No runtime screen-reader/print output observed.

**معیار پذیرش:** Create a shared or derived print visibility predicate used by both renderer and preflight, parameterized by actual portfolio pageIndex. Exclude editor-only Region Block chrome and hidden cover pageNumber from printed-object bounds/margin/overflow warnings without hiding their visible child content; preserve correct sequential number values after reorder/insert/delete and owner-tested first-page checkbox behavior. Show warnings for truly visible content only; verify mixed A4/A3 portrait/landscape and templates.

**مراجع:** [index.html#L1723-L1730](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L1723-L1730)، [index.html#L1740-L1759](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L1740-L1759)، [index.html#L1785-L1801](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L1785-L1801)، [index.html#L5365-L5383](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L5365-L5383)

### FND-046 — DPI هشدار چاپ برای Fit/Fill/Cover از یک فرمول یکسان استفاده می‌کند (پیگیری در TASK-029)

v113PrintDpi calculates min(croppedPixelWidth/printFrameWidth, croppedPixelHeight/printFrameHeight)/zoom for every image and tile, without taking objectFit or actual visual image size into account. Shared frame rendering supports contain, cover, fill and none, with different effective image-to-paper scale. Example: an 800×200 px image in a 2×2 inch frame with contain is drawn 2×0.5 inches and has approximately 400 actual image pixels per printed inch, but the formula yields min(400,100)=100 and may warn below 200 DPI. Conversely, other modes can produce different effective sample densities. This is an unverified analytical example, not measured PDF output. Existing TASK-029 explicitly owns image-quality and effective-DPI warnings, so no duplicate task is created.

**پذیرش افزوده به TASK-029:** Extend TASK-029 to derive effective pixels-per-printed-inch from actual crop dimensions, zoom, SVG/frame objectFit=contain|cover|fill|none, transformed image size and paper orientation/size, per Tile and main image. Label calculated estimates and unknown source sizes honestly; owner compares Fit/Fill/Cover/None known-pixel fixtures and A4/A3 printed/PDF output. Source image originals remain immutable.

**شواهد:** [index.html#L2147-L2153](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L2147-L2153)، [index.html#L5345-L5355](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L5345-L5355)، [index.html#L5379-L5398](https://github.com/comboci/NSP-Portfolio-Builder/blob/eafe7c813ee7ffe3efb2cbf7acf5e635217b8d07/index.html#L5379-L5398)

### مسیرهای درست/ازقبل‌ثبت‌شده که تکرار نشدند

- **شماره‌گذاری:** در `V.renderObjects` متن پویا از `pageIndex` ساخته می‌شود و شماره کاور در حالت پیش‌فرض پنهان است؛ یافته این فاز مربوط به اختلاف فیلتر Preflight با رندر است، نه ادعای اینکه موتور شمارنده همیشه غلط است.
- **اندازه چاپ و رندر مشترک:** `V.pageSize` پشتیبانی A4/A3 و حالت portrait/landscape را دارد و `V.renderDocument` خروجی را با یک ساختار مشترک تولید می‌کند؛ برابری بصری فیزیکی، DPI و چاپ واقعی همچنان نیازمند پذیرش مالک است.
- **TASK-053:** مسیر قدیمی `v30PrintPortfolio` و `go('preview')` ناهمگام که در فاز 04 پیدا شد، باز است. اینجا دوباره به‌عنوان Task جداگانه ثبت نشد؛ نقص readiness رسانه‌ها بعد از اجرای Preflight مستقل است.
- **TASK-008/TASK-029:** گستره عمومی Preflight و هشدار کیفیت از قبل موجود بود؛ این ممیزی تنها نقص‌های call-site متمایز را به تسک جدید تبدیل کرده و خطای ریاضی DPI را به TASK-029 پیوند داده است.
- **TASK-041/TASK-062:** Missing immutable Asset در بارگذاری و هندسه نامعتبر Grid قبلاً ثبت شده‌اند؛ بررسی چاپِ داده مخفی `stash` نباید به حذف ناامن Asset یا حذف reference index منجر شود.

**Checkpoint:** OBS-056. TASK-064، TASK-065، TASK-066 در صف اجرای Project Evolution ثبت شدند؛ نسخه محصول، Schema و وضعیت Acceptance تغییر نکردند. **مرحله بعد با N: فاز 08 — کارایی، حافظه، امنیت ورودی، خطایابی و چندپنجره‌ای.**
