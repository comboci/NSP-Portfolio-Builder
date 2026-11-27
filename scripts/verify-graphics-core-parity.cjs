// Owner-only under DEC-006. Byte comparison; no app evaluation or build.
'use strict';
const { readFileSync, readdirSync } = require('node:fs');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const root = join(__dirname, '..');
const expected = ['affine','scene','selection-geometry','smart-guides','component-revisions',
  'auto-layout','rich-text','image-treatment','diagnostics','print-policy','print-sampling'];
const raw = readFileSync(join(root, 'index.html'));
const html = raw.toString('utf8');
if (!raw.equals(Buffer.from(html))) throw new Error('index.html is not valid UTF-8');
const names = [...html.matchAll(/<script\b[^>]*\bid=["']nsp-graphics-core-([\w-]+)["'][^>]*>/g)].map(m => m[1]);
if (JSON.stringify(names) !== JSON.stringify(expected)) throw new Error('Unexpected, duplicate or misordered core scripts');
const fileNames = readdirSync(join(root, 'graphics-core')).filter(n => n.endsWith('.js'));
if (JSON.stringify(fileNames.sort()) !== JSON.stringify(expected.map(n => n + '.js').sort()))
  throw new Error('Unexpected or missing core modules');
for (const name of expected) {
  const start = '<script id="nsp-graphics-core-' + name + '">\n';
  const at = html.indexOf(start);
  if (at < 0) throw new Error('Missing exact inline boundary: ' + name);
  const end = html.indexOf('</script>', at + start.length);
  if (end < 0) throw new Error('Missing end: ' + name);
  const module = readFileSync(join(root, 'graphics-core', name + '.js'));
  if (!module.equals(Buffer.from(html.slice(at + start.length, end))))
    throw new Error('Byte mismatch: ' + name);
  console.log(name, createHash('sha256').update(module).digest('hex'));
}
