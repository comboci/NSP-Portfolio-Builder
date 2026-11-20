-- V122 / N-06: durable optimistic concurrency and isolated page writes.
-- This is additive. Existing page/template/asset records and all backups remain.
-- All mutating Tauri commands share one monotonically increasing revision.
CREATE TABLE IF NOT EXISTS workspace_write_revision (
  id INTEGER PRIMARY KEY CHECK(id=1),
  revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO workspace_write_revision(id,revision) VALUES(1,0);

ALTER TABLE workspace_pages ADD COLUMN revision INTEGER NOT NULL DEFAULT 0 CHECK(revision>=0);

CREATE INDEX IF NOT EXISTS idx_workspace_pages_revision
  ON workspace_pages(project_id,portfolio_id,revision);

INSERT OR IGNORE INTO schema_migrations(version) VALUES(11);
PRAGMA user_version=11;
