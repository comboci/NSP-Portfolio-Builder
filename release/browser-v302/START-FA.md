# Browser V302 | NSP-GE-001 / G11

مبدأ: V301 `14f5d14262aa85b1256beb80e9bbc7358b3785de`. وضعیت: **SOURCE_CHANGED / PERFORMANCE_UNMEASURED**؛ آمادهٔ انتشار نیست.

- GE-010: فقط payloadهای دقیقاً برابر با گام مجاور در تاریخچهٔ همین صفحه و همین جلسه مشترک و immutable می‌شوند. snapshot عملیات/rollback مستقل، سقف ۱۰۰ گام، عنوان، انتخاب، ترتیب، لایه، undo/redo و بررسی ارجاع دارایی حفظ شده‌اند. Restore چندگامی عمداً تغییر نکرده؛ باید انتخاب/لایه را همان‌گونه normalize کند. Serialize و هزینهٔ تغییر تمام صحنه هنوز وجود دارد.
- GE-011: حرکت/Resize تا رهاکردن فقط DOM و پچ موقت را به‌روزرسانی می‌کند؛ در رهاکردن هویت، مالکیت، قفل، تغییر هم‌زمان، هندسه و Region بررسی می‌شوند و یک Commit انجام می‌شود. در Cancel/Escape/lost pointer capture مدلی برای بازگرداندن وجود ندارد؛ پچ شکست‌خورده فقط به snapshot جدید و مورد تأیید رهاکردن بازمی‌گردد. متن/چیدمان واقعی پس از Commit حل می‌شود. هزینهٔ Resolve و Snap باقی است.
- [Benchmark مالک](BENCHMARK.md) و تولید fixture یکسان ۱۰/۱۰۰/۵۰۰ صفحه، هر دو **NOT_RUN**. اول صحت داده و Drag/Undo/Redo، سپس p95، CPU، حافظه و PDF prep.

این مرحله از blobs تأییدشدهٔ GitHub بازسازی شد چون کامپیوتر توسعه قطع شد. متن blob و محدودیت مسیرهای commit با GitHub بررسی می‌شوند؛ **clean بودن checkout محلی پس از قطع اتصال تأیید نشده است.** Browser / Native / PDF / آزمون‌ها / Static Checker / Build / Benchmark / CI/CD / Deploy همگی **NOT_RUN** بر اساس DEC-006. G12 باز.
