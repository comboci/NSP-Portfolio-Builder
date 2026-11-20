#!/usr/bin/env python3
"""Read-only SQLite integrity check for NSP Portfolio Builder (schema 11+).

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
    "image_page_private_refs", "image_page_public_refs",
    "image_template_public_refs", "automatic_backup_asset_refs",
    "named_backup_asset_refs", "reference_migration_issues",
    "style_page_element_refs", "style_template_element_refs",
    "style_reference_issues",
    "design_scenes", "design_scene_layers", "design_scene_groups",
    "design_scene_elements", "design_scene_template_links",
    "design_scene_projection_issues",
    "workspace_write_revision",
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
            # The canonical payloads are in workspace_pages/shared_templates.
            # A missing projection indicates an incomplete N-05 upgrade/save.
            report["pages_without_scene_projection"] = conn.execute(
                """
                SELECT COUNT(*) FROM workspace_pages p
                WHERE NOT EXISTS (
                    SELECT 1 FROM design_scenes s
                    WHERE s.owner_kind='page'
                      AND s.project_id=p.project_id
                      AND s.portfolio_id=p.portfolio_id AND s.page_id=p.id
                )
                """
            ).fetchone()[0]
            report["templates_without_scene_projection"] = conn.execute(
                """
                SELECT COUNT(*) FROM shared_templates t
                WHERE NOT EXISTS (
                    SELECT 1 FROM design_scenes s
                    WHERE s.owner_kind='template'
                      AND s.template_kind=t.kind AND s.template_id=t.id
                )
                """
            ).fetchone()[0]
            report["historical_scene_projection_issues"] = conn.execute(
                "SELECT COUNT(*) FROM design_scene_projection_issues"
            ).fetchone()[0]
            report["workspace_revision"] = conn.execute(
                "SELECT revision FROM workspace_write_revision WHERE id=1"
            ).fetchone()[0]
            report["pages_with_invalid_revision"] = conn.execute(
                "SELECT COUNT(*) FROM workspace_pages WHERE revision < 0"
            ).fetchone()[0]
            report["style_reference_migration_issues"] = conn.execute(
                "SELECT COUNT(*) FROM style_reference_issues"
            ).fetchone()[0]
            # Historical entries are diagnostic, not automatically a current FK error.
            report["orphan_usage_assets"] = conn.execute(
                """
                SELECT COUNT(*) FROM image_usage_edges e
                WHERE NOT EXISTS (SELECT 1 FROM asset_files f WHERE f.hash=e.asset_hash)
                """
            ).fetchone()[0]
            # The migration ledger preserves unresolved pre-V116 relationships.
            # This is historical evidence; current graph checks are independent.
            report["historical_migration_issues"] = conn.execute(
                "SELECT COUNT(*) FROM reference_migration_issues"
            ).fetchone()[0]
            report["unmapped_legacy_backup_refs"] = conn.execute(
                """
                SELECT COUNT(*) FROM image_backup_refs e
                WHERE NOT EXISTS (
                    SELECT 1 FROM automatic_backup_asset_refs r
                    WHERE e.backup_kind='automatic' AND e.backup_id=r.backup_id
                      AND e.asset_hash=r.asset_hash
                ) AND NOT EXISTS (
                    SELECT 1 FROM named_backup_asset_refs r
                    WHERE e.backup_kind='named' AND e.backup_id=r.backup_id
                      AND e.asset_hash=r.asset_hash
                )
                """
            ).fetchone()[0]
            report["unmapped_legacy_image_usage"] = conn.execute(
                """
                SELECT COUNT(*) FROM image_usage_edges e
                WHERE NOT EXISTS (
                    SELECT 1 FROM image_page_private_refs r
                    WHERE e.owner_kind='page' AND e.scope_id=r.project_id
                      AND e.owner_id=r.portfolio_id || '/' || r.page_id
                      AND e.image_id=r.image_id AND e.asset_hash=r.asset_hash
                ) AND NOT EXISTS (
                    SELECT 1 FROM image_page_public_refs r
                    WHERE e.owner_kind='page' AND e.scope_id=r.project_id
                      AND e.owner_id=r.portfolio_id || '/' || r.page_id
                      AND e.image_id=r.image_id AND e.asset_hash=r.asset_hash
                ) AND NOT EXISTS (
                    SELECT 1 FROM image_template_public_refs r
                    WHERE e.scope_id='@global' AND e.owner_kind=r.template_kind
                      AND e.owner_id=r.template_id
                      AND e.image_id=r.image_id AND e.asset_hash=r.asset_hash
                )
                """
            ).fetchone()[0]
        report["ok"] = (
            report["integrity_check"] == "ok"
            and not report["foreign_key_violations"]
            and not missing
            and report.get("orphan_backup_image_refs", 0) == 0
            and report.get("orphan_usage_assets", 0) == 0
            and report.get("unmapped_legacy_backup_refs", 0) == 0
            and report.get("unmapped_legacy_image_usage", 0) == 0
            and report.get("pages_without_scene_projection", 0) == 0
            and report.get("templates_without_scene_projection", 0) == 0
            and report.get("pages_with_invalid_revision", 0) == 0
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
