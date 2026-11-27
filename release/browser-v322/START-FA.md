# Browser V322 | A14 — archive selection and nested Pin follow-up

Parent V321: 435084da058107f7aed6c815381eaea0fda0fd40. DEC-006: no Build, Test, Static Checker, Runtime, CI/CD, Deployment or Merge.

- A14-03: Properties displays actual Live/Pinned revision, permits selecting current or archived common revision and explicit relink. Pin inside an ordinary common component draft is allowed and its graph is checked before retaining the draft edit. On a conflict, restore the prior object snapshot. Pin and relink do not trigger reactive Auto Layout or alter instance geometry.
- The common toolbox displays current revision. Saving a draft with cyclic/missing Region ancestry is refused.

All five initial A14 source packages now have changes (V321 and V322). V321 archive, scoped import/export, and detach boundaries remain. Legacy revisions with no archive are not reconstructed. No claim of verified appearance, glyph coverage, storage or performance. Independent A14 source audit and cumulative A13/A14 acceptance still open; runtime remains NOT_RUN. No schema/native changes.

[Cumulative acceptance](ACCEPTANCE.json).
