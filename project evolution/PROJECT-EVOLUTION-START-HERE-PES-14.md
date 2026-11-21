# NSP Portfolio Builder — Project Evolution START HERE (PES-14)

Read **Project-Evolution-V1-PES-14.json** before modifying source. This folder is the project's persistent knowledge record, not a substitute for checking live source.

## Required startup
1. Read this Help and the current PES-14 JSON.
2. Re-fetch the current `main` HEAD and compare with `release_context.source_revision_ref`.
3. Read Product Purpose, scopes, decisions, business rules, requirements, open questions and tasks.
4. Treat current architecture/operational context as **derived**; inspect freshness and source evidence.
5. Separate proposed/approved requirements from verified implementation, runtime observation and owner acceptance.
6. Check for concurrent Work changes; merge by stable record IDs before writing.
7. Never run Test or Build; user performs runtime review.
8. Update Project Evolution with each durable change; preserve prior decisions and history.

## Scope of this project
Project -> multiple independent Portfolios/Catalogs -> independent Pages. Page templates are in a system-wide library whose Cover/About/Contents/Gallery categories exist only for discovery; applying a template creates page-owned elements, not a live Master/Section hierarchy. Reusable named Custom Components are constructed from editor objects, placed in the same Toolbox, stored by project and linked across their instances; per-instance geometry remains local. A project has a private image library; the Global Library is shared by explicit action. Image edits are non-destructive, and page numbers reflect actual sequence even if cover number is hidden. **V137 phase 1 retains legacy Master/Section records and compatibility code internally pending TASK-075; no full decommission, data reset or runtime acceptance is claimed.**

## Record semantics
Statement = source input; Question = open issue; Analysis = reasoning; Finding = supported issue; BusinessRule = domain rule; TechnicalContract = interface reference; Requirement = desired behavior; Decision = selected choice; Task = execution work; Evidence = grounded support; Verification = observed check; Acceptance = owner approval; Observation = timestamped runtime/deployment fact.

## Integrity
- PES standard is 14.0.0. Do not mix this with software release or Project Evolution V1.
- No passwords, tokens or private keys.
- No invented implementation, tests, deployment, or acceptance.
- No silent deletion of records or rewriting history.
- Any mismatch between PE and source blocks source mutation until reconciled.
- See original PES-14 Portable Starter Pack for normative schema, semantic rules and compatibility profile.

## V164 — آخرین ممیزی مستقل سورس (۲۰ نوامبر ۲۰۲۶)

- فایل `V164-18-STAGE-SOURCE-AUDIT-FA.md` را قبل از هر اصلاح سورس بخوان؛ مرجع ۱۸ مرحله و وضعیت باقی‌مانده است.
- **Browser:** `index.html` نسخه ۱۶۴، ذخیره‌سازی `IndexedDB` با `designModel='page-first'`، قالب‌های گروهی و کامپوننت‌های متصل.
- **Native:** `native-ui/index.html` نسخه ۱۳۸ و `src-tauri` / SQLite schema 13. جدا و به فاز بعد واگذار شده، نه حذف‌شده.
- داده‌های قدیمی **آزمایشی** را مالک قابل حذف دانسته است (DEC-007): مهاجرت آن‌ها برای پایان Browser اجباری نیست؛ هیچ Reset واقعی در ممیزی انجام نشده است.
- مراحل ۰۱–۱۷ شواهد سورس دارند؛ مرحله ۱۸ حذف Legacy و تطبیق قراردادها **جزئی** است. وضعیت `TASK-072..076` همچنان در حال انجام/در انتظار Runtime و `TASK-077` تصمیم اختیاری موکول‌شده به مالک است.
- توابع تاریخی Master/Section هنوز در متن HTML هستند، ولی وجود آن‌ها به‌تنهایی ثابت نمی‌کند در مسیر فعال استفاده می‌شوند. قبل از حذف کد، مسیرهای فراخوانی را از روی سورس بررسی کن.
- ممیزی کد به معنی اجرای Build/Test/Static Checker/PDF/Runtime یا پذیرش مالک نیست (DEC-006).

