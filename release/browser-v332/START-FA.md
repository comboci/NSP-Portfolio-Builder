# Browser V332 | Hotel Text — V331-RT-002

Parent: 109ea6fc1ea44d233120d00bd3766e4571892fb3 (V331). **CONDITIONAL_SOURCE_GO_RUNTIME_PENDING / NOT RELEASE READY**. DEC-006 remains in effect for this source-only pass.

## Evidence from Dot

V331-AUDIT-FA.md: 180 formal rows, PASS 18 / FAIL 0 / BLOCKED 1 / NOT_RUN 161, NO-GO. 29 P0 subtests successful; P0 coverage incomplete. V330-RT-001 confirmed corrected on V331 Chromium with 0/26 vertical overflows vs 24/26 on V330, actual PDF and tiny-frame negative control. Independent exploratory finding V331-RT-002: Hotel Text, North Riverside Grand Conference Hotel / Newcastle upon Tyne, 29 px fixed height vs 58 px wrapped content; observed on both V330 and V331. This is not a View/Grid regression. Performance observation: 100-card cold projection ~193.8–255.6 ms on V331, no acceptance threshold established.

## Source changes

- V331-RT-002: Dot reproduced a long Hotel Text record wrapping into two lines: fixed frame 29 px vs actual 58 px, blocking print in V330 and V331. V332 measures natural wrapped height using the existing text renderer at selected font size, advances subsequent rows by measured height, preserves full underlying text and unchanged print-blocking diagnostics.
- V332-TX-02: Measure custom Hotel Text at its final scaled slot width and typography including borders and effects, without measuring the discarded default layout. Bounded separate 1024-entry height cache invalidated on font loading events. Inline mode verifies total capacity; insufficient or unmeasurable height fails closed. V331 Hotel View/Grid fitting algorithm not changed.

Hotel Text preserves selected font size, measures complete strings with the current renderer, allocates each row its natural rounded-up height, and advances subsequent records accordingly. Custom slots pass final typography and border into measurement. Inline records retain the available frame and verify height. Insufficient space keeps the diagnostic and does not permit incomplete printing. No stored geometry or hotel data change. Existing strict A13 font-evidence gate and overflow preflight are not weakened. Current fallback metrics can change when fonts load; real output remains subject to preflight. Cache 1024 entries, invalidation on font loading events. No change to the validated V331 View/Grid Auto-Fit algorithm. Runtime verification and performance remain open.

## Acceptance

186 rows, all NOT_RUN for this exact containing commit. No old PASS carried forward. Repeat P0 and exact V330-RT-001/V331-RT-002 fixtures, validate mixed PDF without removing Hotel Text, then complete all outstanding rows. No build, tests, checker, runtime, deployment or merge performed in this pass. Native/schema unchanged. ReleaseReady=false.

[Owner acceptance](OWNER-ACCEPTANCE-FA.md) · [Evidence template](OWNER-RESULTS-TEMPLATE.json) · [Matrix](ACCEPTANCE.json) · [Checkpoint](CHECKPOINT.json)
