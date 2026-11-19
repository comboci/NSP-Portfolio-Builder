-- V102 TASK-014: a sole system-wide named Style Library.
-- No project-specific style ownership; legacy backups and snapshots remain.
CREATE TABLE IF NOT EXISTS shared_styles(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE,
  position INTEGER NOT NULL CHECK(position >= 0),
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shared_styles_order ON shared_styles(position,id);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(6);
PRAGMA user_version=6;
