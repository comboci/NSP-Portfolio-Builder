const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const s=fs.readFileSync(process.argv[2],'utf8');
const extract=(a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
(async()=>{
 const sandbox=vm.createContext({Blob});
 vm.runInContext(extract('const V290_BACKUP_JSON_BYTES=','async function v237SaveBackupJSON'),sandbox);
 assert.equal(vm.runInContext("v290BackupJSONBlob('۱۲abc',7).size",sandbox),7);
 assert.throws(()=>vm.runInContext("v290BackupJSONBlob('۱۲abc',6)",sandbox),/ZIP/);
 const test=vm.createContext({});
 vm.runInContext(extract('function v290RestoreSummary','async function restore('),test);
 const summary=vm.runInContext("v290RestoreSummary({activeWorkspaceId:'a',title:'renamed',projectWorkspaces:[{id:'c',name:'added'}]},{activeWorkspaceId:'a',title:'old',projectWorkspaces:[{id:'b',name:'removed'}]})",test);
 assert.match(summary,/old ← renamed/);assert.match(summary,/کنار گذاشته.*removed/);assert.match(summary,/پشتیبان: added/);
 assert.match(vm.runInContext("v290RestoreSummary({activeWorkspaceId:'a'},null)",test),/قابل مقایسه نیست/);
 const persisted=[], rejects=[];
 const q=vm.createContext({revision:0,state:{activeWorkspaceId:'a'},pending:0,queue:Promise.resolve(),scopeFor:()=>'',status:()=>{},
   write:async v=>{if(v==='first')throw Error('forced');persisted.push(v);},
   writeAcknowledged:()=>{},writeRejected:(_,e)=>rejects.push(e.message)});
 vm.runInContext(extract('let v290WriteGeneration=','save=function(forceProject'),q);
 await vm.runInContext("enqueue('first');enqueue('stale composite')",q);
 assert.deepEqual(persisted,[]);assert.match(rejects[1],/WRITE_PREDECESSOR_FAILED/);
 await vm.runInContext("enqueue('fresh after undo')",q);
 assert.deepEqual(persisted,['fresh after undo']);
 const P=vm.createContext({window:{V13:{flushStorage:async()=>{}}},save:()=>true,render(){},alert(){}});
 vm.runInContext(extract('let v290OptimisticBusy=','async function v77AddPortfolio'),P);
 assert.deepEqual(Array.from(await vm.runInContext("Promise.all([v77Persist(()=>{}),v77Persist(()=>{})])",P)),[true,false]);
 const recovery=extract('function showBrowserStorageRecovery','(async()=>');
 assert.match(recovery,/request\('backups','getAll'\)/);
 assert.match(recovery,/normalizeRestoreWorkspace\(row.payload\)/);
 assert.match(recovery,/if\(readRevision\)button/);
 assert.match(recovery,/browserCompareAndWrite/);
 const writes=[], saved=[];
 const element=()=>({children:[],style:{},classList:{add(){}},appendChild(x){this.children.push(x)},replaceChildren(){this.children=[]},setAttribute(){}});
 const buttons=e=>[...(e.onclick?[e]:[]),...e.children.flatMap(buttons)];
 const cover=element();
 const R=vm.createContext({cover,db:{},document:{createElement:element,querySelector:()=>null},V:{},ready:true,lastError:'',
  v136RecordIncident(){},status(){},alert(){},window:{location:{reload(){}}},confirm:()=>true,
  request:async()=>[{name:'valid',payload:'{"activeWorkspaceId":"a"}'},{name:'broken',payload:'no-JSON'}],
  normalizeRestoreWorkspace:JSON.parse,v290RestoreSummary:()=>'all workspaces',
  browserCompareAndWrite:async v=>writes.push(v),v237SaveBackupJSON:async v=>saved.push(v)});
 vm.runInContext(recovery+'showBrowserStorageRecovery(Error("forced"),true)',R);
 const choose=buttons(cover).find(b=>b.textContent.includes('نمایش'));
 await choose.onclick({currentTarget:choose});
 const download=buttons(cover).find(b=>b.textContent==='خروجی JSON بکاپ');
 const restore=buttons(cover).filter(b=>b.textContent==='بازیابی این Workspace');
 assert.equal(restore.length,1);assert.equal(writes.length,0);
 await download.onclick();assert.equal(saved[0].state.activeWorkspaceId,'a');assert.equal(writes.length,0);
 await restore[0].onclick({currentTarget:restore[0]});assert.deepEqual(writes,['{"activeWorkspaceId":"a"}']);
 console.log('PASS PB06 byte bounds; PB08 scope; PB09 queue + rollback ordering; PB07 valid checkpoint read/export/confirmed replace');
})().catch(e=>{console.error(e);process.exitCode=1});
