CREATE TABLE IF NOT EXISTS asset_files (
 hash TEXT PRIMARY KEY, mime TEXT NOT NULL, relative_path TEXT NOT NULL UNIQUE, byte_length INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS image_files (
 project_id TEXT NOT NULL, image_id TEXT NOT NULL, original_hash TEXT NOT NULL REFERENCES asset_files(hash), thumbnail_hash TEXT REFERENCES asset_files(hash),
 PRIMARY KEY(project_id,image_id), FOREIGN KEY(project_id,image_id) REFERENCES images(project_id,id)
);
CREATE TABLE IF NOT EXISTS scene_entities (
 project_id TEXT NOT NULL REFERENCES projects(id), kind TEXT NOT NULL, id TEXT NOT NULL,
 PRIMARY KEY(project_id,kind,id)
);
CREATE TABLE IF NOT EXISTS scene_links (
 project_id TEXT NOT NULL, from_kind TEXT NOT NULL, from_id TEXT NOT NULL, relation TEXT NOT NULL, to_kind TEXT NOT NULL, to_id TEXT NOT NULL,
 PRIMARY KEY(project_id,from_kind,from_id,relation,to_kind,to_id),
 FOREIGN KEY(project_id,from_kind,from_id) REFERENCES scene_entities(project_id,kind,id),
 FOREIGN KEY(project_id,to_kind,to_id) REFERENCES scene_entities(project_id,kind,id)
);
CREATE TABLE IF NOT EXISTS named_backups (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, payload TEXT NOT NULL
);
INSERT OR IGNORE INTO schema_migrations(version) VALUES(2);
PRAGMA user_version=2;
