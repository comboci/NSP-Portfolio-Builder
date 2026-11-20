-- V115 / DB architecture N-01: additive indexes for read paths used by project_store.rs.
-- Deliberately non-unique: existing ordering values may contain duplicates.
-- Do not rebuild tables or modify existing payloads / foreign-key semantics.
CREATE INDEX IF NOT EXISTS idx_workspace_portfolios_project_position
  ON workspace_portfolios(project_id, position, id);
CREATE INDEX IF NOT EXISTS idx_workspace_pages_project_portfolio_position
  ON workspace_pages(project_id, portfolio_id, position, id);
CREATE INDEX IF NOT EXISTS idx_shared_templates_kind_position
  ON shared_templates(kind, position, id);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(7);
PRAGMA user_version=7;
