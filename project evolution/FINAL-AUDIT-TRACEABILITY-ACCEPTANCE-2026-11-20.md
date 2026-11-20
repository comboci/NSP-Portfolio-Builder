# NSP Portfolio Builder — ماتریس نهایی Traceability و پذیرش مالک

**تاریخ:** 2026-11-20  
**مخزن:** `comboci/NSP-Portfolio-Builder` / `main`  
**HEAD مبنای ماتریس:** `b7fe8c7b8795a2eb1a96639e2feeb8e899e75bbb`  
**نسخه:** V132 source candidate (Tauri 132.0.0; SQLite schema 12 unchanged); TASK-041 workspace-only missing image recovery preview; owner runtime pending  
**چارچوب:** Project Evolution PES-14.0.0، JSON V1، SQLite schema 12  
**دامنه:** TASK-001..TASK-071، FND-001..FND-053، همه REQ/BR/DEC/Q، صف ساعتی و Verification/Acceptance.

## ۱. گزارش اجرایی

Source audit V132 source candidate (Tauri 132.0.0; SQLite schema 12 unchanged); TASK-041 workspace-only missing image recovery preview; owner runtime pending; HEAD `b7fe8c7b8795a2eb1a96639e2feeb8e899e75bbb`. TASK-001..TASK-071=71، Finding 001..053=53، `4` completed (planning/source audit only)، `40` in progress، `27` planned. Verification=0, Acceptance=0.

| معیار | نتیجه |
| --- | --- |
| شماره‌های TASK پیوسته | بله، بدون شناسه جاافتاده |
| شماره‌های FND پیوسته | بله |
| ارجاع related_record_ids شکسته | 0 |
| Finding بدون Task مرتبط پس از ترمیم لینک | 0؛ FND-001/002 صرفاً ثبت اصلاح قصد مالک هستند |
| الزام فعال REQ بدون Task مرتبط | 0 |
| الزام منسوخ | REQ-003؛ Dock قدیمی کتابخانه نباید بازگردد |
| Planned Task خارج از next_work_record_ids | 0 |
| Verification ثبت‌شده | 0 |
| Acceptance ثبت‌شده | 0 |
| تصمیم سیاستی باز | `Q-005` |

**تفسیر وضعیت:** `completed` در TASK-001..004 به معنی تکمیل ممیزی/برنامه‌ریزی است، نه اجرای محصول؛ `in_progress` برای بسیاری از تسک‌ها به معنای source candidate بدون تأیید Runtime است. هیچ موردی با خواندن سورس به `Acceptance` ارتقا داده نشده است.

**ترمیم Traceability در این Commit:** 66 پیوند افزوده به تسک‌های از قبل موجود و 9 پیوند افزوده به دو Finding تاریخی؛ اصل شرح، وضعیت، تصمیم‌ها، نسخه، Migration و صف حفظ شده‌اند. نیازی به تسک اجرایی تکراری جدید شناسایی نشد.

## ۲. موانع و گیت‌های انتشار

| شناسه | وضعیت جاری | شرط گیت |
| --- | --- | --- |
| `TASK-038` | `in_progress` | اصلاح سورس و تست Runtime توسط مالک؛ Commit ≠ Acceptance |
| `TASK-046` | `in_progress` | اصلاح سورس و تست Runtime توسط مالک؛ Commit ≠ Acceptance |
| `TASK-060` | `in_progress` | اصلاح سورس و تست Runtime توسط مالک؛ Commit ≠ Acceptance |
| `Q-005` | `open` | تعیین سیاست حذف عمومی؛ بدون مجوز حذف Asset یا GC |

**قاعده انتشار:** پیش از تأیید توسط مالک، هیچ نسخه `source candidate` را «تست‌شده»، «Production-ready» یا «Accepted» معرفی نکنید. `DEC-006`: دستیار Build/Test/Static Checker اجرا نمی‌کند. در اجرای زمان‌بندی ساعتی، Commit سورس به‌تنهایی وضعیت پذیرش کاربر را تغییر نمی‌دهد. هر FAIL به تسک موجود وصل شود؛ تنها ایراد مستقلی که واقعاً در هیچ تسکی پوشش داده نشده باشد تسک جدید بگیرد.

## ۳. Traceability الزامات فعال و منسوخ

| Requirement | هدف | وضعیت | تسک‌های ردیابی مستقیم |
| --- | --- | --- | --- |
| `REQ-001` | Project CRUD and document organization | `approved_intent` | `TASK-006`، `TASK-022`، `TASK-024`، `TASK-025`، `TASK-026`، `TASK-051`، `TASK-071` |
| `REQ-002` | Library manager | `approved_intent` | `TASK-007`، `TASK-027`، `TASK-028`، `TASK-070` |
| `REQ-003` | Dockable library | `superseded` | منسوخ: نباید Dock قدیمی بازگردد |
| `REQ-004` | Dynamic image tiles | `approved_intent` | `TASK-020`، `TASK-060`، `TASK-062`، `TASK-064` |
| `REQ-005` | Tile Count convention | `approved_intent` | `TASK-020`، `TASK-062`، `TASK-064` |
| `REQ-006` | Non-destructive image editing | `approved_intent` | `TASK-020`، `TASK-021`، `TASK-029`، `TASK-060`، `TASK-063` |
| `REQ-007` | Automatic page number | `approved_intent` | `TASK-003`، `TASK-005`، `TASK-022`، `TASK-066` |
| `REQ-008` | Editor-only image object labels and library binding | `approved_intent` | `TASK-003`، `TASK-005`، `TASK-021` |
| `REQ-009` | Text Once and Image Once | `approved_intent` | `TASK-003`، `TASK-005`، `TASK-022` |
| `REQ-010` | Repeat and inheritance controls | `approved_intent` | `TASK-006`، `TASK-010`، `TASK-025`، `TASK-035` |
| `REQ-011` | Image library persistence | `approved_intent` | `TASK-007`، `TASK-021`، `TASK-041`، `TASK-061`، `TASK-069` |

