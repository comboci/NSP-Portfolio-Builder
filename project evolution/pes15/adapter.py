#!/usr/bin/env python3
"""PES-15 Portfolio Builder read-only integration bridge (opt-in, isolated outputs).

The application remains PES-14. This bridge never writes to the supplied input,
GitHub or the product's SQLite database. PES-15 engine is a separate dependency.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import shutil
import sys
from typing import Any


class BridgeError(RuntimeError):
    """Known integration or safety constraint violation."""


def inspect_snapshot(source: Path, output_dir: Path, *, source_commit: str = "") -> dict[str, Any]:
    """Migrate, validate, store, verify and retrieve in a brand NEW directory.

    The original source is deliberately read-only and is never opened for writing.
    output_dir is created exclusively; an existing location is always rejected.
    """
    from pes15.core import RECORD_GROUPS, read_json
    from pes15.migration import migrate_v14
    from pes15.validation import validate, errors_only
    from pes15.retrieval import context
    from pes15.store import CanonicalStore
    from pes15.cli import write_new

    source = source.expanduser().resolve(strict=True)
    output_dir = output_dir.expanduser().resolve()
    if not source.is_file():
        raise BridgeError("source must be a regular PES-14 JSON file")
    if source in output_dir.parents or source == output_dir or output_dir == source.parent:
        raise BridgeError("output location may not contain or replace the source")
    if output_dir.exists():
        raise BridgeError("output directory must not exist: use a fresh path")
    if source_commit and (len(source_commit) != 40 or any(c not in "0123456789abcdef" for c in source_commit.lower())):
        raise BridgeError("source commit must be a full 40-character Git SHA")

    before = hashlib.sha256(source.read_bytes()).hexdigest()
    legacy = read_json(source)
    if legacy.get("_pes", {}).get("standard") != "PES-14":
        raise BridgeError("source is not PES-14; refusing implicit conversion")
    result = migrate_v14(legacy)
    for key in ("records", "scopes", "relationships", "open_state", "continuation"):
        if legacy[key] != result[key]:
            raise BridgeError("lossy migration: " + key)
    issues = validate(result)
    errors = errors_only(issues)
    if errors:
        raise BridgeError("PES-15 validation failed: " + "; ".join(x.code for x in errors[:6]))
    contract_id = next(x["contract_id"] for x in result["retrieval"]["contracts"] if x["contract_id"].startswith("RETRIEVAL-PES15-FULL"))
    context_payload = context(result, contract_id=contract_id)

    # Only after successful preflight may a new isolated folder be created.
    output_dir.mkdir(parents=True, exist_ok=False)
    try:
        write_new(output_dir / "migrated-pes15.json", result)
        store = CanonicalStore(output_dir / "pes15-canonical.sqlite")
        head = store.init(result, actor="portfolio-builder-readonly-bridge", reason="opt-in assessment")
        verified = store.verify()
        if not verified["ok"]:
            raise BridgeError("PES-15 store verification failed")
        backup = store.backup(output_dir / "pes15-backup.sqlite")
        if not CanonicalStore(output_dir / "pes15-backup.sqlite").verify()["ok"]:
            raise BridgeError("backup verification failed")
        write_new(output_dir / "continuation-context.json", context_payload)
        after = hashlib.sha256(source.read_bytes()).hexdigest()
        if before != after:
            raise BridgeError("input source changed during assessment; output discarded")
        report = {
            "bridge_version": "1.0.0", "mode": "read-only-opt-in",
            "source": str(source), "source_git_commit": source_commit or None,
            "source_sha256_before": before, "source_sha256_after": after,
            "source_unchanged": True, "legacy_records_preserved": legacy["records"] == result["records"],
            "legacy_scopes_preserved": legacy["scopes"] == result["scopes"],
            "legacy_relationships_preserved": legacy["relationships"] == result["relationships"],
            "total_records": sum(len(legacy["records"][group]) for group in RECORD_GROUPS),
            "record_counts": {group: len(legacy["records"][group]) for group in RECORD_GROUPS},
            "legacy_missing_task_priority": len(result["_pes"]["legacy_exceptions"]["task_priority_missing"]),
            "legacy_missing_observation_time": len(result["_pes"]["legacy_exceptions"]["observation_time_missing"]),
            "validation_warning_codes": sorted({i.code for i in issues if i.severity == "warning"}),
            "store_verified": verified["ok"], "backup_revisions": backup["revisions"],
            "initial_revision": head["revision"], "retrieval_contract": contract_id,
            "retrieval_warnings": [w["code"] for w in context_payload.get("warnings", [])],
            "notes": [
                "App and legacy PES-14 remain unchanged; integration is side-by-side only.",
                "Migration does not invent priority, timestamp, verification or acceptance.",
                "Local output directory contains an isolated PES-15 store, not the app's SQLite DB.",
            ],
        }
        write_new(output_dir / "assessment-report.json", report)
        return report
    except BaseException:
        # Roll back files created exclusively in this run only.
        shutil.rmtree(output_dir)
        raise


def build_cli() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source", type=Path, required=True, help="local copy of PES-14 canonical JSON")
    p.add_argument("--output-dir", type=Path, required=True, help="NEW directory: must not already exist")
    p.add_argument("--source-commit", default="", help="40-character Git commit used for source copy")
    return p


def main(argv=None) -> int:
    args = build_cli().parse_args(argv)
    try:
        report = inspect_snapshot(args.source, args.output_dir, source_commit=args.source_commit)
    except (BridgeError, ValueError, KeyError, OSError, RuntimeError) as exc:
        print(f"PES-15 Bridge ERROR: {exc}", file=sys.stderr)
        return 2
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
