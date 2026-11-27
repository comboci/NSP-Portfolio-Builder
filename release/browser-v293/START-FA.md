# NSP-GE-001 / G02 | Browser V293

**SOURCE_COMPLETE / RUNTIME_PENDING.** شاخهٔ `engineering/graphics-engine-evolution`، والد دقیق V292: `df7098f611b9c629dcf6a6512e8980c8742f9f5a`. شناسهٔ نسخه همان Commit این فایل است.

سه ماژول واقعی از کد اجرایی جدا شدند: **Affine** برای ماتریس مشترک رندر/Resize/Preflight، **Scene** برای projection لایه‌ها و ترتیب پایدار و قابلیت نمایش، و **Print Sampling** برای مقیاس فیزیکی و DPI. Renderer، Editor و Preflight اکنون این توابع را مصرف می‌کنند؛ تعریف‌های هندسی موازی حذف شده‌اند. Adapterهای شناسه و مالکیت پروژه، ترتیب wrapperهای صفحه، Revision و style snapshot، مسیر ذخیره و کامپوننت‌ها تغییر نکردند.

سه فایل [graphics-core](../../graphics-core/README.md) منبع قابل‌ویرایش‌اند و متن هر سه دقیقاً داخل `index.html` درج شده است. در مسیر اجرای Graphics هیچ درخواست فایل/باندل یا Build جدیدی وجود ندارد؛ فایل HTML همان ورودی مستقل نسخهٔ قبلی است. فایل همراه کتابخانهٔ پژوهش قدیمی نیز تغییری نکرد. Native و Schema تغییر نکردند.

**دو اختلاف مشاهده‌شده در مرز خروجی:** GE-013: DPI بوم با نسبت متفاوت اکنون از همان scale یکنواخت CSS چاپ استفاده می‌کند، نه scale جداگانهٔ محور‌ها. GE-014: شمارهٔ مخفی صفحهٔ اول و Region به همان قاعدهٔ نمایش رندر از گزارش bounds چاپ هم کنار می‌روند؛ opacity صفر همچنان فقط برای سنجش خروجی قابل رؤیت حذف می‌شود.

**GE-009:** استخراج زیرمجموعهٔ فعال Graphics Core انجام شد ولی wrapperهای سازگاری، adapterهای پروژه و HTML بزرگ هنوز باقی‌اند. حذف آنها در این مرحله تعمدی نبود. بررسی Runtime به‌ویژه برای فایل محلی، جهت RTL/LTR، ترتیب لایه‌ها، Freeze/Revision، صفحهٔ اول، بوم Illustrator و دو مسیر PDF ضروری است. G03 مرحلهٔ بعد است؛ G03–G12 هنوز در این commit اجرا نشده‌اند.

**شواهد:** مرور سورس و scope Git، تطبیق bytes ماژول‌ها با inline و Git diff whitespace. طبق DEC-006، Static Checker مخزن، Browser/Native/PDF، Test، Build، CI/CD، Deploy و Benchmark همگی `NOT_RUN` هستند. این کاندید پذیرش مالک است، نه نسخهٔ نهایی تأیید‌شده.
