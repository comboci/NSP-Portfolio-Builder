# Browser V306 | A03

GE-023: آغاز/آزادسازی Pointer Capture و مسیر خاتمه برای Drag، Resize، Group Resize و Rotation مشترک شد. حرکت در مختصات محلی با موقعیت جاری سطح به Scroll پاسخ می‌دهد؛ تغییر Scale/ابعاد، گم‌شدن Capture، Escape و جابه‌جایی پروژه بدون ثبت موقعیت خاتمه می‌یابد. در رهاسازی، هویت، هندسه، قفل، عضویت و Snapshot بازسنجی می‌شوند و فقط یک ثبت Undo صورت می‌گیرد. Marquee انتخاب را تغییر می‌دهد نه مدل سند.

پذیرش مالک: Drag و Resize پس از Scroll، تغییر Zoom در حرکت، Rotation و گروه چرخیده/قرینه، قفل Region، Escape، تعویض پروژه، lostpointercapture، POINTERUP آخر و Undo پس از یک ثبت. DEC-006: همه NOT_RUN، بدون Merge، Build یا اجرا.