## V137 owner-approved architecture decision
- DEC-012: Master/Section authoring hierarchy is superseded by page-first independent design.
- DEC-013: linked project-local Custom Components in the shared Toolbox. No dedicated separate library UI.
- DEC-010: existing centralized Style Library stays until Q-006 is explicitly resolved; do not invent project-specific style forks.
- See TASK-072..TASK-077 for stage-one source status and remaining legacy decommission/data-integrity work. Do not call these accepted or tested.
- DEC-006 forbids assistant Build, Test and static checker; owner performs runtime/PDF review.

## V145 — Source-only reconciliation (2026-11-20)
- Browser HTML at V145, Tauri at 138.0.0 and SQLite schema 13. Do not conflate versions or claim SQLite removal.
- Read `V145-ARCHITECTURE-FOLLOWUP-AUDIT-FA.md`. Existing DEC-012/013 govern new pages/components; old Master/Section historical paths remain and require TASK-075.
- TASK-049 and TASK-052 have partial source candidates, not owner-accepted functionality. TASK-030's checker needs Browser/Native release split awareness and was not executed.
- Do not mark TASK-072..077 or any other task Complete merely because source exists. Owner Runtime/Print/PDF/Import verification remains distinct.

## V164 — historical decision conflict correction
- ST-001/Q-003 archived Master live-inheritance intent is superseded; DEC-012 and ST-002 govern the current Browser Page-First design.
- SOL-002/DEC-005 are scoped to deferred Native SQLite; Browser does not depend on legacy DEV-data migration. TASK-048 Browser manifests use categorized page templates and central Style IDs.

## V164 — پیگیری ممیزی مسیرهای Legacy (۲۱ نوامبر ۲۰۲۶)
- گزارش دقیق: `V164-TASK-075-REACHABILITY-REVIEW-FA.md`، با شناسه‌های `OBS-072` و `FND-054`.
- مسیر معمول صفحه/قالب Page-First در سورس وجود دارد اما برخی توابع Master/Section باقی‌اند؛ پوشش قدیمی `render()` فیلد `legacyLayout=false` را پس از حذف آن در Normalizer دوباره درج می‌کند.
- `TASK-075` همچنان باز است؛ تا جداسازی قراردادهای مشترک Editor/Layer و بررسی Runtime، حذف کلی Legacy یا ادعای اتمام مرحلهٔ ۱۸ ممنوع است.

## Browser V195 — جمع‌بندی ادامهٔ مرحلهٔ ۱۸

- مبنای تحویل سورس: `6b0ced4bf4ec5979bcc7f5714a5b703b202fb38a`. Browser V195 روی IndexedDB است. Native V138 و SQLite Schema 13 به فاز دسکتاپ تعلق دارند.
- **TASK-075:** در ادامهٔ رفع FND-054 در V165، مسیرهای قدیمی مدیریت Master/Section، انتساب منبع صفحه، چرخهٔ پیش‌نویس، حل صحنهٔ Master، کپی Master و نوشتن ضمنی هنگام Export حذف شدند. حذف کلیدهای تاریخی در مرز نرمال‌سازی و هدایت نام مسیرهای قدیمی به مقصد فعلی برای سازگاری باقی مانده است. Editor، History، Layers، ترتیب صحنه و استایل مرکزی در مسیر Page-First استفاده می‌شوند.
- **TASK-076:** ثبت مستقل صفحه، درج اتمی تعریف جدید کامپوننت و نمونهٔ اول، بازگردانی تغییر پورتفولیو و مالکیت تصویر پس از خطای ذخیره، بازنگاشت تصاویر Tile/Stash، بسته‌بندی وابستگی صحنهٔ ثابت و بررسی همهٔ پروژه‌ها پیش از Restore در سورس ثبت شدند.
- **تأیید مالک:** ورود و خروج JSON برای پروژه و پورتفولیو، Restore کامل با چند پروژه و پشتیبان نام‌دار، تغییر و Detach کامپوننت، Group/Block/Layer/Style پس از Import، حفظ تصاویر Tile/Stash، ذخیرهٔ مجزا و شکست تراکنش در دو پنجره بررسی شوند. TASK-072 تا TASK-076 در انتظار تأیید مالک‌اند. TASK-077 اختیاری و موکول‌شده است.
- طبق DEC-006 هیچ Build، Test، Static Checker، Runtime یا PDF اجرا نشد. دادهٔ واقعی یا تصاویر و پشتیبان‌ها حذف نشدند.
