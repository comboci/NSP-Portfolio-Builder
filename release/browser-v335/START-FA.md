# Browser V335 — Private library and structural page receipts

Parent: `8fb56cbbf72eafd98d3b65a5ef27829c00e7cda3` (V334). **CONDITIONAL_SOURCE_GO_RUNTIME_PENDING / NOT RELEASE READY**. DEC-006 source-only. No build, tests, executable static checker, runtime, deployment or merge.

## یافته‌های قطعی سورس

- **V335-LIB-01 / P0:** V334 index.html L4509-L4526, L4556-L4557: private image changes and library Undo/Redo use save(true), which at L10957 only enqueues a workspace snapshot. History is advanced before COMMITTED; importFiles catch unconditionally restores the old library even if render throws after enqueue. registerDecoded returns an asset ID before persistence. V335 routes these private mutations through v329PersistChange and moves library history/UI only after their own receipt; import and image bind recheck owner and candidate, and mixed delete/import callers await success. Runtime reachability/data loss not established.
- **V335-PAGE-01 / P0:** V334 index.html L7894-L7930: gePageTxn and geApplyPageTxn use save(true) and immediately advance structural history, independent of the result of the corresponding transaction. V335 uses v329PersistChange and exact owner/page-array/history checks before moving history, awaits structural transactions at all four callsites and preserves Clipboard publication guards. Ordinary single-page optimistic editor behavior is not changed. Runtime acceptance pending.

V334 در شروع این ممیزی قبلاً روی شاخه منتشر شده بود؛ SHA نسخه‌های V333 و V334 دست‌نخورده می‌ماند و نسخه بعدی برای دو نقص مستقل شماره V335 دارد.

## تغییرات

- ثبت خصوصی تصاویر (حذف، تغییر نام، Undo/Redo، ورود، ثبت تصویر Decode شده و ورود نسخه مستقل) از Receipt موجود استفاده می‌کند. خطای UI پس از Commit مجوز بازگردانی داده نیست. عملیات ترکیبی و آلبوم منتظر نتیجه خصوصی می‌مانند.
- درخواست عنصر پس از ثبت تصویر دوباره با مالک و Snapshot تطبیق داده می‌شود؛ در تعارض فقط تصویر مستقل می‌ماند، نه اتصال اشتباه.
- عملیات چندصفحه‌ای و Undo/Redo ساختاری پس از Receipt تاریخچه را تغییر می‌دهند. بررسی دقیق مالک، آرایه صفحات و تاریخچه و حفاظت Clipboard برقرار است. همه چهار فراخوانی ساختاری به صورت await تطبیق داده شدند.
- اصلاح Tile نسخه V334، حفاظت RAW، Common Pin/Archive، Region constraints، Hotel Text/View/Grid و preflight تغییر نکرده‌اند.
- ویرایش معمولی تک‌صفحه‌ای که عمداً از queue optimistic استفاده می‌کند خارج از محدوده تغییر جدید است. ممیزی خواندن سورس متمرکز بود؛ پوشش خط‌به‌خط کل سورس یا اثبات اجرایی همه سناریوها نیست.

## پذیرش

204 ردیف، همگی NOT_RUN؛ 196 تاریخی V334 و 8 ردیف جدید. هیچ PASS از SHA قبلی منتقل نشود. ابتدا V335-LIB-AC01/02/03، V335-PAGE-AC01/02/03 و یافته‌های مربوط، سپس کنترل Tile V334 و سایر P0، A14، A13/Region، Legacy، Graphics/PDF، Performance و Native در محیط مجاز.

[ماتریس](ACCEPTANCE.json) · [Checkpoint](CHECKPOINT.json) · [پذیرش مالک](OWNER-ACCEPTANCE-FA.md) · [فرم شواهد](OWNER-RESULTS-TEMPLATE.json)