## ۴. Traceability قواعد کسب‌وکار

| Rule | عنوان | تسک‌های اصلی |
| --- | --- | --- |
| `BR-001` | Page-specific once elements | `TASK-003`، `TASK-005`، `TASK-022` |
| `BR-002` | Page-number position | `TASK-003`، `TASK-005` |
| `BR-003` | Safe shared image deletion | `TASK-007`، `TASK-027`، `TASK-032`، `TASK-037` |
| `BR-004` | Image source integrity | `TASK-020`، `TASK-021`، `TASK-029`، `TASK-061` |
| `BR-005` | Permanent image ownership | `TASK-004`، `TASK-007`، `TASK-027`، `TASK-032`، `TASK-047`، `TASK-061` |
| `BR-006` | Public image ownership | `TASK-007`، `TASK-027`، `TASK-032`، `TASK-040`، `TASK-047` |
| `BR-007` | Deletion integrity | `TASK-007`، `TASK-027`، `TASK-032`، `TASK-037`، `TASK-045` |
| `BR-008` | Master template deletion | `TASK-006`، `TASK-025` |
| `BR-009` | Inherited element controls | `TASK-006`، `TASK-010`، `TASK-015` |
| `BR-010` | Live master propagation | `TASK-006`، `TASK-014`، `TASK-025` |
| `BR-011` | Portfolio page isolation | `TASK-005`، `TASK-022`، `TASK-025` |
| `BR-012` | Image object labels are not printed numbers | `TASK-003`، `TASK-005`، `TASK-021` |
| `BR-013` | Master edits versus schema migration | `TASK-002`، `TASK-006` |

**تصمیم‌های بنیادین:** DEC-001 (project-first)، DEC-002 (multiportfolio)، DEC-003 (مالکیت تصاویر)، DEC-004 (ارث‌بری)، DEC-005 (اپ دسکتاپ)، DEC-006 (عدم اجرای تست توسط دستیار)، DEC-007 (فقط پاک‌سازی داده آزمایشی مجاز)، DEC-008 (Group/lock)، DEC-009 (Save Page در برابر Save Project)، DEC-010 (Style Library مرکزی)، DEC-011 (History فقط جلسه). هیچ‌کدام در این ممیزی لغو نشدند.

## ۵. مجموعه سناریوهای پذیرش مالک

| شناسه | حوزه | تسک‌های مرتبط | وضعیت |
| --- | --- | ---: | --- |
| AT-01 | یکپارچگی نسخه، ارتقای SQLite و Backward Compatibility | 11 | ☐ اجرا نشده |
| AT-02 | پروژه، پورتفولیو، فهرست صفحات و ترتیب | 9 | ☐ اجرا نشده |
| AT-03 | نام عنصر Image، Once و شماره صفحه | 5 | ☐ اجرا نشده |
| AT-04 | ارث‌بری قالب، Style Library و وابستگی‌های مرکزی | 6 | ☐ اجرا نشده |
| AT-05 | Layer، Group، Region Block، Transform، Snapping و History | 13 | ☐ اجرا نشده |
| AT-06 | کتابخانه تصاویر، مالکیت خصوصی/عمومی و فایل اصلی تغییرناپذیر | 12 | ☐ اجرا نشده |
| AT-07 | Image Tiles، Crop/Mask، فیلتر و ویرایش غیرمخرب | 6 | ☐ اجرا نشده |
| AT-08 | Save Page/Save Project، Autosave و خطای ثبت | 9 | ☐ اجرا نشده |
| AT-09 | Browser IndexedDB CAS، تب دوم و fallback | 5 | ☐ اجرا نشده |
| AT-10 | Backup/Restore، WAL، Integrity و سناریوی فایل خراب | 10 | ☐ اجرا نشده |
| AT-11 | Import/Export کامل و scoped، محتوا، برخورد ID | 8 | ☐ اجرا نشده |
| AT-12 | Print/PDF، A4/A3، صفحه‌بندی، DPI، Preflight و readiness | 7 | ☐ اجرا نشده |
| AT-13 | ناوبری، Dock/Pin، Responsive و Accessibility | 8 | ☐ اجرا نشده |
| AT-14 | حجم بالا، سرعت، حافظه، واکنش برنامه و همزمانی | 8 | ☐ اجرا نشده |
| AT-15 | گیت انتشار و مدارک تأیید مالک | 16 | ☐ اجرا نشده |

### AT-01 — یکپارچگی نسخه، ارتقای SQLite و Backward Compatibility

