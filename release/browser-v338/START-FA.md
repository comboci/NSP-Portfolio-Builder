# Browser V338 — Template publication receipt / album scope

Parent: `5314669e8589229501132871af91340fc95dfedb` (V337). **CONDITIONAL_SOURCE_GO_RUNTIME_PENDING / NOT RELEASE READY**. DEC-006 source-only; no Build, Test, executable Static Checker, Runtime, CI/CD, deployment or merge.

## یافته‌های قطعی جدید

- **V338-PUB-01 / P0:** V337 L14294–14309, L14408–14451, L14120–14151: active unified picker exposes private and public originals; choosing a private asset in a global template permanently publishes without explicit grant and binds after queue admission, not a durable receipt. This contradicts the one-way publication policy at L4704–4715. V338 obtains explicit grant for a new public original, preserves the private original, avoids relying on imported hash equality, allocates a noncolliding ID, persists via attributable receipt, and rechecks original root, exact draft/stamp, selection/Tile and picker lifetime before binding. All picker consumers await the result; actual add result is returned. Cancellation after commit does not unpublish. Runtime acceptance pending.
- **V338-ALBUM-01 / HIGH (A14 ownership):** V337 L867–896 permits duplicate album IDs across separate public/private namespaces, while L14114–14118 and L14138–14162 flatten them into unscoped UI IDs; L14238–14293 resolves mutations and asynchronous folder upload by that ambiguous ID. A valid public/private same-ID pair can resolve a private selection to the public album, mix subtree membership, or modify the wrong folder. V338 projects scoped UI keys and scoped parents, retains raw persisted IDs, uses raw records for writes, captures upload owner/record, and refuses stale popup/upload ownership. No migration or automatic modification of stored album IDs. Runtime acceptance pending.

## دامنه مرور

- P0: مسیر فعال و دو مصرف‌کننده قدیمی picker، درج تصویر، انتشار عمومی، Receipt و مالکیت مقصد، ورود به پوشه.
- A14: تفکیک هویت آلبوم، بررسی قالب عمومی، dependency graph و ثبت پیش‌نویس.
- A13/Region: add/commit، قیود هندسه و اعتبارسنجی روابط Region، نگاشت context.
- Graphics: preflight/diagnostics و تنظیمات چاپ؛ پذیرش اجرا نشده است.
- مسیرهای باقیمانده: انتشار و share صریح، مسیرهای قدیمی آلبوم و فایل، lifecycle صفحه و پروژه، تاریخچه Text Flow و عیب‌یابی/چاپ. این ممیزی متمرکز است نه ادعای پوشش کامل.

## پذیرش

221 ردیف = 215 پیشین + 6 جدید، همه NOT_RUN. هیچ PASS منتقل نشد. Schema، Native و اصل تصاویر تغییر نکرده‌اند.
