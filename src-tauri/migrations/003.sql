-- V74: internal payloads store content-addressed references instead of Base64.
-- Project/backups/images payload migration is performed transactionally in Rust,
-- before this marker is committed. No original data tables are dropped.
CREATE TABLE IF NOT EXISTS storage_format_meta (
  key TEXT PRIMARY KEY, value TEXT NOT NULL
);
INSERT INTO storage_format_meta(key,value)
VALUES ('asset_ref_format', 'nsp-asset-v74')
ON CONFLICT(key) DO UPDATE SET value=excluded.value;
INSERT OR IGNORE INTO schema_migrations(version) VALUES(3);
PRAGMA user_version=3;