**تسک‌های مرتبط:** `TASK-001`، `TASK-002`، `TASK-004`، `TASK-030`، `TASK-031`، `TASK-032`، `TASK-033`، `TASK-034`، `TASK-035`، `TASK-036`، `TASK-037`

**روش آزمایش مالک:** روی یک کپی از دیتای واقعی یا Fixture، نسخه قبلی را به نسخه جدید ارتقا دهید؛ PRAGMA schema و پوشش FK/Scene/Style/Image/Backup را با داده قبل/بعد مقایسه و مسیر بازگشت را تمرین کنید. ورژن‌های HTML/Tauri/Cargo و راهنمای کاربر را تطبیق دهید.

**شرط پذیرش:** هیچ صفحه، قالب، Asset، بکاپ یا مالکیت حذف نشده باشد؛ Release/Schema واقعی مشخص و قابل بازیابی باشد؛ چهار تسک تکمیل‌شده برنامه‌ریزی از پذیرش فنی تفکیک شوند.

**محیط پیشنهادی:** Windows/Tauri + کپی ایمن SQLite/WAL/SHM/assets

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*

### AT-02 — پروژه، پورتفولیو، فهرست صفحات و ترتیب

**تسک‌های مرتبط:** `TASK-006`، `TASK-022`، `TASK-024`، `TASK-025`، `TASK-026`، `TASK-051`، `TASK-052`، `TASK-054`، `TASK-055`

**روش آزمایش مالک:** چند پروژه با چند پورتفولیو و صفحات دارای عنوان تکراری بسازید؛ باز و بسته‌کردن پروژه، ورود به Pages، جابجایی با فلش/Drag، کپی و حذف صفحه و بازیابی پس از خروج را بررسی کنید.

**شرط پذیرش:** فقط پروژه/پورتفولیو هدف تغییر کند؛ ترتیب و Thumbnail بعد از reopen پایدار باشد؛ هیچ مسیر متناقض Visual Design/Pages یا حذف ناخواسته وجود نداشته باشد.

**محیط پیشنهادی:** Windows/Tauri و Browser

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*

### AT-03 — نام عنصر Image، Once و شماره صفحه

**تسک‌های مرتبط:** `TASK-003`، `TASK-005`، `TASK-022`، `TASK-025`، `TASK-066`

**روش آزمایش مالک:** در یک پورتفولیو ۵ صفحه بسازید، Image 1/2 و Text Once/Image Once و شماره صفحه پویا اضافه کنید؛ صفحه اول را بدون شماره نگه دارید، سپس صفحه/پورتفولیو را جابجا و حذف کنید.

**شرط پذیرش:** نام Image فقط در ویرایشگر باشد؛ Once به همان صفحه محدود بماند؛ چاپ/PDF و پیش‌نمایش شماره‌های صحیح و مستقل برای هر پورتفولیو داشته باشند.

**محیط پیشنهادی:** Browser/Windows + خروجی PDF مالک

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*

### AT-04 — ارث‌بری قالب، Style Library و وابستگی‌های مرکزی

**تسک‌های مرتبط:** `TASK-006`، `TASK-014`، `TASK-025`، `TASK-034`، `TASK-035`، `TASK-048`

**روش آزمایش مالک:** قالب مادر، فرزند، Section و استایل مرکزی بسازید؛ در پروژه‌های A/B تغییر قالب/استایل بدهید؛ نمایش و Z-Order محلی inherited element را تغییر دهید؛ Export/Import به دستگاه دارای قالب هم-ID متفاوت را بررسی کنید.

**شرط پذیرش:** هندسه/متن/استایل عنصر موروثی قفل بماند، تغییر مادر زنده پخش شود، نسخه متفاوت قالب هشدار قابل فهم دهد و کتابخانه Style فقط مرکزی باشد.

**محیط پیشنهادی:** Windows + دو پروژه/دستگاه یا Fixture جدا

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*

### AT-05 — Layer، Group، Region Block، Transform، Snapping و History

**تسک‌های مرتبط:** `TASK-009`، `TASK-010`، `TASK-011`، `TASK-012`، `TASK-013`، `TASK-015`، `TASK-016`، `TASK-017`، `TASK-018`، `TASK-019`، `TASK-057`، `TASK-058`، `TASK-059`

**روش آزمایش مالک:** Group با عضو قفل‌شده، Region Block با فرزند، Transform چرخیده، Align/Distribute، Smart Duplicate و Snap کنار لبه اجرا کنید؛ با Undo/Redo و Save/reopen مقایسه کنید؛ Cut/Copy/Paste را نیز طبق TASK-013 بازبینی کنید.

**شرط پذیرش:** قفل ارث‌بری رعایت شود، فرزند از Block خارج نشود، Snapshot تاریخچه پایدار در جلسه باشد، Snap شکل گروه را تغییر ندهد و هندسه با ذخیره بازسازی شود.

**محیط پیشنهادی:** Windows/Tauri با ویدئوی Runtime

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*

### AT-06 — کتابخانه تصاویر، مالکیت خصوصی/عمومی و فایل اصلی تغییرناپذیر

**تسک‌های مرتبط:** `TASK-004`، `TASK-007`، `TASK-027`، `TASK-028`، `TASK-032`، `TASK-033`، `TASK-040`، `TASK-041`، `TASK-045`، `TASK-047`، `TASK-060`، `TASK-061`

