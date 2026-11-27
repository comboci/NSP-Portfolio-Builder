# Browser V336 — Restore / Startup UI isolation

Parent: `816553d2c956d44fa15c9e2f7aa00bfdf7c63f0b` (V335). **CONDITIONAL_SOURCE_GO_RUNTIME_PENDING / NOT RELEASE READY**. DEC-006 source-only. No build, test, executable static checker, runtime, deployment or merge.

## یافته‌های قطعی سورس

- **V336-RESTORE-01 / P0:** Source-confirmed in V335 index.html L11373-L11404: restore enqueued pre-restore save and set ready=false before DOM preparation outside try/finally; a preparation exception stranded the adapter. Its unguarded finally status() could throw after COMMITTED, or render catch could mask the original receipt; successful return with failed UI was also possible. L11444 opened restored draft outside the committed-result distinction. V336 prepares blocking UI inside try before enqueue, tracks cleanup independently, reports committed vs unconfirmed replacement and blocks uncertain UI continuation; restored draft opening failure is explicitly post-commit.
- **V336-STARTUP-01 / P0:** Source-confirmed in V335 index.html L11540-L11566: editor reset, route/dashboard rendering and status() shared outer catch with IndexedDB read and validation. A display failure after successful data validation invoked corrupt-storage recovery and offered destructive replacement. V336 separates read/validation from UI initialization; UI-only failure blocks writes and offers read-only RAW export/reload, not replacement. Fresh initialization follows successful UI setup. No change to CAS, backup format or schema.

## بررسی مستقل

- P0: مسیرهای V335 private image receipts، structural page receipts، CAS، write acknowledgement، named backup، Restore، startup و Journal خوانده شدند.
- A14: Pin/Archive closure، graph، style dependencies، portable dependency validation و Tile بررسی شدند.
- A13/Region: ancestry، subtree، constraints، structural history و clipboard بررسی شدند.
- Graphics: Hotel Text dispatch، bound text، measured height، card fit و cache بررسی شدند. نقص قطعی تازه در این مسیرهای بررسی‌شده احراز نشد؛ پذیرش اجرایی باقی است.
- اصلاحات صرفاً در مسیرهای UI Restore و startup هستند. منطق CAS، قالب داده، Native و موتور گرافیکی تغییر نکرده‌اند. ممیزی متمرکز است و پوشش کامل همه خطوط یا سناریوها را اثبات نمی‌کند.

## پذیرش

211 ردیف = 204 قبلی + 7 جدید، همگی NOT_RUN. اول V336-RESTORE-AC01/02/03 و V336-STARTUP-AC01/02 و یافته‌ها؛ سپس V335 LIB/PAGE، V334 TILE و همه P0، A14، A13/Region، Legacy، Graphics/PDF، Performance و Native در محیط مجاز. هیچ PASS از SHA قبلی منتقل نشود.

[ماتریس](ACCEPTANCE.json) · [Checkpoint](CHECKPOINT.json) · [پذیرش مالک](OWNER-ACCEPTANCE-FA.md) · [فرم شواهد](OWNER-RESULTS-TEMPLATE.json)
