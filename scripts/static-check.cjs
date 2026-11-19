'use strict';
// Source-level checks only. This does not launch the app or build Tauri.
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const inline = [];
for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/application\/json/.test(m[1])) { JSON.parse(m[2]); continue; }
  inline.push(m[2]);
  new vm.Script(m[2], { filename: 'inline-' + inline.length });
}
new vm.Script(inline.join('\n;\n'), { filename: 'all-inline-scripts' });
const config = JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json', 'utf8').replace(/^\uFEFF/, ''));
const version = String(config.version).split('.')[0];
assert(/^\d+\.\d+\.\d+$/.test(config.version), 'Invalid Tauri semver');
assert.equal(config.app.withGlobalTauri, true);
assert.deepEqual(config.build.frontendDist, ['../index.html']);
assert(html.includes('<meta name="application-version" content="' + version + '">'));
assert(html.includes('NSP Portfolio Builder — Version ' + version));
assert(html.includes("const KEY='nsp-portfolio-builder-v13'"));
assert(html.includes('id="v74-storage"'));
assert(html.indexOf('<script id="v72-media-upgrade">') < html.indexOf('V.mediaContext={'));
assert(html.includes("invoke('read_backup',{id:row[0]})"));
const rust = fs.readFileSync('src-tauri/src/main.rs', 'utf8');
const media = fs.readFileSync('src-tauri/src/media_store.rs', 'utf8');
const registered = rust.match(/generate_handler!\[([^\]]+)\]/)[1].split(',').map(x => x.trim()).filter(Boolean);
for (const m of html.matchAll(/invoke\('([a-z_]+)'/g)) {
  assert(registered.includes(m[1]), 'Unregistered IPC command ' + m[1]);
  assert(rust.includes('fn ' + m[1] + '('), 'Missing Rust handler ' + m[1]);
}
const migrations = fs.readdirSync('src-tauri/migrations').filter(x => /^\d{3}\.sql$/.test(x)).sort();
assert(migrations.length >= 6, 'Missing schema migrations');
for (const name of migrations) {
  assert(rust.includes('include_str!("../migrations/' + name + '")'), 'Migration not wired: ' + name);
}
const schemaMigration = Number(migrations[migrations.length - 1].slice(0, 3));
assert(rust.includes('if version > ' + schemaMigration), 'Schema version guard does not match migrations');
const projectStore = fs.readFileSync('src-tauri/src/project_store.rs', 'utf8');
const ownership = fs.readFileSync('src-tauri/src/image_ownership.rs', 'utf8');
assert(projectStore.includes('ON CONFLICT(project_id,portfolio_id,id) DO UPDATE'));
assert(projectStore.includes('references missing {kind}/{template}'));
assert(rust.includes('sync_backup_references(&tx)'));
assert(ownership.includes('pub fn index_backup_refs('));
assert(html.includes('async function v77Persist(undo)'));
assert(html.includes('await window.V13.flushStorage()'));
assert(media.includes('nsp-asset-v74:'));
assert(media.includes('pub fn compact_value('));
assert(media.includes('pub fn hydrate_payload('));
assert(rust.includes('migrate_payload_table(&tx, &root, table)'));
assert(rust.includes('SELECT id,created_at FROM backups'));
assert(!rust.includes('SELECT id,created_at,payload FROM backups'));
const ids = [...html.matchAll(/<script\b[^>]*\bid="([^"]+)"/g)].map(x => x[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate script IDs');
const definitions = new Set([...html.matchAll(/M\.([A-Za-z]+)\s*=\s*(?:async\s+)?function/g)].map(x => x[1]));
for (const m of html.matchAll(/V13\.media\.([A-Za-z]+)\(/g)) {
  assert(definitions.has(m[1]) || ['update'].includes(m[1]), 'Missing media action ' + m[1]);
}
const report = {
  kind: 'static-only',
  version,
  scripts: inline.length,
  combinedScope: 'parsed',
  seedJSON: 'parsed',
  tauriConfig: 'parsed',
  registeredCommands: registered,
  schemaMigration,
  runtimeExecuted: false,
  buildExecuted: false
};
fs.writeFileSync('STATIC_VALIDATION.json', JSON.stringify(report, null, 2) + '\n');
console.log('V' + version + ' source-level validation passed (SQLite schema ' + schemaMigration + '); no native Rust build was executed.');