**روش آزمایش مالک:** در A یک عکس بسازید و به B اشتراک دهید، در C منتشر کنید؛ آلبوم‌سازی و حذف یک مالک را بررسی کنید؛ نام عمومی را از دو پنجره تغییر دهید؛ یک فایل Asset را روی کپی آزمایش عمداً مفقود/خراب کنید.

**شرط پذیرش:** اصل فایل/Hash تغییر نکند، سایر مالک‌ها پابرجا باشند، انتشار برگشت‌ناپذیر بدون تصمیم Q-005 حذف نشود، خطاها صادقانه و recovery فقط‌خواندنی باشد.

**محیط پیشنهادی:** Windows/Tauri دو پنجره + دیتای آزمایشی و کپی امن

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*

### AT-07 — Image Tiles، Crop/Mask، فیلتر و ویرایش غیرمخرب

**تسک‌های مرتبط:** `TASK-020`، `TASK-021`، `TASK-029`، `TASK-062`، `TASK-063`، `TASK-064`

**روش آزمایش مالک:** Grid های 0×1، 0×2، 1×2، افزایش/کاهش سطر و Stash، Gap بزرگ، Crop، ماسک سفارشی و تغییر تصویر یک Tile را اجرا کنید. با صفحه‌کلید رأس‌های ماسک را ویرایش کنید.

**شرط پذیرش:** Stash بی‌حذف باقی بماند، گرید خارج از قاب ساخته نشود، Cropping هر Tile مستقل و Undoable باشد، فایل اصلی ثابت بماند.

**محیط پیشنهادی:** Windows/Browser + مقایسه PDF

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*

### AT-08 — Save Page/Save Project، Autosave و خطای ثبت

**تسک‌های مرتبط:** `TASK-023`، `TASK-036`، `TASK-038`، `TASK-040`، `TASK-043`، `TASK-049`، `TASK-052`، `TASK-067`، `TASK-068`

**روش آزمایش مالک:** دو صفحه را هم‌زمان تغییر دهید؛ Ctrl+S روی یکی، Save Project روی هر دو، تغییر Draft قالب، Autosave off/on و Save/Discard/Cancel را بررسی کنید. شکست دسترسی یا تعارض را ایجاد و دوباره ذخیره کنید.

**شرط پذیرش:** Save Page فقط صفحه جاری را ذخیره کند؛ خطای قدیمی با موفقیت جدید پنهان نشود؛ project order تنها در Save ساختاری ثبت شود و قبل از خروج پیام و نتیجه ACK معتبر باشد.

**محیط پیشنهادی:** Windows/Tauri با گزارش خطا و reopen

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*

### AT-09 — Browser IndexedDB CAS، تب دوم و fallback

**تسک‌های مرتبط:** `TASK-039`، `TASK-042`، `TASK-044`، `TASK-050`، `TASK-070`

**روش آزمایش مالک:** روی یک Origin دو تب باز کنید، همزمان روی پروژه واحد تغییر دهید؛ IndexedDB را blocked/disabled کنید؛ ارتقای v1→v2 و Export/Reload اختلاف را بررسی کنید؛ فایل JSON بزرگ را فقط در محیط آزمایشی وارد کنید.

**شرط پذیرش:** نسخه قدیمی نباید جدید را overwrite کند؛ fallback بدون اطلاع و رضایت منبع معتبر عوض نکند؛ خروجی تغییرات unsaved برچسب دقیق داشته باشد.

**محیط پیشنهادی:** Browser Edge/Chrome دو Tab و DevTools مالک

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*

### AT-10 — Backup/Restore، WAL، Integrity و سناریوی فایل خراب

**تسک‌های مرتبط:** `TASK-031`، `TASK-032`، `TASK-033`، `TASK-037`، `TASK-041`، `TASK-043`، `TASK-044`، `TASK-045`، `TASK-061`، `TASK-069`

**روش آزمایش مالک:** Named/Auto backup از Revision تأییدشده بگیرید و Restore کنید. برنامه را برای کپی DB/WAL/SHM/assets ببندید؛ عمداً روی کپی آزمایشی Asset را مفقود کنید؛ وضعیت read-only و snapshot را بسنجید.

**شرط پذیرش:** داده قدیمی/مالکیت/فایل‌ها حفظ شوند، حذف خودکار پیش از تأیید مالک رخ ندهد، Restore خراب نامعتبر بماند و recovery ناقص هرگز بکاپ اصلی اعلام نشود.

**محیط پیشنهادی:** Windows/Tauri با کپی کامل و بدون دستکاری داده اصلی

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*

### AT-11 — Import/Export کامل و scoped، محتوا، برخورد ID

**تسک‌های مرتبط:** `TASK-026`، `TASK-046`، `TASK-047`، `TASK-048`، `TASK-049`، `TASK-050`، `TASK-051`، `TASK-070`

**روش آزمایش مالک:** از پروژه A با چند پورتفولیو و تصاویر خصوصی/عمومی خروجی بگیرید؛ روی محیط B با کاتالوگ متفاوت وارد کنید. JSON را برای نشتی سایر پروژه‌ها، ID collision، missing dependency و محدودیت حجم بررسی کنید.

