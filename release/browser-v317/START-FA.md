# Browser V317 | NSP-GE-AUDIT-02 / A13 follow-up

**PARTIAL / SOURCE_CHANGED / RUNTIME_PENDING**. Parent V316: d67e0c7e1d1b722a62f3816d6029d32369687026. Browser only. DEC-006: no Build, Test, Static Checker, Runtime, CI/CD, Deployment or Merge.

- Local Region graph: explicit child creation and parent change/detach, cycle/owner/lock checks, no silent shrinking on reparenting. Recursive selection and layer tree; existing invalid data is not automatically repaired.
- Recursive frame/proportional geometry with absolute page coordinates, ancestor bounds, min/max and fixed aspect checks. Nested parent Auto Layout still treats a Region as a rigid member; explicit editor resize is separate.
- Shared commit guard rejects introduced orphan/cycle and invalid nested geometry; changed nesting only, not automatic normalization of unrelated legacy data. Delete/Layer deletion, cut, Group constraints, align, duplicate and lock paths tightened; existing independent Text Flow protection remains.
- Text height uses conservative synchronous local/registered-font evidence in addition to FontFaceSet checks. It cannot certify exact glyph coverage; uncertain fonts may block a plan.
- Central style geometry propagation: explicit command for all portfolios of the currently loaded project, opt-in reactive fitTextHeight Regions only. Page-scoped save/history, exact counts, stop on owner/metrics/storage conflict. Other projects require opening the project and explicitly applying the command; no background mutation.
- No schema version change, Native or graphics-core file modification. Acceptance matrix remains NOT_RUN. Independent source review of generic editor paths and runtime acceptance are still required before release; A14 follows resolution of findings.

[Acceptance matrix](ACCEPTANCE.json)
