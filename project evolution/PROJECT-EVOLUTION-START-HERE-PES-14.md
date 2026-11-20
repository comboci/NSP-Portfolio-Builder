# NSP Portfolio Builder — Project Evolution START HERE (PES-14)

Read **Project-Evolution-V1-PES-14.json** before modifying source. This folder is the project's persistent knowledge record, not a substitute for checking live source.

## Required startup
1. Read this Help and the current PES-14 JSON.
2. Re-fetch the current `main` HEAD and compare with `release_context.source_revision_ref`.
3. Read Product Purpose, scopes, decisions, business rules, requirements, open questions and tasks.
4. Treat current architecture/operational context as **derived**; inspect freshness and source evidence.
5. Separate proposed/approved requirements from verified implementation, runtime observation and owner acceptance.
6. Check for concurrent Work changes; merge by stable record IDs before writing.
7. Never run Test or Build; user performs runtime review.
8. Update Project Evolution with each durable change; preserve prior decisions and history.

## Scope of this project
Project -> multiple independent Portfolios/Catalogs -> independent Pages. Page templates are in a system-wide library whose Cover/About/Contents/Gallery categories exist only for discovery; applying a template creates page-owned elements, not a live Master/Section hierarchy. Reusable named Custom Components are constructed from editor objects, placed in the same Toolbox, stored by project and linked across their instances; per-instance geometry remains local. A project has a private image library; the Global Library is shared by explicit action. Image edits are non-destructive, and page numbers reflect actual sequence even if cover number is hidden. **V137 phase 1 retains legacy Master/Section records and compatibility code internally pending TASK-075; no full decommission, data reset or runtime acceptance is claimed.**

## Record semantics
Statement = source input; Question = open issue; Analysis = reasoning; Finding = supported issue; BusinessRule = domain rule; TechnicalContract = interface reference; Requirement = desired behavior; Decision = selected choice; Task = execution work; Evidence = grounded support; Verification = observed check; Acceptance = owner approval; Observation = timestamped runtime/deployment fact.

## Integrity
- PES standard is 14.0.0. Do not mix this with software release or Project Evolution V1.
- No passwords, tokens or private keys.
- No invented implementation, tests, deployment, or acceptance.
- No silent deletion of records or rewriting history.
- Any mismatch between PE and source blocks source mutation until reconciled.
- See original PES-14 Portable Starter Pack for normative schema, semantic rules and compatibility profile.

## V137 owner-approved architecture decision
- DEC-012: Master/Section authoring hierarchy is superseded by page-first independent design.
- DEC-013: linked project-local Custom Components in the shared Toolbox. No dedicated separate library UI.
- DEC-010: existing centralized Style Library stays until Q-006 is explicitly resolved; do not invent project-specific style forks.
- See TASK-072..TASK-077 for stage-one source status and remaining legacy decommission/data-integrity work. Do not call these accepted or tested.
- DEC-006 forbids assistant Build, Test and static checker; owner performs runtime/PDF review.
