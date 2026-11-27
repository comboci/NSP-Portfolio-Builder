# Browser V318 | NSP-GE-AUDIT-02 / independent A13 source review

Parent V317: de3e8b60e64693067f3ec589e3c73bfc71f413f6. Baseline V315: 7378c19c22c468f7470215820bcbb02d5bf56754. Comparison covers A13 V316 and V317. **PARTIAL / SOURCE_CHANGED / RUNTIME_PENDING**. DEC-006: no Build, Test, Static Checker, Runtime, CI/CD, Deploy or Merge.

| ID | Severity | Source observation | Change |
| --- | --- | --- | --- |
| A13-IA-01 | HIGH | Group Resize, keyboard and direct property paths missing shared min/max/aspect checks | SOURCE_CHANGED_RUNTIME_PENDING |
| A13-IA-02 | HIGH | Protected/grouped child could preview detached geometry and retain invalid relationship; prior nesting not checked | SOURCE_CHANGED_RUNTIME_PENDING |
| A13-IA-03 | HIGH | Every reactive Region ran after any watched object edit; unrelated locked/invalid Region blocked valid layout | SOURCE_CHANGED_RUNTIME_PENDING |
| A13-IA-04 | HIGH | Property handler scheduled Text Flow after commit failure; coalesced property save lacked rollback | SOURCE_CHANGED_RUNTIME_PENDING |
| A13-IA-05 | HIGH | Planner/preview did not share raw bounds/stroke checks; multi-page delete bypassed generic guard | SOURCE_CHANGED_RUNTIME_PENDING |
| A13-IA-06 | MEDIUM | Repeated ancestry/subtree scans in resolved scene and commit; replace with scoped graph indexes | SOURCE_CHANGED_RUNTIME_PENDING |
| A13-IA-07 | MEDIUM | Overflow page creation lacked structural history and style staleness guard; central style editing could race batch | SOURCE_CHANGED_RUNTIME_PENDING |
| A13-IA-08 | MEDIUM | Font evidence accepted any loaded face in matching family without matching style/weight | SOURCE_CHANGED_RUNTIME_PENDING |

- Common geometry guards include actual line stroke, raw paper bounds, size constraints, aspect ratios and prior/new Region lineage. Existing unrelated legacy data is not normalized. Group resize and property/pointer changes use shared size guard. Protected Text Flow is not moved by automatic layout. The explicit multi-page delete path now also checks the candidate's Region graph.
- Reactive layout targets dirty Regions identified by changed/removed objects and old/new ancestry. Sort outer-to-inner and propagate when child Region geometry changes; unrelated valid or invalid roots are not automatically rearranged. On an invalid detached plan, retain the user's deliberate edit (to permit repairs), never commit a partial auto layout, retain last issue in memory. Style batch requires explicit opt-in and retains page-scoped history.
- Failed synchronous enqueue restores prior content and history. Property follow-up Text Flow requires successful commit return (enqueue is not durability). Undo waits for clean persistence. Overflow copy now uses structural page history and guards unchanged style library; no automatic delete or duplication of legacy flows.
- FontFaceSet/local evidence is conservative, including registered face style/weight check; no claim of exact glyph coverage. Scene graph indexed per detached resolved document, not cached across editor mutations. No benchmark claim.

## Boundaries / outstanding review
Nested Regions remain rigid inside parent's Auto Layout, with explicit editor resize; batch covers portfolios of current loaded project only. Source review is targeted, not exhaustive proof of all legacy import, page-format, clipboard, component and history paths. Runtime and async storage conflict drills, actual PDF, font coverage, ZIP, IndexedDB and performance all NOT_RUN. Review interactions of modified guards with older data and every generic editor caller before final acceptance. No schema bump, Native or standalone graphics-core changes. A14 remains separate. See cumulative ACCEPTANCE.json.
