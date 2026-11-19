CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,payload TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS images(project_id TEXT NOT NULL REFERENCES projects(id),id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(project_id,id));
CREATE TABLE IF NOT EXISTS templates(project_id TEXT NOT NULL REFERENCES projects(id),kind TEXT NOT NULL,id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(project_id,kind,id));
CREATE TABLE IF NOT EXISTS pages(project_id TEXT NOT NULL REFERENCES projects(id),portfolio_id TEXT NOT NULL,id TEXT NOT NULL,payload TEXT NOT NULL,PRIMARY KEY(project_id,portfolio_id,id));
CREATE TABLE IF NOT EXISTS image_refs(project_id TEXT NOT NULL,owner_kind TEXT NOT NULL,owner_id TEXT NOT NULL,image_id TEXT NOT NULL,PRIMARY KEY(project_id,owner_kind,owner_id,image_id),FOREIGN KEY(project_id,image_id) REFERENCES images(project_id,id));
CREATE TABLE IF NOT EXISTS backups(id INTEGER PRIMARY KEY AUTOINCREMENT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,payload TEXT NOT NULL);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(1);
PRAGMA user_version=1;
