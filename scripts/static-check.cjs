'use strict';
// TASK-030: deterministic source-level checks; no app launch, native build or runtime tests.
// Run explicitly in the repository checkout: node scripts/static-check.cjs
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, '');
const html = read('index.html');
const config = JSON.parse(read('src-tauri/tauri.conf.json'));
const cargo = read('src-tauri/Cargo.toml');
const rust = read('src-tauri/src/main.rs');
const media = read('src-tauri/src/media_store.rs');
const projectStore = read('src-tauri/src/project_store.rs');
const ownership = read('src-tauri/src/image_ownership.rs');

assert(/^\d+\.\d+\.\d+$/.test(config.version), 'Invalid Tauri semver');
const packageSection = cargo.match(/^\[package\]\s*([\s\S]*?)(?=^\[|\s*$)/m);
assert(packageSection, 'Cargo [package] section missing');
const cargoVersion = packageSection[1].match(/^version\s*=\s*"(\d+\.\d+\.\d+)"/m)?.[1];
assert(cargoVersion, 'Cargo package version missing');
assert.strictEqual(cargoVersion, config.version, 'Cargo and Tauri versions differ');
const version = Number(config.version.split('.')[0]);
assert(Number.isSafeInteger(version) && version > 0, 'Invalid application version');
assert.strictEqual(config.app.withGlobalTauri, true);
assert.deepStrictEqual(config.build.frontendDist, ['../index.html']);
assert(html.includes('<meta name="application-version" content="' + version + '">'),
  'HTML application-version does not match Cargo/Tauri');
assert(html.includes('<title>NSP Portfolio Builder — Version ' + version + '</title>'),
  'HTML title is stale');
assert(html.includes('<small>Version ' + version + '</small>'),
  'Visible application header is stale');
const versions = [...html.matchAll(/\bappVersion\s*[:=]\s*(\d+)\b/g)].map(m => Number(m[1]));
assert(versions.length > 0, 'No JS application version marker found');
for (const found of versions) {
  assert.strictEqual(found, version, 'Stale JavaScript appVersion overrides the UI');
}

const inline = [];
for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  if (/application\/json/.test(m[1])) { JSON.parse(m[2]); continue; }
  inline.push(m[2]);
  new vm.Script(m[2], { filename: 'inline-' + inline.length });
}
new vm.Script(inline.join('\n;\n'), { filename: 'all-inline-scripts' });
assert(html.includes("const KEY='nsp-portfolio-builder-v13'"), 'Persistent storage key changed');
assert(html.includes('id="v74-storage"'), 'Storage bridge not found');
assert(html.indexOf('<script id="v72-media-upgrade">') < html.indexOf('V.mediaContext={'),
  'Editor media bridge load order changed');

const handler = rust.match(/generate_handler!\[([\s\S]*?)\]/);
assert(handler, 'Tauri generate_handler registration not found');
const registered = handler[1].split(',').map(s => s.trim()).filter(Boolean);
for (const m of html.matchAll(/invoke\('([a-z_]+)'/g)) {
  assert(registered.includes(m[1]), 'Unregistered IPC command ' + m[1]);
  assert(rust.includes('fn ' + m[1] + '('), 'Missing Rust handler ' + m[1]);
}
const migrations = fs.readdirSync(path.join(root, 'src-tauri/migrations'))
  .filter(x => /^\d{3}\.sql$/.test(x)).sort();
assert(migrations.length >= 6, 'Schema migration 006 is missing');
const schemaMigration = Number(migrations[migrations.length - 1].slice(0, 3));
assert.strictEqual(migrations.length, schemaMigration, 'Schema migrations are not contiguous from 001');
for (let number = 1; number <= schemaMigration; number++) {
  const name = String(number).padStart(3, '0') + '.sql';
  assert(migrations.includes(name), 'Missing schema migration ' + name);
  assert(rust.includes('include_str!("../migrations/' + name + '")'),
    'Migration is not wired in main.rs: ' + name);
  assert(new RegExp('if\\s+version\\s*<\\s*' + number + '\\b').test(rust),
    'No upgrade guard for schema ' + number);
  const sql = read('src-tauri/migrations/' + name);
  assert(new RegExp('PRAGMA\\s+user_version\\s*=\\s*' + number + '\\s*;', 'i').test(sql),
    'SQL user_version differs in migration ' + name);
}
assert(new RegExp('if\\s+version\\s*>\\s*' + schemaMigration + '\\b').test(rust),
  'Rust maximum schema guard differs from latest migration');
assert(projectStore.includes('shared_styles') && read('src-tauri/migrations/006.sql').includes('shared_styles'),
  'Shared Style Library SQLite revision is not wired');
assert(projectStore.includes('ON CONFLICT(project_id,portfolio_id,id) DO UPDATE'),
  'Relational page upsert missing');
assert(projectStore.includes('references missing {kind}/{template}'),
  'Template reference integrity guard missing');
assert(rust.includes('sync_backup_references(&tx)') &&
       ownership.includes('pub fn index_backup_refs('),
  'Backup reference tracking is not wired');
assert(ownership.includes('pub fn rename_public_metadata('),
  'Durable public image metadata update is missing');
assert(html.includes('async function v77Persist(undo)') &&
       html.includes('await window.V13.flushStorage()'),
  'Async persistence acknowledgement is missing');
assert(media.includes('nsp-asset-v74:') &&
       media.includes('pub fn compact_value(') &&
       media.includes('pub fn hydrate_payload('),
  'Immutable image asset storage is not wired');
assert(rust.includes('migrate_payload_table(&tx, &root, table)'),
  'Legacy SQLite migration is disconnected');
assert(rust.includes('SELECT id,created_at FROM backups') &&
       !rust.includes('SELECT id,created_at,payload FROM backups'),
  'Backup listing should not eagerly hydrate historical payloads');
const ids = [...html.matchAll(/<script\b[^>]*\bid="([^"]+)"/g)].map(x => x[1]);
assert.strictEqual(new Set(ids).size, ids.length, 'Duplicate script IDs');
const definitions = new Set([...html.matchAll(/M\.([A-Za-z]+)\s*=\s*(?:async\s+)?function/g)].map(x => x[1]));
for (const m of html.matchAll(/V13\.media\.([A-Za-z]+)\(/g)) {
  assert(definitions.has(m[1]) || m[1] === 'update', 'Missing image action ' + m[1]);
}

// Produced ONLY after a user explicitly runs this script and every assertion passes.
const report = {
  kind: 'source-static-check',
  status: 'passed',
  checkedAtUTC: new Date().toISOString(),
  version: String(version),
  cargoVersion,
  tauriVersion: config.version,
  schemaMigration,
  scriptCount: inline.length,
  registeredCommands: registered,
  validation: 'source-parse-and-structure-only',
  staticCheckExecuted: true,
  rustBuildExecuted: false,
  runtimeExecuted: false,
  ownerAcceptance: 'not-established-by-this-script'
};
fs.writeFileSync(path.join(root, 'STATIC_VALIDATION.json'), JSON.stringify(report, null, 2) + '\n');
console.log('V' + version + ' source-static checks passed (schema ' + schemaMigration +
  '); this is NOT a native build or runtime acceptance.');
