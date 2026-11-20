-- V119 / N-04: typed, FK-backed bindings from JSON text objects to
-- the one canonical shared style catalog. Object-path keys are JSON pointers:
-- concrete element rows and element-level FKs are reserved for N-05.
-- Keep old snapshots, tables and assets unchanged.
CREATE TABLE IF NOT EXISTS style_page_element_refs(
    project_id TEXT NOT NULL,
    portfolio_id TEXT NOT NULL,
    page_id TEXT NOT NULL,
    element_path TEXT NOT NULL CHECK(length(element_path)>0),
    element_id TEXT,
    style_id TEXT NOT NULL REFERENCES shared_styles(id) ON DELETE RESTRICT,
    PRIMARY KEY(project_id,portfolio_id,page_id,element_path),
    FOREIGN KEY(project_id,portfolio_id,page_id)
        REFERENCES workspace_pages(project_id,portfolio_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_style_page_referenced_style
    ON style_page_element_refs(style_id);

CREATE TABLE IF NOT EXISTS style_template_element_refs(
    template_kind TEXT NOT NULL,
    template_id TEXT NOT NULL,
    element_path TEXT NOT NULL CHECK(length(element_path)>0),
    element_id TEXT,
    style_id TEXT NOT NULL REFERENCES shared_styles(id) ON DELETE RESTRICT,
    PRIMARY KEY(template_kind,template_id,element_path),
    FOREIGN KEY(template_kind,template_id)
        REFERENCES shared_templates(kind,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_style_template_referenced_style
    ON style_template_element_refs(style_id);

-- Historical diagnostics are append-only; old invalid references are not
-- silently dropped and do not prevent first-time upgrade.
CREATE TABLE IF NOT EXISTS style_reference_issues(
    owner_kind TEXT NOT NULL,
    owner_key TEXT NOT NULL,
    element_path TEXT NOT NULL,
    style_id TEXT NOT NULL,
    reason TEXT NOT NULL CHECK(reason IN ('unknown_style','invalid_style_id')),
    first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(owner_kind,owner_key,element_path,style_id,reason)
);

INSERT OR IGNORE INTO schema_migrations(version) VALUES(9);
PRAGMA user_version=9;
