# ماتریس پوشش سورس Browser V343

مبنای مرور `c149243390334d0f4be96500e9af7afc9ae058dc` است. پیوند هر ردیف به محل کد در کاندید حاوی این ماتریس می‌رسد. واحد پوشش یک مسیر کاربر یا ذخیره، از نقطهٔ ورود تا مصرف نتیجه است. یک مسیر ممکن است چند handler، ماژول و سناریوی پذیرش داشته باشد. «مرور سورس» نتیجهٔ خواندن مسیر است؛ نتیجهٔ اجرایی در فرم مالک ثبت می‌شود. کدهای ستون آخر به یافته‌های [گزارش](START-FA.md) اشاره دارند.

| مسیر | نقاط قابل پیگیری در کاندید | دامنه و ملاک بررسی | نتیجهٔ سورس |
|---|---|---|---|
| S01 · مالکیت پروژه و رجیستری | [function v76ListProjects()](../../index.html#L2054), [async function v76SwitchProject(](../../index.html#L2066), [async function v76AddProject()](../../index.html#L2100), [function v277PrepareOpen(](../../index.html#L16422) | فهرست، ساخت، تعویض، ورود مستقل و بازکردن فایل. نام نمایشی و پروژهٔ بدون پورتفولیو بررسی شد؛ فرادادهٔ مالک پیش از کنار گذاشتن پروژه حفظ می‌شود. | REG |
| S02 · حذف پروژه و دیسک | [async function v276DeleteProjectRegistry(](../../index.html#L2493), [async function v276DeleteManagedProject(](../../index.html#L17004) | حذف فعال، غیرفعال و آخرین پروژه؛ مسیر فقط رجیستری و مسیر دارای فایل، انتخاب جایگزین، readback و بازسازی رابط. | REG / DISK |
| S03 · پورتفولیو و صفحهٔ تکراری | [async function v77AddPortfolio(](../../index.html#L2278), [async function v77CopyPortfolio(](../../index.html#L2397), [async function v77DeletePortfolio(](../../index.html#L2404), [async function v285EditPortfolioCore(](../../index.html#L2435) | ساخت، نام، کپی، حذف، انتخاب و بازکردن صفحه از درخت پروژه؛ بررسی مقصد قبل از انتقال و بررسی پروژه/پورتفولیو بعد از آن. | مرور سورس |
| S04 · ساخت صفحه از رابط و بسته | [function pageDestination()](../../index.html#L12068), [async function newPage(](../../index.html#L12075), [async function nspInstallPack(](../../index.html#L12671) | صفحهٔ خالی، صفحه از قالب و بستهٔ چندصفحه‌ای. مالک پیش از تغییر لازم است؛ ادامهٔ بسته به نتیجهٔ همان افزودن متکی است. | PAGE |
| S05 · بازخوانی دادهٔ قدیمی | [function v13NormalizeProject(](../../index.html#L833), [function normalizeRestoreWorkspace(](../../index.html#L11377), [function showBrowserStorageRecovery(](../../index.html#L11537) | بازسازی alias از پورتفولیو، اعتبارسنجی پروژه‌های غیرفعال و رجیستری. صفحات موجود بدون هیچ مالک به بازیابی RAW ارجاع می‌شوند. | PAGE |
| S06 · نوار صفحات و بوم پیوسته | [function v342ThumbnailCurrent(](../../index.html#L7371), [async function v85MovePage(](../../index.html#L7353), [async function activate(m,id)](../../index.html#L17841), [V.editor.changePageFormat=](../../index.html#L9317) | انتخاب تأخیری، drag/drop، حرکت ترتیبی، بوم غیرفعال، قالب کاغذ و جهت. فرمان تغییر قطع پس از انتظار، مالک و شیء مقصد را دوباره بررسی می‌کند. | TARGET |
| S07 · بازگشایی نمای قبلی | [function v216GetFragment(](../../index.html#L13107), [function v215ReadView()](../../index.html#L13158), [window.v215RestoreView=function](../../index.html#L13198) | fragment، history.state، sessionStorage و window.name؛ بازکردن صفحهٔ دارای شناسهٔ تکراری نیازمند هویت پروژه و پورتفولیو است. | ROUTE |
| S08 · Duplicate / Cut / Paste / Delete صفحه | [async function v235StorePageStructure(](../../index.html#L14871), [function v100CloneScene(](../../index.html#L2293), [function v100ClonePortfolio(](../../index.html#L2371), [if(action==='delete-page-design')](../../index.html#L8954) | منوی صفحه و نوار کناری به کپی یا انتقال ساختاری می‌رسند. کپی جریان بررسی می‌شود؛ Cut روی Paste با یک ثبت اعمال می‌شود. شناسه‌های محلی و رابطه‌ها در کپی کل پورتفولیو بازبینی شد. | مرور سورس |
| S09 · قالب و پیش‌نویس | [function templateContents(](../../index.html#L12092), [function templateKeepsFlow(](../../index.html#L12186), [function writeTemplateToPage(](../../index.html#L12193), [V.templateChooser=](../../index.html#L12230) | ایجاد/به‌روزرسانی قالب عمومی، ساخت صفحه، اعمال مستقیم و chooser. نشانگرِ تنها، نسخهٔ قدیمی قالب و متن کامل مبدأ در هر دو مسیر اعمال در نظر گرفته شده‌اند. | FLOW |
| S10 · مالکیت اسناد ورودی و خروجی | [function vGePortableDependencies(](../../index.html#L2661), [function importBackupDependencies(](../../index.html#L2727), [function v290ImportScopedComponentRefs(](../../index.html#L2869), [async function v111ImportPortfolio(](../../index.html#L3052) | منابع اولیه در کاتالوگ مبدأ، بازنگاشت شناسهٔ محلی، Pin/Archive و هویت مقصد. JSON پروژه، پورتفولیو و بستهٔ ZIP تا اعتبارسنجی مشترک دنبال شد. | مرور سورس |
| S11 · فایل و Journal | [async function importRepositoryZip(](../../index.html#L16692), [async function v277CommitOpen(](../../index.html#L16450), [async function vPb03Reconcile(](../../index.html#L16800), [async function chooseRepositoryZip()](../../index.html#L17141) | قفل انحصاری، base revision، رسید پایگاه، تشخیص نسخهٔ قبل/بعد، بازخوانی دیسک و خروجی رابط. رسید موفق دیسک پس از خطای رابط دیگر نمایش موفق ۷ از ۷ را فعال نمی‌کند. | DISK |
| S12 · صف و رسید A14 | [function enqueue(](../../index.html#L11088), [V.persistWorkspaceMutation=](../../index.html#L11125), [V.persistPageMutation=](../../index.html#L11246), [async function v329PersistChange(](../../index.html#L2217), [async function v329AfterCommit(](../../index.html#L2242) | ورود به صف، نسل پیشین ناموفق، CAS، صف جانشین، رد قابل انتساب، خطای تأیید رابط و توقف در حالت نامطمئن. | مرور سورس |
| S13 · ذخیرهٔ تک‌صفحه و Retry | [function mergeSavedPage(](../../index.html#L11184), [V.queuePageSave=function](../../index.html#L11232), [V.savePage=async function](../../index.html#L11260), [V.retryStorage=](../../index.html#L11273) | هویت شیء فعال، دادهٔ ذخیره‌شدهٔ همان صفحه، archive/style/image/control/hotel، full-save-required و صف خطادار. | مرور سورس |
| S14 · Backup و Restore | [function createBrowserBackup(](../../index.html#L11332), [async function restore(payload](../../index.html#L11416), [function showBrowserStartupUiFailure(](../../index.html#L11618) | missing/empty/nontext، RAW، backup پیش از جایگزینی، تشخیص خطای UI پس از commit، بازگشت یا حفاظت از وضعیت نامطمئن. | مرور سورس |
| S15 · Pin، Archive و نسخه‌های وابسته | [function vGeComponentGraph(](../../index.html#L700), [function vGeCommonPin(](../../index.html#L744), [function vGeCaptureCommon(](../../index.html#L782), [function vGeCommonHistory(](../../index.html#L801), [async function saveComponentDraft(](../../index.html#L12760) | عمق، چرخه، سقف بایت و تعداد، منبع متن/استایل، انتخاب نسخهٔ تاریخی، وابستگی تودرتو، مالک بیرونی پس از Import. | مرور سورس |
| S16 · حفاظت از منابع و تاریخچه | [function v93StyleUses(](../../index.html#L1837), [M.references=function(](../../index.html#L4539), [V.editor.nspHistoryUses=](../../index.html#L9175), [V.pageClipboardReferences=](../../index.html#L14867) | حذف استایل، تصویر، کنترل لوگو، هتل و تعریف کامپوننت از مسیرهای جداگانه. صفحات Clipboard، checkpoint بازگشت و دو سوی تاریخچه برای وابستگی محلی لحاظ شدند. | REF |
| S17 · رسانه، آلبوم و Picker | [async function commitPrivateLibrary(](../../index.html#L4510), [function v339PublicImageId(](../../index.html#L2722), [async function v278ResetImages()](../../index.html#L14441) | ثبت خصوصی/عمومی، انتشار در قالب، تطبیق اصل تصویر، آلبوم عمومی/خصوصی و reset. مسیر فعال V222 و fallback قدیمی V220 به اصلاحات مستند V335–V342 متصل‌اند. | سورس قبلی + کنترل اتصال |
| S18 · گراف و قیود Region | [function ge13Graph(](../../index.html#L5313), [function ge13Ancestors(](../../index.html#L5323), [function ge13RegionGeometry(](../../index.html#L5374), [function assignBlock(](../../index.html#L7511), [function ge13CheckMutation(](../../index.html#L6468) | ایجاد، اتصال و جداسازی، چرخه و والد گم‌شده، لایه، قفل، حفاظت متن و انتقال یا resize زیرشاخه. | مرور سورس |
| S19 · Auto Layout | [V.geLayout={validate(](../../index.html#L6596), [function ge06Reactive(](../../index.html#L6678), [async function ge06Continue(](../../index.html#L6768), [async function ge13ReflowLayoutStyle(](../../index.html#L1952) | ردیف/ستون/شبکه، متن در عرض پیشنهادی، فرزند Region، reactive، کپی سرریز، سبک مشترک و تراکنش چندصفحه‌ای. | مرور سورس |
| S20 · تبدیل، انتخاب و Clipboard شیء | [function v97Duplicate(c)](../../index.html#L5497), [function v231CopyObjects(](../../index.html#L7831), [function v231PasteObjects(](../../index.html#L7861), [function geFinishTransform(](../../index.html#L8669), [function geKeyRotate(](../../index.html#L8687) | تکثیر/برش/چسباندن، کل زیرشاخه، محدودیت هندسی، چرخش با کلید، رهاکردن یا لغو اشاره‌گر. UI تأخیری از مسیر جداگانهٔ TARGET می‌گذرد. | مرور سورس |
| S21 · قاب کامپوننت و Detach | [V.editor.insertCustom=](../../index.html#L9376), [V.editor.detachCustom=](../../index.html#L9394), [function componentFromSelection(](../../index.html#L12720) | ماتریس رندر و برش قاب با هندسه‌ای که Detach می‌نویسد مقایسه شد. قاب زنده و سنجاق‌شده، فرزند متنی، چرخش، Clip، رنگ و opacity و نتیجهٔ Insert بررسی شدند. | GRAPH |
| S22 · تاریخچهٔ معمولی و ساختاری | [function ge20Matches(](../../index.html#L5874), [async function gePageTxn(](../../index.html#L8029), [async function geApplyPageTxn(](../../index.html#L8054), [function v91GoToHistoryStep(](../../index.html#L8080) | جابه‌جایی یک‌گامی برای تغییر ساختاری، order و expected content، حفاظت صفحات مستقل، قفل، رسید همان عملیات و زمان جابه‌جایی stack. | مرور سورس |
| S23 · Discard، Save و خروج | [async function v275Discard(](../../index.html#L7236), [async function v275LeavePage(](../../index.html#L7282), [async function v117EnsurePagePersisted(](../../index.html#L7297) | checkpoint و نسخهٔ صفحه/ادامه، انتظار برای fingerprint، هویت آرایه پیش از ثبت و حفاظت تاریخچه پس از رسید. | HIST |
| S24 · Text Flow و Rich Text | [function splitWithFit(](../../index.html#L15288), [function relationProblems(](../../index.html#L15429), [async function reflow(c,objectId,request)](../../index.html#L15454), [async function persistDetachment(](../../index.html#L15382), [function finishInline(](../../index.html#L8211) | ویرایش، IME، grapheme، برش run، امضای صحنه، نگهداری متن کامل، خروجی ادامه، Detach گروه، قفل و snapshot اتمی. محدودیت واقعی اندازه‌گیری فونت باز است. | مرور سورس / FLOW |
| S25 · منوی شیء، کلیپ‌بورد سیستم و Tile | [V.mediaContext=](../../index.html#L9121), [V.editor.insertClipboardText=](../../index.html#L9276), [function onContext(e)](../../index.html#L15830), [function ge08Compare(](../../index.html#L4909) | capture در منوی V241، خواندن async متن در V236، Inline و انتخاب تصویر/Tile؛ سه‌تایی کلید و epoch با شیء واقعی صفحه و ریشه تکمیل شد. | TARGET |
| S26 · صحنهٔ مشترک و خروجی | [V.v287MeasurePage=](../../index.html#L4136), [V.renderObjects =](../../index.html#L4327), [V.pageOwner =](../../index.html#L4142), [function physicalPlan(](../../index.html#L10320) | منشأ صفحه، صحنهٔ مشترک، visibility و ترتیب، تبدیل، بردار، متن، تصویر، اندازهٔ سند و اندازهٔ فیزیکی تا renderer چاپ دنبال شد. | مرور سورس |
| S27 · NSP Hotel و Data Controls | [function validateInstances(](../../index.html#L18378), [function renderScene(o,scope)](../../index.html#L18342), [function validateDefinitions(](../../index.html#L18921), [function applySlots(](../../index.html#L18953), [function view(p){const k=](../../index.html#L17981) | Logo و System، هتل‌های هر پورتفولیو، Hotel Text/View/Grid، Live/Pinned، آرشیو و slot. کلید نمای سینی برای IDهای دارای دونقطه بدون تصادم شد. | REF / سورس V331–V333 |
| S28 · تشخیص گرافیکی | [V.graphicsDiagnostics=](../../index.html#L10677), [function sourceIssues(](../../index.html#L19098), [async function scan(host)](../../index.html#L19164), [function jump(job,issue)](../../index.html#L19088) | job/لغو، سقف نتیجه، page index، Region، Pin و خطای فونت/تصویر و تمرکز روی عنصر. کیفیت خروجی و سرعت اندازه‌گیری اجرایی است. | مرور سورس |
| S29 · تنظیمات و ذخیرهٔ چاپ | [async function setPrintOptions(](../../index.html#L10347), [function options()](../../index.html#L10291), [const contextCurrent=ctx](../../index.html#L10303) | کاغذ، حاشیهٔ امن، کیفیت، پانچ و اضافه‌برش؛ تنظیمات نرمال‌شده، ثبت کل Workspace، receipt و اعتبار revision/context. | مرور سورس |
| S30 · پیش‌بررسی و فرمان چاپ | [function renderReport(](../../index.html#L10567), [function createPrintSnapshot(](../../index.html#L10637), [V.inspectPrintPreview=](../../index.html#L10704), [printAll=async function(snapshot](../../index.html#L10724), [window.v225OpenPortfolioPreview=](../../index.html#L15142) | نمای طراح/قالب، پیش‌نمایش پورتفولیوی دیگر، فرمان مستقیم و گزارش. انتخاب صفحه از گزارش با context تولید همان گزارش مقایسه شد. | PRINT |
| S31 · PDF، تصویر و اندازه‌گیری | [function configureOutput(](../../index.html#L10324), [async function waitForPrintAssets(](../../index.html#L10649), [function collectIssues(](../../index.html#L10407), [async function appendFontIssues(](../../index.html#L10588) | خروجی ثابت، PDF با کاغذ مختلط، پوشش bleed و binder، DPI، Tile، متن مرکب، بارگیری تصویر/فونت، خطا/هشدار و afterprint. تأیید PDF نزد مالک است. | مرور سورس |

## تطبیق با نقاط ورود

تمام تگ‌های script در index.html به ترتیب بارگذاری در جدول زیر آمده‌اند. هدف این فهرست روشن کردن مرز مرور و تشخیص wrapperهای متأخر است. شمارهٔ بلوک، تعداد تست یا درصد پوشش خطوط نیست. CSS و HTML مربوط به نمایش در محل استفاده از handler خوانده شدند. سبک‌پردازی پنل‌ها، دادهٔ پژوهشی، Native و ابزارهای مستقل خارج از این ممیزی هستند.

| بلوک | محل | سهم در ممیزی |
|---:|---|---|
| 1 | [nsp-illustrator-primitives · L358](../../index.html#L358) | ابعاد Illustrator و هندسهٔ سند در مسیر رندر مشترک |
| 2 | [./Portfolio%20Instruction/feature.js · L481](../../index.html#L481) | کاتالوگ پژوهشی خارجی؛ خارج از دامنه |
| 3 | [seed · L481](../../index.html#L481) | seed داده‌ای؛ خارج از دامنه |
| 4 | [inline · L481](../../index.html#L481) | مدل، اعتبارسنجی، رجیستری، انتقال، منابع، هویت و ورودی‌های قدیمی |
| 5 | [nsp-graphics-core-affine · L3246](../../index.html#L3246) | تبدیل/برش در انتخاب و پیش‌بررسی |
| 6 | [nsp-graphics-core-scene · L3312](../../index.html#L3312) | هویت مرکب، لایه و visibility |
| 7 | [nsp-graphics-core-selection-geometry · L3364](../../index.html#L3364) | محدوده، pivot و انتخاب |
| 8 | [nsp-graphics-core-smart-guides · L3424](../../index.html#L3424) | snap و فاصله در مسیر حرکت |
| 9 | [nsp-graphics-core-component-revisions · L3495](../../index.html#L3495) | تاریخچهٔ تعریف و Variant |
| 10 | [nsp-graphics-core-auto-layout · L3598](../../index.html#L3598) | قیود و برنامه‌ریزی چیدمان |
| 11 | [nsp-graphics-core-rich-text · L3686](../../index.html#L3686) | run و مرز متن |
| 12 | [nsp-graphics-core-image-treatment · L3821](../../index.html#L3821) | crop/fit و نمونه‌برداری |
| 13 | [nsp-graphics-core-diagnostics · L3884](../../index.html#L3884) | شناسه و شمارش issue |
| 14 | [nsp-graphics-core-print-policy · L3942](../../index.html#L3942) | کاغذ، bleed و binder |
| 15 | [nsp-graphics-core-print-sampling · L4039](../../index.html#L4039) | DPI و scale فیزیکی |
| 16 | [inline · L4064](../../index.html#L4064) | resolve، متن، render، چاپ و cleanup |
| 17 | [v72-media-bridge · L4490](../../index.html#L4490) | اتصال به ارتقای رسانه |
| 18 | [v72-media-upgrade · L4495](../../index.html#L4495) | کتابخانه، Tile، Undo، Crop، انتشار و picker |
| 19 | [page-scene · L5243](../../index.html#L5243) | مونتاژ صحنه و مالک |
| 20 | [inline · L5291](../../index.html#L5291) | ویرایشگر و تاریخچه، Region، هندسه، Text Flow، فرمان‌های صفحه |
| 21 | [inline · L9506](../../index.html#L9506) | اتصال فایل/چاپ به فرمان فعال |
| 22 | [v13-review-dialog · L9541](../../index.html#L9541) | دیالوگ تصمیم؛ ادامهٔ async در مصرف‌کننده بررسی شد |
| 23 | [v16-docking-controller · L9601](../../index.html#L9601) | Dock؛ چیدمان پوسته خارج از دامنه |
| 24 | [v18-colors-controller · L10003](../../index.html#L10003) | ارسال ویرایش رنگ به ویرایشگر؛ چیدمان پالت خارج از دامنه |
| 25 | [v18-toolbar-controller · L10206](../../index.html#L10206) | Toolbar؛ مصرف‌کنندهٔ فرمان مشترک |
| 26 | [v82-print-preflight · L10286](../../index.html#L10286) | تنظیمات/تشخیص/چاپ ثابت |
| 27 | [v84-editor-scope · L10811](../../index.html#L10811) | دامنهٔ طراح قالب/پروژه |
| 28 | [inline · L10864](../../index.html#L10864) | اتصال راه‌اندازی |
| 29 | [inline · L10878](../../index.html#L10878) | ورودی قدیمی چاپ/Export به مسیر دارای scope |
| 30 | [v74-storage · L10922](../../index.html#L10922) | IndexedDB، queue، receipts و recovery |
| 31 | [v92-design-view-controls · L11695](../../index.html#L11695) | نمای طراحی، zoom؛ تنظیمات نمایشی خارج از معیار ذخیرهٔ سند |
| 32 | [v134-thumbnail-virtualization · L11886](../../index.html#L11886) | تصاویر کوچک lazy و navigation |
| 33 | [v137-page-first-model · L12024](../../index.html#L12024) | قالب، صفحه، تعریف، clipboard و بازیابی route |
| 34 | [v208-toolbar-menu-exclusivity · L13276](../../index.html#L13276) | رفتار باز و بسته شدن منو؛ پوسته |
| 35 | [v219-designer-ui-controller · L13655](../../index.html#L13655) | پوستهٔ طراح و ruler؛ اتصال به فرمان‌های مشترک |
| 36 | [v220-media-explorer · L13860](../../index.html#L13860) | مسیر نگهداری‌شدهٔ کتابخانهٔ قدیمی؛ شواهد V341 |
| 37 | [v222-unified-media · L14189](../../index.html#L14189) | کتابخانه/آلبوم/Picker فعال |
| 38 | [v222-navigation-print · L14631](../../index.html#L14631) | پیش‌نمایش طراح و چاپ |
| 39 | [v223-runtime-polish · L14840](../../index.html#L14840) | عملیات منوی صفحه و Export پروژه |
| 40 | [v224-template-nav · L15054](../../index.html#L15054) | ناوبری قالب |
| 41 | [v225-project-runtime-review · L15115](../../index.html#L15115) | پیش‌نمایش مستقل پورتفولیو |
| 42 | [v228-flow-engine · L15221](../../index.html#L15221) | زمان‌بندی، امضا، تقسیم و recovery متن |
| 43 | [v232-project-page-open · L15682](../../index.html#L15682) | بازکردن صفحه از درخت |
| 44 | [v241-context-ui · L15807](../../index.html#L15807) | منوی شیء، متن و Clipboard |
| 45 | [v261-editorial-sections · L15975](../../index.html#L15975) | نمای راهنمای سکشن و ترتیب پژوهشی؛ خارج از دامنهٔ تاریخچهٔ صفحات |
| 46 | [v265-repository-projects · L16175](../../index.html#L16175) | فایل پروژه، ZIP، مجوز پوشه و Journal |
| 47 | [v283-right-dock-runtime · L17272](../../index.html#L17272) | Dock کناری؛ پوسته |
| 48 | [v284-single-toolbar-runtime · L17465](../../index.html#L17465) | دکمه‌های مشترک؛ نمای نام عناصر خارج از دامنه |
| 49 | [v288-continuous-canvas · L17665](../../index.html#L17665) | بوم پیوسته، تغییر صفحه، حفاظت صفحهٔ فعال |
| 50 | [nsp-tray · L17972](../../index.html#L17972) | تغییرات مشترک کنترل داده |
| 51 | [nsp-controls · L18035](../../index.html#L18035) | وابستگی، اعتبارسنجی و refresh لوگو/سیستم |
| 52 | [nsp-hotels · L18133](../../index.html#L18133) | مدل هتل، Text و خروجی مشترک |
| 53 | [nsp-view · L18432](../../index.html#L18432) | چیدمان View/Grid |
| 54 | [nsp-editor · L18541](../../index.html#L18541) | ویرایش تعریف، نسخه و پیوند |
| 55 | [nsp-slots · L18913](../../index.html#L18913) | اعتبارسنجی و نگاشت Slot |
| 56 | [nsp-graphics-diagnostics-center · L19021](../../index.html#L19021) | جمع‌آوری، صفحه‌بندی و انتخاب نتیجهٔ Graphics |

## حدود نتیجه

تمام مسیرهای فهرست بالا تعیین تکلیف سورسی دارند. ریاضی داخلی هر تابع، تمامی شاخه‌های شرطی، تمام تعاملات ممکن میان رویدادها و سازگاری مرورگرها به‌صورت مستقل اثبات نشده است. پوشش بلوک‌های Graphics Core در محل استفاده از آن‌ها مستند شده است؛ ۱۱ فایل مستقل نسبت به V342 تغییری ندارند. بررسی اختصاصی Native/Tauri/SQLite، محتوای کاتالوگ، بسته‌های تاریخی و ابزارهای build در دامنهٔ Browser نیست. معیارهای مرورگر واقعی، IndexedDB واقعی، مجوز فایل و PDF در [فرم پذیرش مالک](OWNER-RESULTS-TEMPLATE.json) باز هستند.

## پیوند با ۲۴۹ ردیف مبنا

ستون اول مقدار `matrix_group` در فرم مالک است. این نمایه گروه‌های قبلی را به مسیرهای مرتبط وصل می‌کند. شناسه و ترتیب تک‌تک ردیف‌ها در فرم V343 حفظ شده است. ردیف‌های یافته و سناریو در این شمارش هر دو وجود دارند. معیار سرعت، محیط Native و کیفیت PDF تنها با شواهد اجرایی قابل تعیین است.

| گروه در فرم V342 | تعداد ردیف | مسیرهای مرتبط در این ماتریس |
|---|---:|---|
| browserScenarios | 15 | S03, S16, S21, S26–S31 |
| additional | 10 | S10–S14, S20, S26–S31؛ Native خارج از دامنه |
| remediation | 12 | S06–S11, S18–S31 |
| a11 | 4 | S15, S19, S24, S27–S28 |
| a12 | 8 | S08–S09, S15, S23–S24 |
| a13 | 9 | S18–S20, S22–S24, S28 |
| a13Followup | 7 | S08, S18–S21, S23–S24 |
| a13Independent | 8 | S18–S24, S28, S31 |
| a13Final | 6 | S08–S10, S18–S22, S28 |
| a13GateFollowup | 4 | S08–S09, S18–S24 |
| a14 | 11 | S10, S13, S15–S16, S21, S27 |
| a14Independent | 16 | S10, S13, S15–S18, S21 |
| a14FinalGate | 10 | S05, S12–S17, S22–S23 |
| a14GateFollowup | 10 | S05, S12–S14, S16–S17, S25 |
| a14OwnerHandoff | 10 | S05, S12–S14, S16–S17, S23 |
| a14PersistenceReview | 10 | S01–S02, S10–S13 |
| a14ReceiptFollowup | 12 | S01–S05, S10–S17, S27 |
| a14PageQueueFinal | 12 | S04, S06, S08–S09, S12–S13, S22–S24 |
| v331HotelCardRemediation | 6 | S26–S28, S31 |
| v332HotelTextRemediation | 6 | S26–S28, S31 |
| v333HotelTextDispatchRemediation | 6 | S26–S28, S31 |
| v334TileDependencySafety | 4 | S10, S16–S17 |
| v335PersistenceReceipt | 8 | S12, S16–S17, S22 |
| v336RestoreUiIsolation | 7 | S05, S12, S14 |
| v337PublicMediaReceipt | 4 | S12, S17 |
| v338TemplatePublicationAlbumScope | 7 | S09, S17, S25 |
| v339ImageIdentityOwnership | 7 | S10, S16–S17 |
| v340PageLifecycle | 8 | S03–S04, S08, S16–S17 |
| v341LegacyAlbumPrintReceipt | 4 | S17, S29–S31 |
| v342LifecycleFlowScope | 8 | S06, S08, S17, S19, S22–S24 |
