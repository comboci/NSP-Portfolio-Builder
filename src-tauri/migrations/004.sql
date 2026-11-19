-- V78: independent project, portfolio, page and system-wide template records.
-- The legacy workspace snapshot and backups are kept for rollback.
CREATE TABLE IF NOT EXISTS workspace_projects(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  payload TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0 CHECK(is_active IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_active ON workspace_projects(is_active) WHERE is_active=1;
CREATE TABLE IF NOT EXISTS workspace_portfolios(
  project_id TEXT NOT NULL REFERENCES workspace_projects(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY(project_id,id)
);
CREATE TABLE IF NOT EXISTS workspace_pages(
  project_id TEXT NOT NULL,
  portfolio_id TEXT NOT NULL,
  id TEXT NOT NULL,
  position INTEGER NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY(project_id,portfolio_id,id),
  FOREIGN KEY(project_id,portfolio_id) REFERENCES workspace_portfolios(project_id,id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS shared_template_context(id INTEGER PRIMARY KEY CHECK(id=1),payload TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS shared_templates(
  kind TEXT NOT NULL CHECK(kind IN ('masterTemplates','sectionDesigns','templates')),
  id TEXT NOT NULL,
  position INTEGER NOT NULL,
  payload TEXT NOT NULL,
  PRIMARY KEY(kind,id)
);
CREATE TABLE IF NOT EXISTS global_template_dependencies(
  project_id TEXT NOT NULL,portfolio_id TEXT NOT NULL,page_id TEXT NOT NULL,
  template_kind TEXT NOT NULL,template_id TEXT NOT NULL,
  PRIMARY KEY(project_id,portfolio_id,page_id,template_kind,template_id),
  FOREIGN KEY(project_id,portfolio_id,page_id) REFERENCES workspace_pages(project_id,portfolio_id,id) ON DELETE CASCADE,
  FOREIGN KEY(template_kind,template_id) REFERENCES shared_templates(kind,id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_global_template_dependents ON global_template_dependencies(template_kind,template_id);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(4);
PRAGMA user_version=4;
