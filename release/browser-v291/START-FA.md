# Browser V291 — نامزد تجمیعی (بدون پذیرش نهایی)

شاخه: audit/v290-integrated-components
مبنای سورس دات: 35778ce7c95002ff88fe4e11b42a54d9cb46cded
شناسه دقیق Blob فایل index.html: 179c1543ff666efddae1ff74348add530c4e628f

- V291 در title، meta، header و application state یکسان است. Native/Tauri تغییر نکرده است.
- تعریف داخلی Hotel Text/View/Grid در همان Component Editor و با همان ID نسخه‌بندی می‌شود؛ قالب ویرایش‌شده متعلق به پروژه فعلی است. نمونه قبلی snapshot خود را حفظ می‌کند؛ Save As یک تعریف جدا ایجاد می‌کند.
- نسخهٔ پیش‌فرض Grid چهارستونه؛ مقدار قدیمی صریح حفظ می‌شود. سرریز داده در متن و کارت‌ها و چاپ گزارش می‌شود.
- گزارش ۱۵ تست Browser V290 تاریخی است؛ به V291 منتسب نشود. نمونه V290 به عنوان fixture سازگاری حفظ شد.
- `node scripts/static-check.cjs --browser`، `node scripts/v290-audit/run.cjs` و `node scripts/nsp-components-qa/run.cjs` را روی checkout همین شاخه اجرا کنید (راهنمای runner قبلی و وابستگی‌های آن را رعایت کنید).
- اجرای مستقل source fixture در V8 روی سورس تجمیعی قبل از تغییر سه نشانگر نسخه موفق بود؛ ذخیره و Reload در آن mock هستند. parse تمام اسکریپت‌های نسخه جدید و همسانی نشانگرها موفق.
- Browser/IndexedDB واقعی، Import/Export ZIP واقعی، PDF، Windows، Native و CI NOT_RUN. از پروژه آزمایشی استفاده کنید. مهاجرت Office و Merge به main بعد از پذیرش انجام شوند.
