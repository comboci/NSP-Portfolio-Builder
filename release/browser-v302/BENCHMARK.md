# GE-010 / GE-011 owner-only benchmark | NOT_RUN

No measurement yet. Owner only under the repository policy; use isolated, wholly synthetic Browser data. Do not use a real workspace, upload traces, change deployments or run Native under these measurements.

## Fixed inputs
- Baseline immutable Browser V291 c6b781d51e39cc36a70bfbe8eec39e5d316cf5e4; candidate V302 containing this document. Record immutable SHAs and SHA-256 of both index.html files.
- Make one disposable V291, 5-page independent A4 landscape portfolio. Repeat cycle: 40 simple text frames; 40 mixed RTL/LTR frames (ZWNJ); 24 shapes and a rotated/mirrored grouped image; 16 objects with two Regions (one proportional); 12 shapes with synthetic Hotel Text/View/Grid and logo. Two local two-color PNGs (320×180 and 1200×800), reused by ID, no payment, personal or external data. No references across pages, cross-page continuation, or external URLs. One seed committed to owner records by SHA, not repository.
- Export through V291 Single Portfolio Export. Owner fixture utility: `node synthetic-fixtures.cjs seed.json new-empty-output-dir --synthetic-seed`. Use exactly the same 10/100/500 JSONs on both versions and log SHA/count. Inspect import, ownership, object order and per-page references before timing. Refuse any differing dataset or data loss.
- Same hardware, power mode, Chromium build, clean isolated profile/renderer, reachable fonts, 1600×1000 at DPR 1. Record CPU/RAM/GPU and display refresh. Zoom 100% baseline, repeat drag at 50% and 200%. Alternate run order. One warm-up, five measured independent attempts per workload except 10 drag traces per zoom.

## Workload and gates
1. Measure cold open from navigation to stable visible editor and saved state; record import separately. Measure 1 → midpoint → last → 1 switching and peak memory.
2. Drag with 120 points over 2 s; translation, rotated/mirrored resize, snapping, proportional Region resize and Region move; cancellation/Escape and pointer-capture loss. Capture presented-frame interval p95 and event-handler latency separately. Check zero writes during drag/cancel, one committed change on accepted release, expected membership; abort on geometry or save mismatch.
3. 100 controlled edits to one of 40 objects. Measure Undo/Redo and multi-step jump separately, cap and per-page isolation; verify labels, selection, inline data, style/order/Region state and no asset deletion when a history reference remains. Use reversible rejected save in disposable owner-only conditions to verify rollback and retry signal. Do not use live databases.
4. Record JS heap and renderer private memory/RSS separately (identify OS tool/units); record raw CPU, peak and settled memory. Report median/tail/failures and rejected trials; no speed claim before measured results.
5. Measure PDF preparation up to print handoff separately from native dialog interaction. Validate both actual output PDFs and broken required synthetic image, with settings and occurrence identities from G10 V301. Export/reimport stable project/portfolio JSON and compare equivalent canonical content, excluding only intentional version/time fields.

Output columns: candidate immutable SHA, fixture SHA/count, test/run, zoom, elapsed ms, presented-frame p95 ms, handler duration, CPU, renderer memory, JS heap, data result, failures. Everything starts **NOT_RUN**. Correctness overrides speed; no final PASS/slowness inference at source level.
