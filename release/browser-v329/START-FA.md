# Browser V329 | A14 — Persistence Receipt and Journal follow-up

Parent: fdaa42bb4cd248f37299c765334506d882e7829c (V328). **SOURCE_CHANGED_RUNTIME_PENDING / NOT RELEASE READY**. DEC-006: no Build, Test, Static Checker, Runtime, CI/CD, Deployment or Merge.

- A14-RF-01: Receipt rechecks exact candidate, owner, queue revision and pending state at undo time; storage flags precede DOM status; rejected root replacement blocks stale scope retry.
- A14-RF-02: Project switch/create/rename/legacy deletion and portfolio activation consume attributable receipts; committed UI failure never restores previous state.
- A14-RF-03: Managed project registry deletion consumes operation receipt for active/inactive and disk-backed paths; workspace, record and revision checked during disk preparation.
- A14-RF-04: Journal requires exact base revision for rejection or base+1 with matching receipt for commit; rereads before disk mutation and journal removal; ambiguous successor retains recovery evidence.
- A14-RF-05: Style save, public image rename, template/page creation, album mutations and image reset consume per-write receipts.
- A14-RF-06: NSP Data Controls and component definition writes consume attributable receipts; import rechecks original owner snapshot and blocks rejected root-scope retry.

Journal recovery deliberately stops after ambiguous later revisions. Browser and disk cannot share one atomic transaction. Direct page-only writes and pre-enqueue paths still require review. Native and schema unchanged. 162 acceptance rows: all NOT_RUN.

[Owner acceptance](OWNER-ACCEPTANCE-FA.md) · [Evidence template](OWNER-RESULTS-TEMPLATE.json) · [Matrix](ACCEPTANCE.json) · [Checkpoint](CHECKPOINT.json)
