# Browser V323 | A14 — independent source audit, first follow-up

Parent: 4bddfc4d5e5c71e17a21739c2a28bf25949d0afc (V322). **PARTIAL / SOURCE_CHANGED / RUNTIME_PENDING**. DEC-006: no Build, Test, Static Checker, Runtime, CI/CD, Deployment or Merge.

- A14-IA-01: New pins record an explicit ownerId distinct from their closure-local root. Normalization, graph, scene resolution and archived selection check ownership. Scoped portfolio import remaps outer owner links while preserving closure-local IDs. Old pins remain without fabricated provenance; a differing legacy root receives a diagnostic warning, not automatic repair.
- A14-IA-02: Validate Region ancestry in pinned definitions; enforce byte limits again after normalization for pins and archives. No silent pruning.
- A14-IA-03: Refuse pinned detach where a child crosses the original frame or shadows, frame opacity or background make exact extraction uncertain; no mutation before these guards.

Remaining source review: legacy style links, archive-only asset deletion, ownership and persistence boundaries, A13 regression paths. Full visual parity, scoped-import nested detach and runtime acceptance are not verified. The optional ownerId is additive; Browser schema version and Native remain unchanged. All acceptance rows remain NOT_RUN. No publication or main merge.

[Acceptance](ACCEPTANCE.json) · [Checkpoint](CHECKPOINT.json)
