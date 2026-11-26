'use strict';
// Exercise the actual pure ZIP reader without evaluating application bootstrap.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const source=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].find(s=>s[1].includes('v265-repository-projects'))[2];
const head=source.slice(source.indexOf("const prefix='../../Image/';"),source.indexOf('function readDataURL('));
const crc=source.slice(source.indexOf('const crcTable='),source.indexOf('function zipParts('));
const read=source.slice(source.indexOf('async function readRepositoryZip('),source.indexOf('async function importRepositoryZip('));
const ctx={Blob,TextDecoder,Uint8Array,DataView,Map,Set,JSON,Math};vm.runInNewContext(head+'\n'+crc+'\n'+read,ctx);
(async()=>{
 const filename=path.join(root,'deliverables','NSP-Portfolio-Editable-Master.zip'),bytes=fs.readFileSync(filename);
 const zip=await ctx.readRepositoryZip(new Blob([bytes]));
 assert.strictEqual(zip.raw.templates.length,5);assert.strictEqual(zip.raw.project.data.portfolios[0].pages.length,5);
 for(const a of zip.raw.publicImages)assert.strictEqual((await zip.readImage(path.basename(a.path))).size,a.size);
 const broken=Buffer.from(bytes),firstData=30+bytes.readUInt16LE(26)+bytes.readUInt16LE(28);broken[firstData+5]^=1;
 await assert.rejects(ctx.readRepositoryZip(new Blob([broken])));
 const result={actualZipReader:'PASS',corruptZipRejected:'PASS',pages:5,templates:5,appRuntimeExecuted:false};
 fs.writeFileSync(path.join(root,'deliverables','NSP-Portfolio-Editable-Master-transport-validation.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
