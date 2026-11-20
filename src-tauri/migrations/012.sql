-- V124 / N-07: fail-closed retention policy. Existing backups/assets are untouched.
-- Automatic backups remain append-only until a named recovery checkpoint is
-- explicitly owner-verified and a future deliberate opt-in is recorded.
-- Physical asset garbage collection is intentionally not implemented.
CREATE TABLE IF NOT EXISTS backup_retention_policy (
  id INTEGER PRIMARY KEY CHECK (id=1),
  automatic_limit INTEGER NOT NULL DEFAULT 30 CHECK (automatic_limit>=30),
  prune_approved INTEGER NOT NULL DEFAULT 0 CHECK (prune_approved IN (0,1)),
  verified_named_backup_id INTEGER REFERENCES named_backups(id) ON DELETE RESTRICT,
  verified_at TEXT,
  approval_note TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    prune_approved=0 OR (
      verified_named_backup_id IS NOT NULL
      AND verified_at IS NOT NULL
      AND length(trim(coalesce(approval_note,'')))>0
    )
  )
);
INSERT OR IGNORE INTO backup_retention_policy(id,automatic_limit,prune_approved)
VALUES (1,30,0);
INSERT OR IGNORE INTO schema_migrations(version) VALUES (12);
PRAGMA user_version=12;
