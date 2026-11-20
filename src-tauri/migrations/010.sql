-- V120 / N-05: relational, REBUILDABLE scene graph projection.
-- Canonical editable content remains workspace_pages.payload /
-- shared_templates.payload. No design JSON is stored in these new tables.
-- FKs protect scene ownership, layer/group membership, blocks, styles and assets.

CREATE TABLE IF NOT EXISTS design_scenes (
  scene_key TEXT PRIMARY KEY,
  owner_kind TEXT NOT NULL CHECK(owner_kind IN ('page','template')),
  project_id TEXT,
  portfolio_id TEXT,
  page_id TEXT,
  template_kind TEXT,
  template_id TEXT,
  source_sha256 TEXT NOT NULL CHECK(length(source_sha256)=64),
  CHECK (
    (owner_kind='page' AND project_id IS NOT NULL AND portfolio_id IS NOT NULL
     AND page_id IS NOT NULL AND template_kind IS NULL AND template_id IS NULL)
    OR
    (owner_kind='template' AND template_kind IS NOT NULL AND template_id IS NOT NULL
     AND project_id IS NULL AND portfolio_id IS NULL AND page_id IS NULL)
  ),
  FOREIGN KEY(project_id,portfolio_id,page_id)
    REFERENCES workspace_pages(project_id,portfolio_id,id) ON DELETE CASCADE,
  FOREIGN KEY(template_kind,template_id)
    REFERENCES shared_templates(kind,id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_design_scene_page_owner
 ON design_scenes(project_id,portfolio_id,page_id) WHERE owner_kind='page';
CREATE UNIQUE INDEX IF NOT EXISTS idx_design_scene_template_owner
 ON design_scenes(template_kind,template_id) WHERE owner_kind='template';

CREATE TABLE IF NOT EXISTS design_scene_layers (
  scene_key TEXT NOT NULL REFERENCES design_scenes(scene_key) ON DELETE CASCADE,
  layer_key TEXT NOT NULL,
  layer_id TEXT NOT NULL CHECK(length(layer_id)>0),
  origin TEXT NOT NULL,
  origin_owner_id TEXT NOT NULL,
  source_path TEXT,
  position INTEGER NOT NULL CHECK(position>=0),
  is_implicit INTEGER NOT NULL CHECK(is_implicit IN (0,1)),
  PRIMARY KEY(scene_key,layer_key)
);

-- A group can be a local group or a reference to an inherited group.
-- Its origin/owner tuple is retained, not mistaken for a new local definition.
CREATE TABLE IF NOT EXISTS design_scene_groups (
  scene_key TEXT NOT NULL REFERENCES design_scenes(scene_key) ON DELETE CASCADE,
  group_key TEXT NOT NULL,
  group_id TEXT NOT NULL CHECK(length(group_id)>0),
  origin TEXT NOT NULL,
  origin_owner_id TEXT NOT NULL,
  first_position INTEGER NOT NULL CHECK(first_position>=0),
  PRIMARY KEY(scene_key,group_key)
);

CREATE TABLE IF NOT EXISTS design_scene_elements (
  scene_key TEXT NOT NULL REFERENCES design_scenes(scene_key) ON DELETE CASCADE,
  element_id TEXT NOT NULL CHECK(length(element_id)>0),
  element_type TEXT NOT NULL CHECK(length(element_type)>0),
  source_path TEXT NOT NULL CHECK(length(source_path)>0),
  position INTEGER NOT NULL CHECK(position>=0),
  layer_key TEXT NOT NULL,
  group_key TEXT,
  block_id TEXT,
  style_id TEXT REFERENCES shared_styles(id) ON DELETE RESTRICT,
  asset_id TEXT,
  asset_hash TEXT REFERENCES asset_files(hash) ON DELETE RESTRICT,
  PRIMARY KEY(scene_key,element_id),
  FOREIGN KEY(scene_key,layer_key)
    REFERENCES design_scene_layers(scene_key,layer_key),
  FOREIGN KEY(scene_key,group_key)
    REFERENCES design_scene_groups(scene_key,group_key),
  FOREIGN KEY(scene_key,block_id)
    REFERENCES design_scene_elements(scene_key,element_id)
    DEFERRABLE INITIALLY DEFERRED
);
CREATE INDEX IF NOT EXISTS idx_design_element_layer
 ON design_scene_elements(scene_key,layer_key,position);
CREATE INDEX IF NOT EXISTS idx_design_element_group
 ON design_scene_elements(scene_key,group_key);
CREATE INDEX IF NOT EXISTS idx_design_element_style
 ON design_scene_elements(style_id);
CREATE INDEX IF NOT EXISTS idx_design_element_asset
 ON design_scene_elements(asset_hash);

CREATE TABLE IF NOT EXISTS design_scene_template_links (
  scene_key TEXT NOT NULL REFERENCES design_scenes(scene_key) ON DELETE CASCADE,
  template_kind TEXT NOT NULL,
  template_id TEXT NOT NULL,
  relation TEXT NOT NULL CHECK(length(relation)>0),
  PRIMARY KEY(scene_key,template_kind,template_id,relation),
  FOREIGN KEY(template_kind,template_id)
    REFERENCES shared_templates(kind,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_design_scene_template_target
 ON design_scene_template_links(template_kind,template_id);

CREATE TABLE IF NOT EXISTS design_scene_projection_issues (
  scene_key TEXT NOT NULL,
  source_path TEXT NOT NULL,
  issue_code TEXT NOT NULL,
  detail TEXT NOT NULL,
  noted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(scene_key,source_path,issue_code,detail)
);

INSERT OR IGNORE INTO schema_migrations(version) VALUES(10);
PRAGMA user_version=10;
