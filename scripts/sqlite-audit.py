#!/usr/bin/env python3
"""Read-only SQLite integrity check for NSP Portfolio Builder (schema 6+).

Usage: python scripts/sqlite-audit.py "/path/to/storage/portfolio.sqlite3"
Close the desktop app before running a filesystem-level database/asset backup.
"""
import argparse
import json
import sqlite3
from pathlib import Path

EXPECTED = {
    "workspace_projects", "workspace_portfolios", "workspace_pages",
    "shared_template_context", "shared_templates", "shared_styles",
    "global_template_dependencies", "asset_files", "image_files",
    "image_project_owners", "image_public_catalog", "image_usage_edges",
    "image_backup_refs", "projects", "images", "templates", "pages",
    "image_refs", "scene_entities", "scene_links", "backups",
    "named_backups", "schema_migrations", "storage_format_meta",
}


def audit(db_path: Path) -> dict:
    if not db_path.is_file():
        raise FileNotFoundError(db_path)
    # Never create or change an existing user database during inspection.
    conn = sqlite3.connect(db_path.resolve().as_uri() + "?mode=ro", uri=True)
    try:
        present = {row[0] for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        )}
        missing = sorted(EXPECTED - present)
        report = {
            "sqlite_schema_version": conn.execute("PRAGMA user_version").fetchone()[0],
            "integrity_check": conn.execute("PRAGMA integrity_check").fetchone()[0],
            "foreign_key_violations": conn.execute(
                "PRAGMA foreign_key_check"
            ).fetchall(),
            "missing_tables": missing,
        }
        if not missing:
            report["counts"] = {table: conn.execute(
                f'SELECT COUNT(*) FROM "{table}"'
            ).fetchone()[0] for table in sorted(EXPECTED)}
            report["orphan_backup_image_refs"] = conn.execute(
                """
                SELECT COUNT(*) FROM image_backup_refs r
                WHERE (r.backup_kind='automatic'
                   AND NOT EXISTS (SELECT 1 FROM backups b WHERE b.id=r.backup_id))
                   OR (r.backup_kind='named'
                   AND NOT EXISTS (SELECT 1 FROM named_backups b WHERE b.id=r.backup_id))
                   OR r.backup_kind NOT IN ('automatic','named')
                """
            ).fetchone()[0]
            report["orphan_usage_assets"] = conn.execute(
                """
                SELECT COUNT(*) FROM image_usage_edges e
                WHERE NOT EXISTS (SELECT 1 FROM asset_files f WHERE f.hash=e.asset_hash)
                """
            ).fetchone()[0]
        report["ok"] = (
            report["integrity_check"] == "ok"
            and not report["foreign_key_violations"]
            and not missing
            and report.get("orphan_backup_image_refs", 0) == 0
            and report.get("orphan_usage_assets", 0) == 0
        )
        return report
    finally:
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("database", type=Path, help="Path to portfolio.sqlite3")
    args = parser.parse_args()
    try:
        result = audit(args.database)
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except (OSError, sqlite3.Error) as exc:
        parser.exit(2, f"SQLite audit failed: {exc}\n")
    raise SystemExit(0 if result["ok"] else 1)
