# Browser V334 — Tile dependency fail-closed

Parent: `4cc29d9d58859194e26537aadf728dcfcca01934` (V333). **CONDITIONAL_SOURCE_GO_RUNTIME_PENDING / NOT RELEASE READY**. DEC-006 source-only. No build, tests, static checker, runtime, deployment or merge.

## یافته قطعی در سورس (V334-TILE-01 / P0)

در [V333 index.html](https://github.com/comboci/NSP-Portfolio-Builder/blob/4cc29d9d58859194e26537aadf728dcfcca01934/index.html#L2584-L2606)، گردآورندهٔ وابستگی Tile فقط ظرف cells/stash را کنترل می‌کرد؛ برای مثال cells=[42] در JSON معتبر، پس از عبور از شرط Array.isArray، عدد را نادیده می‌گیرد. مختصات نامعتبر stash و اعضای malformed نیز همان اعتبارسنجی زمان ورود پروژه را نداشتند. [M.references](https://github.com/comboci/NSP-Portfolio-Builder/blob/4cc29d9d58859194e26537aadf728dcfcca01934/index.html#L4489-L4496) در حذف و Undo/Redo فقط Tile متنی را بررسی می‌کرد؛ مقدار غیرمتنی از کنترل fail-closed عبور نمی‌کرد. [Reset](https://github.com/comboci/NSP-Portfolio-Builder/blob/4cc29d9d58859194e26537aadf728dcfcca01934/index.html#L14121-L14148) نیز از همان گردآورنده استفاده می‌کند.

این نقص مستقل در خواندن سورس و معیار A14-IA-AC06 تأیید شد؛ نه وقوع حذف تصویر واقعی و نه امکان تولید ورودی معیوب از UI عادی اثبات نشده است. بسیاری از داده‌های معیوب در Startup موجود نیز رد می‌شوند. قرارداد حفاظت باید در مسیر dependency collection هم برقرار باشد، نه فقط normalization.

V334 اعتبارسنجی موجود v20VisualFields برای Tile را به تابع مشترک vGeValidateTileData منتقل می‌کند و همان تابع را روی JSON تازه parse‌شده در v111AssetIds فراخوانی می‌کند. M.references مقدار غیرمتنی غیرخالی را نیز به مسیر خطای محافظتی می‌فرستد. null/undefined/empty string به‌عنوان نبود Tile و سلول null/empty در قالب معتبر حفظ شده‌اند. هیچ بازنویسی tilesJson، تغییر schema، منطق رندر یا حذف منبع واقعی انجام نشده است.

## محدودهٔ ممیزی سورس

- P0: IndexedDB read/write CAS، receipt و queue، rollback، RAW recovery، restore، named backup، Journal guard و reconcile در index.html خوانده شدند.
- A14: Pin/archive closure، graph، scope import، asset/style dependency، normalized page merge و بخش‌های library removal بررسی شدند.
- A13/Region: ancestry/subtree، rigid translation، constraints، reactive layout، Clipboard/Paste، Discard و History guard بررسی شدند.
- Graphics: تفکیک dispatch نسخه V333، binding متن، scope سفارشی، measured height/cache و کنترل‌های View/Grid بررسی شدند. تغییر دیگری در این مسیرها اثبات نشد.
- این بررسی همهٔ ۱۸۸۸۵ خط را خط‌به‌خط یا همهٔ ۱۹۲ سناریو را مستقلاً اثبات نمی‌کند؛ بخش‌های باقیمانده و عملکرد Runtime باید پذیرش شوند. به علت اعتبارسنجی اضافه، هزینهٔ dependency scan نیز باید اندازه‌گیری شود.

## پذیرش

گزارش قبلی Dot برای V333: 27 PASS / 0 FAIL / 1 BLOCKED / 164 ناقص، 31 زیرآزمون P0 موفق؛ ماتریس خام مستقل بازیابی نشد. **196 ردیف V334 (192 قبلی + 4 جدید)، همه NOT_RUN.** هیچ PASS منتقل نشده است. ابتدا V334-TILE-AC01/02/03 و A14-IA-AC06، سپس سایر P0، A14، A13/Region، Legacy، Graphics/PDF و Performance. Windows/Tauri فقط با مجوز و محیط مناسب. مرجع نسخه‌های قبلی صرفاً تاریخی است.

[ماتریس](ACCEPTANCE.json) · [Checkpoint](CHECKPOINT.json) · [Owner acceptance](OWNER-ACCEPTANCE-FA.md) · [Results template](OWNER-RESULTS-TEMPLATE.json)
