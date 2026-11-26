const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const text=fs.readFileSync(process.argv[2],'utf8');
const assets=text.slice(text.indexOf(' async function waitForPrintAssets('),text.indexOf(' V.waitForPrintAssets='));
const native=text.slice(text.indexOf('  printAll = function (printSnapshot'),text.indexOf('  toggleLock = function'));
const checked=text.slice(text.indexOf(' const oldPrintAll=printAll;'),text.indexOf(' const oldRender=render;',text.indexOf(' const oldPrintAll=printAll;')));
assert.ok(assets&&native&&checked);assert.equal((text.match(/window\.print\(\)/g)||[]).length,1);
const events=new Map(),notices=[],printCalls=[];
const body={classList:{add(){},remove(){}}};
const V={};const ctx=vm.createContext({AbortController,setTimeout,clearTimeout,Image:class{
 complete=true;naturalWidth=400;decode(){return Promise.resolve()}
},document:{fonts:{ready:Promise.resolve()},body},window:{
 addEventListener:(key,fn)=>events.set(key,fn),removeEventListener:key=>events.delete(key),print:()=>{printCalls.push(1);events.get('afterprint')?.();}
},V,state:{},tab:'visual',alert:x=>notices.push(x),confirm:()=>true,collectIssues:()=>[],renderReport:()=>{},refreshPrintFormat:()=>{}});
vm.runInContext(assets+native+checked,ctx);
const img=(opts={})=>({complete:true,naturalWidth:200,decode:()=>Promise.resolve(),...opts});
function root(images=[],svg=[],missing=false){return {isConnected:true,dataset:{},querySelector:()=>missing?{}:null,querySelectorAll:k=>k==='img'?images:svg,remove(){this.isConnected=false}}}
(async()=>{
 await ctx.waitForPrintAssets(root([img()],[{getAttribute:k=>k==='href'?'data:fixture':null}]),20);
 await assert.rejects(ctx.waitForPrintAssets(root([img({naturalWidth:0})]),20),/رمزگشایی/);
 await assert.rejects(ctx.waitForPrintAssets(root([img({decode:()=>new Promise(()=>{})})]),10),/مهلت/);
 assert.equal(await ctx.printAll(root([],[],true),[{}]),false);
 assert.equal(await ctx.printAll(root([img({decode:()=>Promise.reject(Error('fixture'))})]),[{}]),false);
 assert.equal(await ctx.printAll(root([img()]),[{}],{stillCurrent:()=>false}),false);
 assert.equal(printCalls.length,0);
 const accepted=root([img()]);
 assert.equal(await ctx.printAll(accepted,[{}]),true,JSON.stringify(notices));
 assert.equal(printCalls.length,1);
 assert.equal(accepted.isConnected,false);
 assert.equal(V.printPending,false);
 assert.equal(V.printCheckPending,false);
 assert.match(text,/await printAll\(snapshot,frozen.pages,\{stillCurrent\}\)/);
 assert.match(text,/return printAll\(snapshot,pages,\{stillCurrent:/);
 console.log('PB-04 exact source / synthetic readiness, timeout, stale, native call and cleanup PASS');
})().catch(e=>{console.error(e);process.exit(1)});
