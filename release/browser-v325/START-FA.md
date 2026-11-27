# Browser V325 | A14 — final source gate review

Parent: f9246658e79a587a2e554fcd63e508d37d18a6a5 (V324). **CONDITIONAL_SOURCE_GO_RUNTIME_PENDING / NOT RELEASE READY**. DEC-006: no Build, Test, Static Checker, Runtime, CI/CD, Deployment or Merge.

- A14-FG-01: Startup and full restore share workspace validation; inactive scope checked; reject nested registry and malformed Tile without overwriting stored payload; validate draft ownership before restore
- A14-FG-02: Restore checks owner and revision after asynchronous guard, blocks concurrent editing, requires prior backup, reports CAS conflict and distinguishes post-commit UI failure; raw recovery preserves previous payload and exposes invalid backups as raw exports
- A14-FG-03: Q-005 public images hidden, never removed by library reset; only unreferenced active private resources removed; mixed delete stops on failed public mutation; private delete/undo blocked during uncertain persistence
- A14-FG-04: A13 expected-side history snapshots and editor/clipboard references protected; component delete checks draft identity and live edges without conflating closed snapshot IDs
- A14-FG-05: Valid common archive records retain additive metadata during normalization; no fabricated legacy provenance

Gate: conditional source handoff only. All acceptance rows remain NOT_RUN. Startup may surface latent invalid inactive workspace records in recovery instead of permitting a rewrite. Raw recovery is refused if prior payload cannot be backed up; raw exports are not recovery files and existing export size limit applies. Reset hides all public images in accordance with Q-005, including unreferenced images; only unreferenced active private images removed. Previous legacy provenance and scoped nested detach restrictions unchanged. No Native or schema version change. A13 review covered dependency lifetime in expected history snapshots and deletion guards; complete regression and operational acceptance remain open. No verified parity, storage durability or performance claims.

[Acceptance](ACCEPTANCE.json) · [Checkpoint](CHECKPOINT.json)
