# Browser V337 — Public media persistence receipt

Parent: `07cf5b956e06aa9cfb2ada5289f929be8636e930` (V336). **CONDITIONAL_SOURCE_GO_RUNTIME_PENDING / NOT RELEASE READY**. DEC-006 source-only; no Build, Test, Static Checker, Runtime, CI/CD, deployment or merge.

## یافته قطعی جدید

- **V337-PUB-01 / P0:** V336 index.html L5059–5080: public image/logo import admits a workspace write through save() but treats it as completed; preparation or post-enqueue render failure unconditionally replaces the catalog with an earlier copy, potentially undoing newer in-memory edits or diverging from a committed IndexedDB snapshot. Folder import callers at L14000 and L14275 ignore the operation result. V337 stages assets without catalog mutation, checks exact owner/catalog identity and contents before commit, avoids in-place unarchive, uses per-operation receipt and only attributable rollback, separates post-commit UI failure and gates both folder callers on success. Source-confirmed defect; runtime reachability and actual data loss not established.

## دامنهٔ مرور مستقل

- P0: v77Persist، افزودن/کپی/حذف پورتفولیو، تعویض پروژه، مسیرهای save(true)، ورود تصاویر عمومی/لوگو و هر دو مصرف‌کنندهٔ پوشه. اصلاح فقط مسیر ورود عمومی و شرط ادامهٔ مصرف‌کننده.
- A14: مرور کپی هویت صفحه، Pin owner و remap وابستگی در انتقال پورتفولیو، خروجی پورتفولیو.
- A13/Region: مرور نگاشت blockId و order در کپی صفحه و قیود subtree/geometry؛ نقص قطعی تازه در قسمت‌های خوانده‌شده احراز نشد.
- Graphics: مرور مسیر چاپ پورتفولیو، snapshot، آماده‌شدن فونت و تصاویر. پذیرش گرافیکی و PDF اجرا نشده‌اند.
- مسیر auto-publication هنگام درج تصویر خصوصی در قالب (V336 L14290–14305) و سایر مسیرهای باقی‌مانده نیازمند تحلیل reachability و مالکیت جداگانه‌اند. این مرور متمرکز است؛ پوشش کامل همه خطوط یا همه سناریوها اثبات نشده است.

## پذیرش

215 ردیف، همه NOT_RUN (211 قبلی + 4 جدید). هیچ PASS از نسخه قبلی منتقل نشد. اصل تصاویر، قالب داده، Native و موتور گرافیکی تغییر نکرده‌اند. 
