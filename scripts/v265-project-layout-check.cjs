'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const inline=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
for(const [,attrs,body] of inline){if(/application\/json/.test(attrs))JSON.parse(body);else new vm.Script(body)}
new vm.Script(inline.filter(x=>!/application\/json/.test(x[1])).map(x=>x[2]).join('\n;\n'));
assert(html.includes('content="265"'));
const source=inline.find(x=>x[1].includes('id="v265-repository-projects"'))[2];
const window={};
vm.runInNewContext(source,{window,Blob,TextEncoder,atob,Uint8Array,DataView,Map,Set,JSON,Math,globalThis:{},console});
const transport=window.V265RepositoryTransport;
const projectDir=path.join(root,'project file','General-Portfolio');
const raw=JSON.parse(fs.readFileSync(path.join(projectDir,'project.json'),'utf8'));
const pages=raw.project.data.portfolios[0].pages;
assert.strictEqual(pages.length,10);
const ids=new Set(raw.publicImages.map(a=>a.id)),used=new Set();
assert.strictEqual(ids.size,raw.publicImages.length);
assert(!/data:image\//i.test(JSON.stringify(raw)));
for(const p of pages){
 assert(p.layers.length>=4);assert(p.visualObjects.some(o=>o.type==='image'));assert(p.visualObjects.some(o=>o.type==='text'));
 const layers=new Set(p.layers.map(l=>l.id)),objects=new Set();
 for(const o of p.visualObjects){assert(!objects.has(o.id));objects.add(o.id);assert(layers.has(o.layerId));if(o.assetId){assert(ids.has(o.assetId));used.add(o.assetId)}assert(o.x>=0&&o.y>=0&&o.w>0&&o.h>0&&o.x+o.w<=842.01&&o.y+o.h<=595.01);if(o.type==='text')assert(o.x>=70)}
}
assert.strictEqual(used.size,ids.size);
const getBytes=name=>new Blob([fs.readFileSync(path.join(root,'Image',name))]);
for(const a of raw.publicImages){
 const name=transport.imageName(a.path);const f=path.join(root,'Image',name);assert(fs.existsSync(f));const data=fs.readFileSync(f);
 if(name.endsWith('.svg'))assert(data.toString('utf8').startsWith('<svg'));else if(name.endsWith('.webp'))assert(data.subarray(0,4).toString()==='RIFF'&&data.subarray(8,12).toString()==='WEBP');
}
(async()=>{
 assert.throws(()=>transport.imageName('../../Image/../bad.png'));
 assert.throws(()=>transport.imageName('https://example.org/asset.png'));
 assert.throws(()=>transport.imageName('../../Image/folder/asset.png'));
 assert(transport.hasExternal(raw));
 // Mock decoding only: browser image decode/canvas/file-picker is not tested.
 let reads=0;
 const hydrated=await transport.hydrate(raw,async name=>{reads++;return getBytes(name)},async(blob,name)=>({src:'data:image/png;base64,'+Buffer.from(name).toString('base64'),width:960,height:640}));
 assert.strictEqual(reads,raw.publicImages.length);
 assert(!transport.hasExternal(hydrated.payload));
 const packed=await transport.pack(hydrated.payload,hydrated.originals);
 assert.strictEqual(packed.files.size,raw.publicImages.length);
 for(const a of raw.publicImages){const name=transport.imageName(a.path);assert(Buffer.from(packed.files.get(name)).equals(fs.readFileSync(path.join(root,'Image',name))))}
 assert(!/data:image\//i.test(packed.json));
 const zip=Buffer.concat(transport.zipParts(new Map([['project file/General-Portfolio/project.json',new TextEncoder().encode(packed.json)],...Array.from(packed.files,([name,b])=>['Image/'+name,b])])).map(x=>Buffer.from(x)));
 assert.strictEqual(zip.readUInt32LE(0),0x04034b50);assert.strictEqual(zip.readUInt32LE(zip.length-22),0x06054b50);
 assert.strictEqual(transport.crc32(new TextEncoder().encode('123456789')),0xcbf43926);
 await assert.rejects(()=>transport.hydrate(raw,async()=>null));
 console.log('V265 source and transport fixtures passed; browser rendering, real filesystem picker and IndexedDB are NOT tested.');
})().catch(e=>{console.error(e);process.exitCode=1});
