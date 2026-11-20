-- V116 / N-02: strongly-typed, FK-validated media/backup reference projections.
-- Legacy image_usage_edges and image_backup_refs remain untouched for recovery.
-- Any legacy row not safely mappable is reported, not silently deleted.
-- Application continues to disable physical asset garbage collection.

CREATE UNIQUE INDEX IF NOT EXISTS idx_image_owner_identity_hash
  ON image_project_owners(project_id, image_id, asset_hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_public_image_identity_hash
  ON image_public_catalog(id, asset_hash);

CREATE TABLE IF NOT EXISTS image_page_private_refs(
  project_id TEXT NOT NULL,
  portfolio_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  asset_hash TEXT NOT NULL,
  PRIMARY KEY(project_id, portfolio_id, page_id, image_id),
  FOREIGN KEY(project_id, portfolio_id, page_id)
    REFERENCES workspace_pages(project_id, portfolio_id, id) ON DELETE CASCADE,
  FOREIGN KEY(project_id, image_id, asset_hash)
    REFERENCES image_project_owners(project_id, image_id, asset_hash) ON DELETE CASCADE,
  FOREIGN KEY(asset_hash) REFERENCES asset_files(hash) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_image_page_private_hash
  ON image_page_private_refs(asset_hash);

CREATE TABLE IF NOT EXISTS image_page_public_refs(
  project_id TEXT NOT NULL,
  portfolio_id TEXT NOT NULL,
  page_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  asset_hash TEXT NOT NULL,
  PRIMARY KEY(project_id, portfolio_id, page_id, image_id),
  FOREIGN KEY(project_id, portfolio_id, page_id)
    REFERENCES workspace_pages(project_id, portfolio_id, id) ON DELETE CASCADE,
  FOREIGN KEY(image_id, asset_hash)
    REFERENCES image_public_catalog(id, asset_hash) ON DELETE RESTRICT,
  FOREIGN KEY(asset_hash) REFERENCES asset_files(hash) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_image_page_public_hash
  ON image_page_public_refs(asset_hash);

CREATE TABLE IF NOT EXISTS image_template_public_refs(
  template_kind TEXT NOT NULL,
  template_id TEXT NOT NULL,
  image_id TEXT NOT NULL,
  asset_hash TEXT NOT NULL,
  PRIMARY KEY(template_kind, template_id, image_id),
  FOREIGN KEY(template_kind, template_id)
    REFERENCES shared_templates(kind, id) ON DELETE CASCADE,
  FOREIGN KEY(image_id, asset_hash)
    REFERENCES image_public_catalog(id, asset_hash) ON DELETE RESTRICT,
  FOREIGN KEY(asset_hash) REFERENCES asset_files(hash) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_image_template_public_hash
  ON image_template_public_refs(asset_hash);

CREATE TABLE IF NOT EXISTS automatic_backup_asset_refs(
  backup_id INTEGER NOT NULL REFERENCES backups(id) ON DELETE CASCADE,
  asset_hash TEXT NOT NULL REFERENCES asset_files(hash) ON DELETE RESTRICT,
  PRIMARY KEY(backup_id, asset_hash)
);
CREATE INDEX IF NOT EXISTS idx_auto_backup_asset_hash
  ON automatic_backup_asset_refs(asset_hash);

CREATE TABLE IF NOT EXISTS named_backup_asset_refs(
  backup_id INTEGER NOT NULL REFERENCES named_backups(id) ON DELETE CASCADE,
  asset_hash TEXT NOT NULL REFERENCES asset_files(hash) ON DELETE RESTRICT,
  PRIMARY KEY(backup_id, asset_hash)
);
CREATE INDEX IF NOT EXISTS idx_named_backup_asset_hash
  ON named_backup_asset_refs(asset_hash);

CREATE TABLE IF NOT EXISTS reference_migration_issues(
  legacy_table TEXT NOT NULL,
  legacy_identity TEXT NOT NULL,
  issue_code TEXT NOT NULL,
  first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(legacy_table, legacy_identity, issue_code)
);

-- Backfill only unambiguous page ownership and correct asset identity.
INSERT OR IGNORE INTO image_page_private_refs(project_id, portfolio_id, page_id, image_id, asset_hash)
SELECT p.project_id, p.portfolio_id, p.id, e.image_id, e.asset_hash
FROM image_usage_edges e
JOIN workspace_pages p
 ON e.owner_kind='page' AND e.scope_id=p.project_id
 AND e.owner_id=p.portfolio_id || '/' || p.id
JOIN image_project_owners o
 ON o.project_id=p.project_id AND o.image_id=e.image_id AND o.asset_hash=e.asset_hash
JOIN asset_files a ON a.hash=e.asset_hash
WHERE (SELECT COUNT(*) FROM workspace_pages p2
       WHERE p2.project_id=e.scope_id AND e.owner_id=p2.portfolio_id || '/' || p2.id)=1;

INSERT OR IGNORE INTO image_page_public_refs(project_id, portfolio_id, page_id, image_id, asset_hash)
SELECT p.project_id, p.portfolio_id, p.id, e.image_id, e.asset_hash
FROM image_usage_edges e
JOIN workspace_pages p
 ON e.owner_kind='page' AND e.scope_id=p.project_id
 AND e.owner_id=p.portfolio_id || '/' || p.id
JOIN image_public_catalog c ON c.id=e.image_id AND c.asset_hash=e.asset_hash
JOIN asset_files a ON a.hash=e.asset_hash
WHERE NOT EXISTS(
 SELECT 1 FROM image_project_owners o
 WHERE o.project_id=p.project_id AND o.image_id=e.image_id
)
AND (SELECT COUNT(*) FROM workspace_pages p2
     WHERE p2.project_id=e.scope_id AND e.owner_id=p2.portfolio_id || '/' || p2.id)=1;

INSERT OR IGNORE INTO image_template_public_refs(template_kind, template_id, image_id, asset_hash)
SELECT t.kind, t.id, e.image_id, e.asset_hash
FROM image_usage_edges e
JOIN shared_templates t
 ON e.scope_id='@global' AND e.owner_kind=t.kind AND e.owner_id=t.id
JOIN image_public_catalog c ON c.id=e.image_id AND c.asset_hash=e.asset_hash
JOIN asset_files a ON a.hash=e.asset_hash;

INSERT OR IGNORE INTO automatic_backup_asset_refs(backup_id, asset_hash)
SELECT e.backup_id, e.asset_hash
FROM image_backup_refs e
JOIN backups b ON b.id=e.backup_id
JOIN asset_files a ON a.hash=e.asset_hash
WHERE e.backup_kind='automatic';

INSERT OR IGNORE INTO named_backup_asset_refs(backup_id, asset_hash)
SELECT e.backup_id, e.asset_hash
FROM image_backup_refs e
JOIN named_backups b ON b.id=e.backup_id
JOIN asset_files a ON a.hash=e.asset_hash
WHERE e.backup_kind='named';

-- Keep a durable diagnostic for legacy rows that could not be mapped.
INSERT OR IGNORE INTO reference_migration_issues(legacy_table, legacy_identity, issue_code)
SELECT 'image_usage_edges',
       quote(e.scope_id)||'/'||quote(e.owner_kind)||'/'||quote(e.owner_id)
          ||'/'||quote(e.image_id)||'/'||quote(e.asset_hash),
       'unresolved_legacy_usage'
FROM image_usage_edges e
WHERE NOT EXISTS (
 SELECT 1 FROM image_page_private_refs r WHERE
  e.owner_kind='page' AND e.scope_id=r.project_id
  AND e.owner_id=r.portfolio_id || '/' || r.page_id
  AND e.image_id=r.image_id AND e.asset_hash=r.asset_hash
) AND NOT EXISTS (
 SELECT 1 FROM image_page_public_refs r WHERE
  e.owner_kind='page' AND e.scope_id=r.project_id
  AND e.owner_id=r.portfolio_id || '/' || r.page_id
  AND e.image_id=r.image_id AND e.asset_hash=r.asset_hash
) AND NOT EXISTS (
 SELECT 1 FROM image_template_public_refs r WHERE
  e.scope_id='@global' AND e.owner_kind=r.template_kind
  AND e.owner_id=r.template_id AND e.image_id=r.image_id
  AND e.asset_hash=r.asset_hash
);

INSERT OR IGNORE INTO reference_migration_issues(legacy_table, legacy_identity, issue_code)
SELECT 'image_backup_refs',
       quote(e.backup_kind)||'/'||quote(e.backup_id)||'/'||quote(e.asset_hash),
       'unresolved_legacy_backup'
FROM image_backup_refs e
WHERE NOT EXISTS (
 SELECT 1 FROM automatic_backup_asset_refs r
 WHERE e.backup_kind='automatic' AND e.backup_id=r.backup_id
 AND e.asset_hash=r.asset_hash
) AND NOT EXISTS (
 SELECT 1 FROM named_backup_asset_refs r
 WHERE e.backup_kind='named' AND e.backup_id=r.backup_id
 AND e.asset_hash=r.asset_hash
);

INSERT OR IGNORE INTO schema_migrations(version) VALUES(8);
PRAGMA user_version=8;