**شرط پذیرش:** فقط داده مجاز منتقل شود، شناسه‌های مشابه با Hash/قالب متفاوت خاموش جایگزین نشوند، داده ناقص رد شود و مقصد قبلی دست‌نخورده بماند.

**محیط پیشنهادی:** دو Browser/Tauri محیط آزمایش + بررسی JSON توسط مالک

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*

### AT-12 — Print/PDF، A4/A3، صفحه‌بندی، DPI، Preflight و readiness

**تسک‌های مرتبط:** `TASK-005`، `TASK-008`، `TASK-029`، `TASK-053`، `TASK-064`، `TASK-065`، `TASK-066`

**روش آزمایش مالک:** A4/A3 افقی/عمودی، کاور بی‌شماره، عناصر چرخیده، Image Tile پر/خالی، تصاویر کند/خراب، فونت‌های متغیر و چاپ بعد از ویرایش ذخیره‌نشده را مقایسه کنید.

**شرط پذیرش:** Preview/PDF یکسان، شماره‌ها درست و مستقل، هشدار فقط برای عناصر چاپی، تصاویر خراب بلوکه و چاپ با زمان‌بندی صحیح انجام شود؛ DPI بر اساس Fit/Fill/Cover واقعی محاسبه شود.

**محیط پیشنهادی:** Windows/Tauri + PDF فیزیکی و Browser Print

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*

### AT-13 — ناوبری، Dock/Pin، Responsive و Accessibility

**تسک‌های مرتبط:** `TASK-022`، `TASK-024`، `TASK-025`، `TASK-054`، `TASK-055`، `TASK-056`، `TASK-063`، `TASK-071`

**روش آزمایش مالک:** عرض 1280/1024/800/650/390، کلیدهای Tab/Shift+Tab/Escape، Screen Reader، دکمه افزودن فایل، drag/drop و بسته شدن Flyout را در UI آزمایش کنید.

**شرط پذیرش:** هیچ کنترل مهمی خارج از دسترس نباشد، focus پس از Render حفظ شود، صفحه/تصویر هدف عوض نشود و فهرست صدها Thumbnail قابل استفاده باشد.

**محیط پیشنهادی:** Windows و Browser با صفحه‌کلید و Screen Reader

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*

### AT-14 — حجم بالا، سرعت، حافظه، واکنش برنامه و همزمانی

**تسک‌های مرتبط:** `TASK-031`، `TASK-033`، `TASK-035`، `TASK-067`، `TASK-068`، `TASK-069`، `TASK-070`، `TASK-071`

**روش آزمایش مالک:** Fixture با 10/100/500 صفحه و تصاویر تکراری/مجزا بسازید؛ load, Save Page, Save Project, switch, import و scroll را با RAM و CPU اندازه بگیرید؛ نتیجه را روی همان دستگاه و داده با نسخه قبل مقایسه کنید.

**شرط پذیرش:** بدون از دست دادن اطلاعات یا تغییر CAS، زمان تعامل و حافظه بهبود یابد؛ نه کندی بی‌نهایت، نه قفل طولانی و نه اجبار به بارگذاری همه Assetهای غیرضروری.

**محیط پیشنهادی:** Windows/Browser با ابزار اندازه‌گیری مالک

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*

### AT-15 — گیت انتشار و مدارک تأیید مالک

**تسک‌های مرتبط:** `TASK-001`، `TASK-002`، `TASK-003`، `TASK-004`، `TASK-030`، `TASK-037`، `TASK-038`، `TASK-039`، `TASK-041`، `TASK-042`، `TASK-043`، `TASK-044`، `TASK-046`، `TASK-060`، `TASK-061`، `TASK-065`

**روش آزمایش مالک:** برای هر AT، نسخه دقیق ویدئو/لاگ/تصاویر و نتیجه PASS/FAIL ثبت کنید؛ P0های TASK-038/046/060 و تصمیم Q-005 را جدا مرور کنید و از نسخه کد source-candidate با تأیید تولیدی تمایز دهید.

**شرط پذیرش:** هیچ تسک به‌علت Commit سورس تنها پذیرفته نشود؛ اولویت P0 بدون بررسی مالک رها نشود و انتشار نهایی تنها با تأیید آگاهانه کاربر مجاز باشد.

**محیط پیشنهادی:** همه محیط‌ها؛ تصمیم و مدارک مالک

**وضعیت فعلی:** ☐ اجرا نشده | ☐ PASS | ☐ FAIL | ☐ نیازمند تصمیم؛ *هیچ گزینه‌ای در این ممیزی تأیید نشده است.*


## ۶. ردیابی تک‌به‌تک همه ۷۱ تسک

