# Browser V314 | NSP-GE-AUDIT-02 / A11 — Style Flow and Component Diagnostics

**SOURCE_CHANGED / RUNTIME_PENDING.** Parent V313: cb9c082cbc01985547b21c964e17b1b6c84f4c6f. Browser only. No schema migration, native change, merge, build, test, checker, benchmark or deploy (DEC-006).

- GE-027: attaching/detaching a style queues the existing guarded Text Flow operation only after an accepted edit; legacy vector text/continuation frames are excluded. Diagnostics recognizes recorded linked metrics after detachment. The Style Library exposes an explicit batch for stale manuscripts in the currently active portfolio, without switching portfolios. Each reflow retains independent structural history and checks owner, scope, route and metrics before asynchronous writes; the first rejected/locked/conflicting request stops the batch. Cross-portfolio/global batch remains open.
- GE-036 (new, related GE-024/030): Diagnostics checks the pinned instance closure rather than caching by live ID. Live hotel instances report actual fallback; pinned instances retain the version-availability warning. Revision archive and nested pins remain open.
- GE-021: diagnostics flags legacy or unknown-provenance continuation pages. This is detection, not reconciliation. Existing user data is not automatically rewritten.
- Updated title/meta/header; standalone HTML retained.

Owner acceptance — all NOT_RUN:
1. Link/unlink a different-metric style on an overflowing manuscript; save/reload, undo/redo, edited and locked continuation protection.
2. Two stale flows in the active portfolio and another portfolio with duplicate IDs. Confirm batch; change scope/route/style during font wait, reject save, lock a continuation. Verify exact owner, stop behavior and counts.
3. Two pinned closures of the same common component with different nested revisions and a live instance; validate each graph separately. Check actual live hotel fallback versus successful live upgrade.
4. Old continuation without contentPolicy; warning and no silent deletion. Compare isolated backup and both PDF paths.
5. Inherited V313 37-case matrix remains NOT_RUN; not release ready.

Next: safe legacy reconciliation and remaining Auto Layout constraints, then typography/gradient and measured performance.
