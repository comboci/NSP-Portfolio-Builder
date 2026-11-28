# Browser V340 — Page lifecycle / deferred cut / legacy album receipt

Parent: `8d9f3f24642d8e094d8bda13ca083281382dc8e2` (V339). **CONDITIONAL_SOURCE_GO_RUNTIME_PENDING / NOT RELEASE READY**. DEC-006 source-only; no Build/Test/Static Checker/Runtime/CI/CD/deployment/merge.

## یافته‌های جدید
- **V340-ALBUM-01 / HIGH:** V339 L1034–1048 legacy v112 album write uses save()/global flush and unconditionally restores old album state on any failure, including render after commit. L1071–1079 removes parents without guarding children, causing persisted invalid hierarchy on reload. V340 uses attributable workspace receipt, distinct post-commit UI handling, valid scope and child guard. Older v112 view superseded by active V222; actual legacy UI reachability not established.
- **V340-PAGE-01 / P0:** V339 L8931–8959 page duplicate/delete enqueue saveProject then unconditionally undo on false global flush; committed operation with later unrelated failure can diverge from IndexedDB. Portfolio deletion L2411–2420 resets all editor state without draft guard. V340 prechecks mutation status, uses exact receipts and guarded post-commit UI; protects unresolved continuation markers and open catalog drafts. No schema change.
- **V340-CUT-01 / P0:** V339 L14880–14910 cut commits deletion before volatile v235PageClipboard publication, so close/reload/failed paste loses the only live page; clipboard compares only workspace ID and is missing from dependency references L9115–9119 and resetAll L9161. V340 changes cut to deferred intent: preserve source until atomic move/paste, guard exact root, source record/content, destination and locks/flow; include page clipboard in dependency closure, clear on full context reset, reject stale menu owner. Cut now leaves source visible until successful paste; existing clone ID behavior and cross-portfolio data guard preserved. Actual runtime not run.

## دامنه مرور
P0: legacy v112/v220 albums, project/portfolio deletion, direct page duplicate/delete and context menu, receipts, cut/paste. A14: style/asset/component reference protection and root isolation. A13/Region: gePageTxn/geApplyPageTxn, v275Discard, drag/adopt checks read; no fresh confirmed defect remediated there. Text Flow: deletion/detachment guards reviewed. Graphics: print settings persistence remains open. V220 legacy unscoped folder paths and other uncovered source require follow-up. No claim of full source coverage. No Native/schema change.

## پذیرش
237 ردیف = 229 پیشین + 8 جدید، همه NOT_RUN. هیچ PASS منتقل نشد. Cut اکنون تا Paste قطعی مبدأ را حذف نمی‌کند.
