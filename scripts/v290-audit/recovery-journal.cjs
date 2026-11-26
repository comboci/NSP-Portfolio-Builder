const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(process.argv[2]||__dirname+'/candidate.html','utf8');
let scripts=0;
for(const [_,attrs,body] of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
 if(/type\s*=\s*["']application\/json/i.test(attrs))continue;
 new vm.Script(body,{filename:'inline-'+(++scripts)});
}
assert.ok(scripts>20);
const a=source.indexOf("const vPb03JournalKey=");
const b=source.indexOf('function v271RootRecord(',a);
assert.ok(a>=0&&b>a);
let physical, receipt, cleared, grants=true, rename=false;
const file={getFile:async()=>({size:physical?.length||0,text:async()=>physical}),isSameEntry:async x=>x===file};
const dir={isSameEntry:async x=>x===dir&&!rename,getFileHandle:async()=>{if(physical===null)physical='';return file},removeEntry:async()=>{physical=null}};
const parent={getDirectoryHandle:async()=>dir};
const root={getDirectoryHandle:async()=>parent,queryPermission:async()=>grants?'granted':'denied',requestPermission:async()=>'denied'};
const window={V13:{diskWorkspaceReceipt:async()=>receipt}};
const helpers=vm.runInNewContext(source.slice(a,b)+'\n({vPb03Reconcile,vPb03RecoveryDecision})',{
 window,fail:m=>{throw Error(m)},findFile:async()=>physical===null?null:file,writeHandle:async(_,text)=>{physical=text;},
 v271RootRecord:async(method)=>{assert.equal(method,'delete');cleared=true;},
});
const setup=(p,c)=>{physical=p;receipt=c;cleared=false;grants=true;rename=false};
const i={version:1,id:'import',kind:'import',root,dir,folder:'Fixture',baseRevision:2,before:'old',after:'new'};
const d={...i,id:'delete',kind:'delete',before:'old',after:null};
(async()=>{
 setup('new',false); assert.equal(await helpers.vPb03Reconcile(i),false); assert.equal(physical,'old');assert.equal(cleared,true);
 setup('new',true); assert.equal(await helpers.vPb03Reconcile(i),true); assert.equal(physical,'new');assert.equal(cleared,true);
 setup(null,false); assert.equal(await helpers.vPb03Reconcile(d),false); assert.equal(physical,'old');
 setup(null,true); assert.equal(await helpers.vPb03Reconcile(d),true); assert.equal(physical,null);
 setup('third version',false);await assert.rejects(helpers.vPb03Reconcile(i),/تغییر کرده/);assert.equal(physical,'third version');assert.equal(cleared,false);
 setup('new',false);grants=false;await assert.rejects(helpers.vPb03Reconcile(i),/مجوز/);assert.equal(physical,'new');assert.equal(cleared,false);
 setup('new',false);rename=true;await assert.rejects(helpers.vPb03Reconcile(i),/همان پوشه/);assert.equal(physical,'new');assert.equal(cleared,false);
 const writes=source.slice(source.indexOf('function browserCompareAndWrite('),source.indexOf('async function write(payload'));
 assert.ok(writes.includes('store.put(payload,KEY)')&&writes.includes('if(diskOperation)store.put(diskOperation,diskReceiptKey)'));
 console.log(`PASS ${scripts} executable script syntax; 7 durable-reconciliation model cases + atomic receipt wiring`);
})().catch(e=>{console.error(e);process.exitCode=1;});
