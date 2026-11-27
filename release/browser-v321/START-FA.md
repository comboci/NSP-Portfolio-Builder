# Browser V321 | A14 — Component Revision initial source candidate

Parent V320: 9465064fd8b99c9e9c39e0b8311cee286220d306. **PARTIAL / SOURCE_CHANGED / RUNTIME_PENDING.** DEC-006: no Build, Test, Static Checker, Runtime, CI/CD, Deployment or Merge.

- A14-01: Common revisions archive previous root and full dependency closure; bounded lineage, legacy revision gap preserved, no silent pruning
- A14-02: Nested Pinned closures validated with independent scope and depth/expansion limits; renderer uses definition identity, no hidden live substitution
- A14-04: Scoped export/import retains common and hotel archives; recursively collect/remap styles in closed snapshots; assets remain recursively closed
- A14-05: Pinned Detach resolves actual revision; unsafe transforms fail closed and nested dependencies remain pinned

Unapplied source packages:
- A14-03: anchor        const definitions=V.componentDependencies.collect(state.customComponents,[o.componentId]).map(d=>({
        id:d.id,name:d.name,width:d.width,height:d.he

Common archive snapshots record the old definition and the dependency closure at the instant of supersession; no earlier historical dependency state is fabricated. Capture freezes referenced central text styles where available. The archive is bounded to 12 records and 8 MB per definition; the pin is bounded to 2 MB and graph depth/expansion limits. Overflow is rejected; no automatic pruning. Scoped archives preserve closure-local IDs; only external references are remapped. Pinned detach refuses geometry/ownership ambiguity; exact display parity and legacy fallback behavior are unverified. The active dependency graph conservatively retains the live edge for explicit relink. Old imported archives and existing legacy pins are not rewritten to invent provenance.

A14 remains open for independent source review: archive normalization and identity, resource/dependency deletion, storage size, exact typography/renderer and scoped import closure, and A13 paths. No assertion of runtime success, durability, performance or release readiness. Browser/PDF/ZIP/IndexedDB and cumulative acceptance remain NOT_RUN. No schema version, Native or standalone graphics-core change.

[Cumulative acceptance](ACCEPTANCE.json).
