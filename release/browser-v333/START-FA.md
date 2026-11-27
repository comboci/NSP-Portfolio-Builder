# Browser V333 | Hotel Text dispatch and Custom Slot scope

Parent: 917814335df5444cc355e25571105031dd785bd1 (V332). **CONDITIONAL_SOURCE_GO_RUNTIME_PENDING / NOT RELEASE READY**. DEC-006 source-only restrictions maintained.

## Evidence and scope

The prior conversation summary reported V332 NO-GO, 15 PASS / 6 FAIL / 1 BLOCKED / 164 NOT_RUN (186 rows), 29 successful P0 subtests, default Hotel Text rendering a function instead of hotel data, and Custom Slot ReferenceError: V is not defined. The original V332 report and raw evidence bundle were not located in accessible files during this pass. Counts are reported, not independently verified. Both defects were independently confirmed by reading the exact V332 source. The V333 findings below use new source-review identifiers, not guessed Dot finding IDs.

## Confirmed source defects and changes

- V333-TX-01: Confirmed in V332 index.html lines 17859,17902,17916,17927,17997–18001: renderScene passed renderer tools as the third argument to layoutText, whose new third argument means slotEffects. Spread order in text() then allowed tools.text (a function) to overwrite the bound string. V333 explicitly separates text/card dispatch, filters visual overrides to an allowlist, and assigns the bound text after overrides.
- V333-TX-02: Confirmed in V332 index.html lines 18562–18564,18625–18635: the nsp-slots IIFE declared N but not V, then used V.graphicsCore.scene.shouldPaint(s) for Hotel Text custom slots. V333 explicitly binds V=V13 and N=V.nsp in that IIFE. No change to slot geometry, visibility contract or prior card fit algorithm.

V333 preserves the V332 measured-height design and V331 card fit algorithm. Only visual overrides are accepted in Hotel Text; bound content is authoritative. The slot renderer now declares its own engine reference. Stored geometry, schema, Native, and overflow preflight remain unchanged. Runtime behavior, font metrics, exact PDF content and cache/performance still require independent acceptance. No executable verification was performed.

## Acceptance

192 rows, all NOT_RUN for this exact containing commit. No prior PASS carried forward. Obtain the V332 original evidence and map all six reported failed rows before claiming coverage. Repeat P0, default/custom Hotel Text, V331-RT-002 and V330-RT-001, mixed PDF with no removed component, and all outstanding rows. No build, tests, static checker, runtime, deployment or merge performed. ReleaseReady=false.

[Owner acceptance](OWNER-ACCEPTANCE-FA.md) · [Evidence template](OWNER-RESULTS-TEMPLATE.json) · [Matrix](ACCEPTANCE.json) · [Checkpoint](CHECKPOINT.json)
