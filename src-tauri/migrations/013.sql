-- V135 TASK-043: preserve legacy backup identities; only new checkpoints are revision-bound.
-- NULL explicitly means legacy provenance unknown, never a verified revision 0.
ALTER TABLE named_backups ADD COLUMN workspace_revision INTEGER
  CHECK(workspace_revision IS NULL OR workspace_revision>=0);
CREATE INDEX IF NOT EXISTS idx_named_backups_workspace_revision
  ON named_backups(workspace_revision);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(13);
PRAGMA user_version=13;