| شناسه | عنوان و کار قابل بررسی | وضعیت فعلی | اولویت ثبت‌شده | سناریوی پذیرش | تأیید Runtime |
| --- | --- | --- | --- | --- | --- |
| `TASK-001` | Audit live repository and concurrent Work changes | `completed` | ثبت نشده (تسک تاریخی) | AT-01، AT-15 | برنامه‌ریزی/مرور سورس؛ نه Runtime |
| `TASK-002` | Plan safe schema evolution separately from master-template changes | `completed` | ثبت نشده (تسک تاریخی) | AT-01، AT-15 | برنامه‌ریزی/مرور سورس؛ نه Runtime |
| `TASK-003` | Verify editor image names, page numbers and page-only Once elements | `completed` | ثبت نشده (تسک تاریخی) | AT-03، AT-15 | برنامه‌ریزی/مرور سورس؛ نه Runtime |
| `TASK-004` | Align image development with new project library scopes | `completed` | ثبت نشده (تسک تاریخی) | AT-01، AT-06، AT-15 | برنامه‌ریزی/مرور سورس؛ نه Runtime |
| `TASK-005` | Implement missing editor-only image labels, page-number visibility, and page-only Once behavior | `in_progress` | ثبت نشده (تسک تاریخی) | AT-03، AT-12 | ☐ تأیید مالک ثبت نشده |
| `TASK-006` | Implement real relational projects, portfolios and global template model | `in_progress` | ثبت نشده (تسک تاریخی) | AT-02، AT-04 | ☐ تأیید مالک ثبت نشده |
| `TASK-007` | Implement multi-project image ownership and global/private library | `in_progress` | ثبت نشده (تسک تاریخی) | AT-06 | ☐ تأیید مالک ثبت نشده |
| `TASK-008` | PDF and office-print preflight | `in_progress` | ثبت نشده (تسک تاریخی) | AT-12 | ☐ تأیید مالک ثبت نشده |
| `TASK-009` | Smart guides and snapping | `in_progress` | ثبت نشده (تسک تاریخی) | AT-05 | ☐ تأیید مالک ثبت نشده |
| `TASK-010` | Region Block container | `in_progress` | ثبت نشده (تسک تاریخی) | AT-05 | ☐ تأیید مالک ثبت نشده |
| `TASK-011` | Advanced Layers panel | `in_progress` | ثبت نشده (تسک تاریخی) | AT-05 | ☐ تأیید مالک ثبت نشده |
| `TASK-012` | History panel and Undo/Redo | `in_progress` | ثبت نشده (تسک تاریخی) | AT-05 | ☐ تأیید مالک ثبت نشده |
| `TASK-013` | Design toolbar and zoom/pan | `in_progress` | ثبت نشده (تسک تاریخی) | AT-05 | ☐ تأیید مالک ثبت نشده |
| `TASK-014` | Style Library | `in_progress` | ثبت نشده (تسک تاریخی) | AT-04 | ☐ تأیید مالک ثبت نشده |
| `TASK-015` | Group/Ungroup distinct from Region Block | `in_progress` | ثبت نشده (تسک تاریخی) | AT-05 | ☐ تأیید مالک ثبت نشده |
| `TASK-016` | Align & Distribute | `in_progress` | ثبت نشده (تسک تاریخی) | AT-05 | ☐ تأیید مالک ثبت نشده |
| `TASK-017` | Smart Duplicate | `in_progress` | ثبت نشده (تسک تاریخی) | AT-05 | ☐ تأیید مالک ثبت نشده |
| `TASK-018` | Transform Panel | `in_progress` | ثبت نشده (تسک تاریخی) | AT-05 | ☐ تأیید مالک ثبت نشده |
| `TASK-019` | Object Styles & Effects | `in_progress` | ثبت نشده (تسک تاریخی) | AT-05 | ☐ تأیید مالک ثبت نشده |
| `TASK-020` | Non-destructive Image Crop & Mask | `in_progress` | ثبت نشده (تسک تاریخی) | AT-07 | ☐ تأیید مالک ثبت نشده |
| `TASK-021` | Replace Image preserving frame | `in_progress` | ثبت نشده (تسک تاریخی) | AT-07 | ☐ تأیید مالک ثبت نشده |
| `TASK-022` | Multi-Page Overview | `in_progress` | ثبت نشده (تسک تاریخی) | AT-02، AT-03، AT-13 | ☐ تأیید مالک ثبت نشده |
| `TASK-023` | Editor autosave toggle, dirty-state tracking and unsaved-exit confirmation | `in_progress` | ثبت نشده (تسک تاریخی) | AT-08 | ☐ تأیید مالک ثبت نشده |
| `TASK-024` | Simplify and visually separate Projects and expanded portfolio/page lists | `in_progress` | ثبت نشده (تسک تاریخی) | AT-02، AT-13 | ☐ تأیید مالک ثبت نشده |
| `TASK-025` | Unify portfolio Pages and Visual Design into one editor with thumbnail sidebar | `in_progress` | ثبت نشده (تسک تاریخی) | AT-02، AT-03، AT-04، AT-13 | ☐ تأیید مالک ثبت نشده |
| `TASK-026` | Restructure Import/Export/Print and page-order navigation by project context | `in_progress` | ثبت نشده (تسک تاریخی) | AT-02، AT-11 | ☐ تأیید مالک ثبت نشده |
| `TASK-027` | Complete global public image library asset rename and safe delete | `in_progress` | ثبت نشده (تسک تاریخی) | AT-06 | ☐ تأیید مالک ثبت نشده |
| `TASK-028` | Image Library albums, metadata and bulk organization | `in_progress` | ثبت نشده (تسک تاریخی) | AT-06 | ☐ تأیید مالک ثبت نشده |
| `TASK-029` | Complete missing image filters and print-resolution warnings | `in_progress` | ثبت نشده (تسک تاریخی) | AT-07، AT-12 | ☐ تأیید مالک ثبت نشده |
| `TASK-030` | Update source-level static validation to current releases and migrations | `in_progress` | ثبت نشده (تسک تاریخی) | AT-01، AT-15 | ☐ تأیید مالک ثبت نشده |
| `TASK-031` | N-01: SQLite read-query composite indexes and incremental database architecture plan | `in_progress` | ثبت نشده (تسک تاریخی) | AT-01، AT-10، AT-14 | ☐ تأیید مالک ثبت نشده |
| `TASK-032` | N-02: FK-backed private/public image usage and typed backup asset references | `in_progress` | ثبت نشده (تسک تاریخی) | AT-01، AT-06، AT-10 | ☐ تأیید مالک ثبت نشده |
| `TASK-033` | N-03: Incremental project image ownership and usage plus automatic backup reference indexing | `in_progress` | ثبت نشده (تسک تاریخی) | AT-01، AT-06، AT-10، AT-14 | ☐ تأیید مالک ثبت نشده |
| `TASK-034` | N-04: Incremental central shared_styles and FK-backed page/template text-style bindings | `in_progress` | ثبت نشده (تسک تاریخی) | AT-01، AT-04 | ☐ تأیید مالک ثبت نشده |
| `TASK-035` | N-05: Derived relational Scene/Layer/Element/Group projections with stable identities and FKs | `in_progress` | ثبت نشده (تسک تاریخی) | AT-01، AT-04، AT-14 | ☐ تأیید مالک ثبت نشده |
| `TASK-036` | N-06: Isolated atomic Save Page vs Save Project, optimistic SQLite workspace revision and lost-update protection | `in_progress` | ثبت نشده (تسک تاریخی) | AT-01، AT-08 | ☐ تأیید مالک ثبت نشده |
| `TASK-037` | N-07: Conservative automatic-backup retention, named recovery checkpoints and immutable Asset integrity auditing | `in_progress` | ثبت نشده (تسک تاریخی) | AT-01، AT-10، AT-15 | ☐ تأیید مالک ثبت نشده |
| `TASK-038` | Fail-safe queued Save Page/Save Project: never hide earlier failed writes | `in_progress` | P0 | AT-08، AT-15 | ☐ تأیید مالک ثبت نشده |
| `TASK-039` | Prevent cross-tab lost updates in Browser IndexedDB persistence | `in_progress` | P1 | AT-09، AT-15 | ☐ تأیید مالک ثبت نشده |
| `TASK-040` | Revision-guard and serialize native public image metadata rename | `in_progress` | P1 | AT-06، AT-08 | ☐ تأیید مالک ثبت نشده |
| `TASK-041` | Recover workspace metadata with an unavailable-image placeholder when assets are missing | `in_progress` | P1 | AT-06، AT-10، AT-15 | ☐ تأیید مالک ثبت نشده |
| `TASK-042` | Fail-closed browser storage selection when IndexedDB fails | `planned` | P1 | AT-09، AT-15 | ☐ تأیید مالک ثبت نشده |
| `TASK-043` | Bind named recovery backups to the canonical committed SQLite workspace revision | `planned` | P1 | AT-08، AT-10، AT-15 | ☐ تأیید مالک ثبت نشده |
| `TASK-044` | Make startup failure recovery export truthful and non-destructive | `planned` | P1 | AT-09، AT-10، AT-15 | ☐ تأیید مالک ثبت نشده |
| `TASK-045` | Audit filesystem staging after SQLite transaction failures without unsafe asset deletion | `planned` | P2 | AT-06، AT-10 | ☐ تأیید مالک ثبت نشده |
| `TASK-046` | Isolate legacy single-portfolio JSON export: prevent unrelated-project disclosure | `in_progress` | P0 | AT-11، AT-15 | ☐ تأیید مالک ثبت نشده |
| `TASK-047` | Validate imported image bytes and manifest identity before public/private rebinding | `planned` | P1 | AT-06، AT-11 | ☐ تأیید مالک ثبت نشده |
| `TASK-048` | Manifest and verify exact shared template/style dependencies for scoped imports | `planned` | P1 | AT-04، AT-11 | ☐ تأیید مالک ثبت نشده |
| `TASK-049` | Commit the validated normalized candidate on portfolio import, not unnormalized clone | `planned` | P1 | AT-08، AT-11 | ☐ تأیید مالک ثبت نشده |
| `TASK-050` | Make scoped JSON export/import size limits round-trip compatible | `planned` | P2 | AT-09، AT-11 | ☐ تأیید مالک ثبت نشده |
| `TASK-051` | Choose or reject multi-portfolio source instead of silently importing first portfolio | `planned` | P2 | AT-02، AT-11 | ☐ تأیید مالک ثبت نشده |
| `TASK-052` | Persist thumbnail-driven page reorder as structural Save Project, not scoped Save Page | `planned` | P1 | AT-02، AT-08 | ☐ تأیید مالک ثبت نشده |
| `TASK-053` | Await editor navigation before building portfolio print preview and preflight | `planned` | P1 | AT-12 | ☐ تأیید مالک ثبت نشده |
| `TASK-054` | Make main app shell responsive instead of retaining a fixed 235px navigation column | `planned` | P2 | AT-02، AT-13 | ☐ تأیید مالک ثبت نشده |
| `TASK-055` | Repair accessible project expansion and thumbnail list focus semantics | `planned` | P2 | AT-02، AT-13 | ☐ تأیید مالک ثبت نشده |
| `TASK-056` | Expose project and image file-import actions to keyboard and assistive technology | `planned` | P2 | AT-13 | ☐ تأیید مالک ثبت نشده |
| `TASK-057` | Constrain pointer-driven Region Block frame resize to its existing children | `planned` | P1 | AT-05 | ☐ تأیید مالک ثبت نشده |
| `TASK-058` | Enforce rotated-corner and pivot-aware bounds in Align/Distribute and Smart Duplicate | `planned` | P1 | AT-05 | ☐ تأیید مالک ثبت نشده |
| `TASK-059` | Preserve rigid relative geometry for multi-object Guide snapping | `planned` | P2 | AT-05 | ☐ تأیید مالک ثبت نشده |
| `TASK-060` | Remove orphan top-level image-placement code that aborts media module initialization | `in_progress` | P0 | AT-06، AT-15 | ☐ تأیید مالک ثبت نشده |
| `TASK-061` | Preserve immutable image-asset identity: replace bindings, never overwrite library originals in-place | `in_progress` | P1 | AT-06، AT-10، AT-15 | ☐ تأیید مالک ثبت نشده |
| `TASK-062` | Prevent impossible Tile grids when inter-cell gaps exceed available frame size | `planned` | P2 | AT-07 | ☐ تأیید مالک ثبت نشده |
| `TASK-063` | Add keyboard-accessible polygon mask vertex editing alongside pointer controls | `planned` | P2 | AT-07، AT-13 | ☐ تأیید مالک ثبت نشده |
| `TASK-064` | Use Tile-aware print preflight: validate visible cells, not the empty container or hidden stash | `planned` | P1 | AT-07، AT-12 | ☐ تأیید مالک ثبت نشده |
| `TASK-065` | Re-run resource-integrity preflight after image/font readiness and before invoking print | `planned` | P1 | AT-12، AT-15 | ☐ تأیید مالک ثبت نشده |
| `TASK-066` | Make preflight visibility match actual printed objects, including cover page numbers and Region Blocks | `planned` | P2 | AT-03، AT-12 | ☐ تأیید مالک ثبت نشده |
| `TASK-067` | Avoid serializing the entire workspace for every native scoped Save Page | `planned` | P1 | AT-08، AT-14 | ☐ تأیید مالک ثبت نشده |
| `TASK-068` | Keep long asset-file I/O outside SQLite transaction and connection lock where safe | `planned` | P1 | AT-08، AT-14 | ☐ تأیید مالک ثبت نشده |
| `TASK-069` | Reduce eager full-workspace Base64 hydration and image-memory amplification | `planned` | P1 | AT-10، AT-14 | ☐ تأیید مالک ثبت نشده |
| `TASK-070` | Bound untrusted full-workspace JSON restore and image-upload resource consumption | `planned` | P1 | AT-09، AT-11، AT-14 | ☐ تأیید مالک ثبت نشده |
| `TASK-071` | Cache or virtualize portfolio page thumbnails instead of fully rebuilding all pages on every render | `planned` | P2 | AT-13، AT-14 | ☐ تأیید مالک ثبت نشده |

