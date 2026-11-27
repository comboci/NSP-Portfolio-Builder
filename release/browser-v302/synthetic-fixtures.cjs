// Owner-only offline fixture utility; not imported or executed by the application.
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const [,,input,output,ack]=process.argv;
if(!input||!output||ack!=='--synthetic-seed')throw Error('Usage: node synthetic-fixtures.cjs seed.json new-output-dir --synthetic-seed');
const bytes=fs.readFileSync(input);
if(bytes.length>10_000_000)throw Error('Seed too large');
const seed=JSON.parse(bytes),pages=seed?.portfolio?.pages;
if(seed.app!=='NSP Portfolio Builder'||seed.kind!=='NSP-Portfolio-Backup'||seed.schemaVersion!==2||
 seed.manifest?.scope!=='single-portfolio'||!Array.isArray(pages)||pages.length!==5)
 throw Error('Expected exactly five independent synthetic pages in a V291 single-portfolio export.');
if(pages.some(p=>typeof p?.id!=='string'||!p.id)||new Set(pages.map(p=>p.id)).size!==5)
 throw Error('Invalid page identities.');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),manifest={seedSHA256:sha(bytes),sizes:{}},outputs=[];
for(const n of [10,100,500]){
 const doc=structuredClone(seed);
 doc.portfolio.pages=Array.from({length:n},(_,i)=>{
  const from=pages[i%5],id='ge11-synthetic-page-'+String(i+1).padStart(4,'0');
  function remap(v){
   if(Array.isArray(v))return v.map(remap);
   if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,item])=>[k,remap(item)]));
   if(typeof v!=='string')return v;
   if(v===from.id)return id;
   for(const key of ['page:','page|']){
    const token=key+from.id;
    if(v.startsWith(token)&&[':', '|'].includes(v[token.length]))return key+id+v.slice(token.length);
   }
   return v;
  }
  return {...remap(from),id,title:'GE11 synthetic '+String(i+1).padStart(4,'0')};
 });
 doc.manifest.pageCount=n;
 const name='ge11-'+n+'.json',buf=Buffer.from(JSON.stringify(doc)+'\n');
 if(buf.length>100_000_000)throw Error('Expanded fixture too large');
 manifest.sizes[n]={name,sha256:sha(buf),bytes:buf.length};
 outputs.push([name,buf]);
}
outputs.push(['fixture-digests.json',JSON.stringify(manifest,null,2)+'\n']);
fs.mkdirSync(output,{recursive:false});
for(const [name,file] of outputs)fs.writeFileSync(path.join(output,name),file,{flag:'wx'});
