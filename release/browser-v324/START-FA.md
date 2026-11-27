# Browser V324 | A14 — independent source audit, second follow-up

Parent: 7499df3d109656520b236a27254e540292a8e950 (V323). **PARTIAL / SOURCE_CHANGED / RUNTIME_PENDING**. DEC-006: no Build, Test, Static Checker, Runtime, CI/CD, Deployment or Merge.

- A14-IA-04: Central style deletion now includes editor history, drafts and same-workspace clipboard; clipboard asset refs also protected
- A14-IA-05: Portable import/export checks source-owned style and asset closure, duplicate private/public IDs, templates and archive-only dependencies before remapping
- A14-IA-06: Malformed Tile dependencies block asset removal; strict cells/stash structure required by dependency collector
- A14-IA-07: Page-only persistence rejects stored/queued common revision or archive mismatch and newly missing style references instead of silently using stale definitions
- A14-IA-08: Nested pinned detach with remapped outer identity is refused rather than guessing live child identity in destination

The review keeps closure-local IDs intact and leaves historical records untouched. Missing portable source dependencies are refused, not silently substituted from the receiving catalog. A malformed Tile conservatively blocks deletion; this is intentionally fail-closed. Page-only save checks common revision/archive and new style references, retaining already unresolved legacy page links. The imported nested Pin detach restriction is conservative; no claim of appearance parity. A13 property/history/flow regression and full workspace restore/reset and persistence review remain open. All acceptance rows remain NOT_RUN. No schema version or Native change.

[Acceptance](ACCEPTANCE.json) · [Checkpoint](CHECKPOINT.json)