## ۷. روش ثبت شواهد توسط مالک

برای هر اجرای سناریو، در یک رکورد **Verification** از نوع User Runtime Evidence، موارد زیر ثبت شود: تاریخ دقیق، شناسه سناریو، نسخه اجرایی و Commit/Source، Windows/Tauri یا مرورگر و نسخه آن، نسخه SQLite، Fixture یا نوع داده بدون درج اطلاعات محرمانه، اقدام انجام‌شده، نتیجه مورد انتظار، نتیجه مشاهده‌شده، PASS/FAIL/Blocked، فایل گزارش/اسکرین‌شات/ویدئو، و تسک/یافته مرتبط. بعد از بررسی و تأیید صریح مالک، یک **Acceptance** جداگانه با ID تسک و نتیجه قابل انتساب ثبت شود. ریسک‌های P0 یا خطاهای امنیتی/داده بدون Acceptance بسته نشوند.

پیش از تست‌های تخریبی روی کپی بسته‌شدهٔ برنامه، `portfolio.sqlite3` همراه فایل‌های WAL/SHM موجود و پوشه `assets/` را یکجا حفظ کنید. در هیچ بررسی، GC فیزیکی یا حذف عمومی بدون سیاست مصوب Q-005 فعال نشود. اندازه‌گیری کارایی باید با Fixture یکسان و تنظیمات یکسان انجام شود؛ اعداد Benchmark در این سند وجود ندارند زیرا اجرا نشده‌اند.

## ۸. برنامه ادامه پس از پایان ۹ فاز

ممیزی مرحله‌ای **از نظر بازبینی سورس و ثبت Traceability انجام شد**، اما برنامه اصلاحاتی که در صف زمان‌بندی ساعتی قرار دارد همچنان باز است. پس از هر source commit، وضعیت Task را همچنان جدا از Verification/Acceptance نگه دارید؛ گام بعدی عملی تست Runtime مالک و رفع موردبه‌مورد FAIL است. بازبینی این ماتریس پس از هر تغییر اصلی لازم است، نه اینکه هر N مجدداً یک فاز قبلاً انجام‌شده اجرا شود.
