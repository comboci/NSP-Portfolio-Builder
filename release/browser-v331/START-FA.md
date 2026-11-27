# Browser V331 | Hotel View / Hotel Grid — V330-RT-001

Parent: f2646e943640acbe5ca0fbe6ddc9d5c32bfa9102 (V330). **CONDITIONAL_SOURCE_GO_RUNTIME_PENDING / NOT RELEASE READY**. DEC-006 remains in effect for this source-only pass.

## Evidence from Dot

V330-AUDIT-FA.md (independent runtime audit, 2026-11-27): 174 rows, PASS 15 / FAIL 1 / BLOCKED 1 / NOT_RUN 157; 25 P0 subtests successful, not full P0 acceptance. 24 vertical overflow errors blocked hotel PDF. Tehran city View 19/23 px and Grid 10/13 px (frame/content); hotel name 65/90 and 30/42 px. Simple A4 PDF was positive control only. V330 source refs: index.html:17997–18012, 18036–18038, 10333–10355, 10534–10558.

## Source changes

- V330-RT-001: Dot V330 actual browser measurement: 24 vertical overflows in default Hotel View/Grid; Tehran city 19/23 and 10/13 px, hotel name 65/90 and 30/42 px. V331 computes line-height-aware font ceiling and measures bound card text in the final projected slot via existing text renderer; bounded cache; no text truncation, no preflight suppression.
- V331-HT-02: Grid default rows reserve more vertical capacity and clamp requested spacing within remaining card height. All bound visible card labels fit against final slot dimensions, including edited Component Editor definitions; preserve hidden/static authored elements and underlying data. At minimum 6 px, an unfittable field remains a print-blocking diagnostic.

The fit algorithm uses the existing hidden natural-height renderer, measures the complete bound string in the final geometry, limits the font by actual line-height, and searches in quarter-pixel steps down to the existing 6 px floor. It does not alter saved instance/record/slot data or the preflight rules. It does not auto-fit unrelated authored static text. Fit cache capped at 1024 entries, invalidated on font loading events. Grid rows intentionally differ from V330 to reserve more space. Spacing is capped by remaining height. This is a source candidate; cache, font timing, readability, fallback, browser/print parity and performance require real validation.

## Acceptance

180 rows, all NOT_RUN for this exact containing commit. No old PASS carried forward. First repeat the P0 safety checks and V330-RT-001 exact reproduction, then targeted V331 scenarios and all outstanding rows. No build, tests, checker, runtime, deployment or merge performed in this pass. Native/schema unchanged. ReleaseReady=false.

[Owner acceptance](OWNER-ACCEPTANCE-FA.md) · [Evidence template](OWNER-RESULTS-TEMPLATE.json) · [Matrix](ACCEPTANCE.json) · [Checkpoint](CHECKPOINT.json)
