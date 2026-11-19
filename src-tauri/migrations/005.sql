-- V79: permanent per-project logical ownership and one-way public catalog.
-- Retain all asset_files and old backups. Physical garbage collection remains disabled.
CREATE TABLE IF NOT EXISTS image_project_owners(
  project_id TEXT NOT NULL REFERENCES workspace_projects(id) ON DELETE CASCADE,
  image_id TEXT NOT NULL,
  asset_hash TEXT NOT NULL REFERENCES asset_files(hash),
  PRIMARY KEY(project_id,image_id)
);
CREATE INDEX IF NOT EXISTS idx_image_project_owners_hash ON image_project_owners(asset_hash);

CREATE TABLE IF NOT EXISTS image_public_catalog(
  id TEXT PRIMARY KEY,
  asset_hash TEXT NOT NULL REFERENCES asset_files(hash),
  payload TEXT NOT NULL,
  published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_image_public_hash ON image_public_catalog(asset_hash);

CREATE TABLE IF NOT EXISTS image_usage_edges(
  scope_id TEXT NOT NULL,
  owner_kind TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  asset_hash TEXT NOT NULL REFERENCES asset_files(hash),
  PRIMARY KEY(scope_id,owner_kind,owner_id,image_id,asset_hash)
);
CREATE INDEX IF NOT EXISTS idx_image_usage_hash ON image_usage_edges(asset_hash);

CREATE TABLE IF NOT EXISTS image_backup_refs(
  backup_kind TEXT NOT NULL,
  backup_id INTEGER NOT NULL,
  asset_hash TEXT NOT NULL REFERENCES asset_files(hash),
  PRIMARY KEY(backup_kind,backup_id,asset_hash)
);
CREATE INDEX IF NOT EXISTS idx_image_backup_refs_hash ON image_backup_refs(asset_hash);

INSERT OR IGNORE INTO schema_migrations(version) VALUES(5);
PRAGMA user_version=5;
