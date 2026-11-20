# Portfolio Builder — آداپتور مستقل Project Evolution 15

این مسیر فقط یک **Bridge آزمایشی و اختیاری** است. هیچ فایل PE-14، تسک زمان‌بندی‌شده، دیتابیس نرم‌افزار یا رابط کاربری را تغییر نمی‌دهد. قابلیت فعلی **ارزیابی، مهاجرت کپی، ذخیره‌سازی SQLite مستقل، تولید Context و گزارش** است؛ اتصال UI هنوز فعال نشده است.

## پیش‌نیاز

- Python 3.11+ و `jsonschema>=4.22`
- نسخه مستقل `PES-15-Standalone-Reference-Implementation.zip`، استخراج‌شده در محلی جداگانه. کد `pes15` باید در PYTHONPATH موجود باشد.
- **کپی** فایل `project evolution/Project-Evolution-V1-PES-14.json` از SHA مشخص GitHub؛ فایل اصلی تغییر نمی‌کند.

## اجرا در Windows PowerShell

```powershell
$env:PYTHONPATH = 'C:\PES-15-Reference-Implementation'
python "project evolution\pes15\adapter.py" --source "C:\Temp\PB-PES14-copy.json" --output-dir "C:\Temp\PB-PES15-assessment-001" --source-commit "<40-character-commit>"
```

خروجی در پوشه **جدید** تولید می‌شود: `assessment-report.json`، `migrated-pes15.json`، `continuation-context.json`، `pes15-canonical.sqlite` و `pes15-backup.sqlite`. پوشه موجود بدون هیچ تغییری رد می‌شود. خطای اعتبارسنجی جلوی تولید داده ناقص را می‌گیرد.

برای تست محلی:

```powershell
$env:PYTHONPATH = 'C:\PES-15-Reference-Implementation;project evolution\pes15'
$env:TEST_PES14_SAMPLE = 'C:\PES-15-Reference-Implementation\examples\portfolio_builder_legacy_v14_demo.json'
python -m unittest discover -s "project evolution\pes15" -p "test_adapter.py" -v
```

> ساختار جدید هنوز در `main` ادغام نشده است. این آداپتور به موتور PES-15 استخراج‌شده به صورت جداگانه وابسته است. **هیچ مهاجرت اجباری وجود ندارد**. برای تغییر داده‌های PE-15 در آینده تنها API کنترل نسخه و اعتبارسنجی موتور مجاز است.