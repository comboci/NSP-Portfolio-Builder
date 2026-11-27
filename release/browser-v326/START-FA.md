# Browser V326 | A14 — gate follow-up and owner acceptance preparation

Parent: 325ba233a17f5ca142a8d4f26f826c56317ca4f3 (V325). **CONDITIONAL_SOURCE_GO_RUNTIME_PENDING / NOT RELEASE READY**. DEC-006: no Build, Test, Static Checker, Runtime, CI/CD, Deployment or Merge.

- A14-GF-01: Distinguish missing key, empty/non-text payload and nonzero-revision missing data at startup; never initialize over invalid persisted data
- A14-GF-02: Expose direct raw textual export without portable JSON cap; raw-only checkpoint flag, preserve empty textual payload, refuse non-text replacement; cancel conflict reload on draft export failure
- A14-GF-03: Clear catalog draft, clipboard and page session on full editor reset, including restore to identical workspace IDs
- A14-GF-04: Require explicit full save for legacy workspace without persisted owner ID; compare normalized common definition bodies and archives on page-only persistence rather than raw serialization
- A14-GF-05: Do not roll back image reset in memory after confirmed persistence when UI refresh fails; distinguish committed restore with failed UI and block restored draft opening

The explicit first full save requirement applies only to legacy payloads without a persisted workspace ID. Normalized comparison uses copies; no prior archive is automatically rewritten by comparison. Raw download is text only, not a physical database backup or importable recovery file; unsupported non-text/missing records require manual preservation. Confirmed image reset must not be rolled back in memory because of a later UI failure. No claim of complete A13 regression, verified runtime, visual parity or performance. No schema version or Native change.

[Owner acceptance](OWNER-ACCEPTANCE-FA.md) · [Acceptance matrix](ACCEPTANCE.json) · [Checkpoint](CHECKPOINT.json)
