'use strict';
// Parse source only. Do not load index.html in a browser or execute its application scripts.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');const scripts=[];
for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/application\/json/.test(m[1])){JSON.parse(m[2]);continue;}scripts.push(m[2]);new vm.Script(m[2],{filename:'inline-'+scripts.length});}
new vm.Script(scripts.join('\n;\n'),{filename:'combined-inline-scope'});
const config=JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json','utf8').replace(/^\uFEFF/,''));
assert.equal(config.version,'72.0.0');assert.equal(config.app.withGlobalTauri,true);assert.deepEqual(config.build.frontendDist,['../index.html']);
assert(html.includes('content="72"'));assert(html.includes("const KEY='nsp-portfolio-builder-v13'"));
assert(html.indexOf('<script id="v72-media-upgrade">')<html.indexOf('V.mediaContext={'));
const rust=fs.readFileSync('src-tauri/src/main.rs','utf8');
const registered=rust.match(/generate_handler!\[([^\]]+)\]/)[1].split(',').map(x=>x.trim());
for(const m of html.matchAll(/invoke\('([a-z_]+)'/g)){assert(registered.includes(m[1]),'Unregistered IPC command '+m[1]);assert(rust.includes('fn '+m[1]+'('),'Missing Rust handler '+m[1]);}
for(const name of ['001.sql','002.sql'])assert(rust.includes(name),'Migration not wired: '+name);
const ids=[...html.matchAll(/<script\b[^>]*\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'Duplicate script IDs');
const definitions=new Set([...html.matchAll(/M\.([A-Za-z]+)\s*=\s*(?:async\s+)?function/g)].map(m=>m[1]));
for(const m of html.matchAll(/V13\.media\.([A-Za-z]+)\(/g))assert(definitions.has(m[1])||['update'].includes(m[1]),'Missing media action '+m[1]);
const report={kind:'static-only',scripts:scripts.length,combinedScope:'parsed',seedJSON:'parsed',tauriConfig:'parsed',registeredCommands:registered,version:'72',runtimeExecuted:false,buildExecuted:false};
fs.writeFileSync('STATIC_VALIDATION.json',JSON.stringify(report,null,2)+'\n');
console.log('Static validation passed: '+scripts.length+' scripts; combined scope; JSON; IPC registration; media actions; migration wiring. No application execution.');
