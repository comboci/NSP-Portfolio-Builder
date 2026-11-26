const fs=require('node:fs'),path=require('node:path');
const ids={color:['qa-a','qa-b','qa-c','qa-d','qa-e','qa-f'],logo:null,sys:null,variants:[],system:null,hotels:[],text:null,view:null,grid:null,square:null,A:null,B:null,pagesA:[],pagesB:[]};
const names={A:'QA PF A',B:'QA PF B',project:'QA Portfolio Components',square:'Hotel View Square'};
const checkpoint=async h=>{await h.flush();};
const E=(h,f,a)=>h.page.evaluate(f,a);
const current=(h)=>E(h,()=>{const ctx=V13.editor.currentPage();return state.portfolios.find(x=>x.id===ctx?.portfolioId)?.pages.find(x=>x.id===ctx?.pageId)||null;});
const idOf=x=>typeof x==='string'?x:x?.id;
const ensure=(h,x,msg)=>{h.assert.ok(x,msg);return x;};
async function active(h,pf,page){
 await h.flush();await E(h,([pf,page])=>v77EditPortfolio(state.activeWorkspaceId,pf,page),[pf,page]);
 if(page)await h.page.waitForFunction(id=>V13.editor.currentPage()?.pageId===id,page);else await h.page.waitForFunction(id=>state.activePortfolioId===id,pf);
}
async function select(h,id){
 await E(h,id=>visualSelect(id),id);
 await h.page.waitForFunction(id=>document.querySelector('.v13-is-selected[data-v13-object-id="'+CSS.escape(id)+'"]')||V13.editor.nspSelected?.()?.id===id,id,{timeout:2500});
}
async function addPortfolio(h,name){
 await h.flush();h.answers.push({type:'prompt',text:name});await E(h,()=>v77AddPortfolio(state.activeWorkspaceId));await h.flush();
 return E(h,name=>state.portfolios.find(x=>x.name===name)?.id,name);
}
async function addPages(h,pf){
 await active(h,pf);for(let i=0;i<2;i++){await E(h,()=>addPage());await h.flush();}
 return E(h,pf=>state.portfolios.find(p=>p.id===pf).pages.map(p=>p.id),pf);
}
function envelope(s){
 const data=JSON.parse(JSON.stringify(s)), name=s.activeWorkspaceName;
 for(const k of ['activeWorkspaceId','activeWorkspaceName','projectWorkspaces','globalTemplates','globalImageLibrary','globalImageAlbums','styleLibrary','templates','templateCategories','projectRegistryEmpty'])delete data[k];
 return {app:'NSP Portfolio Builder',kind:'NSP-Project-Backup',schemaVersion:2,appVersion:290,project:{name,data},templates:[],templateCategories:[],publicImages:[],styleLibrary:[]};
}
async function setup(h){
 await h.projects();
 h.answers.push({type:'prompt',text:names.project});await h.page.locator('button[onclick="v76AddProject()"]').click();
 await h.page.getByRole('button',{name:names.project,exact:true}).waitFor();await h.ready();
 ids.A=ensure(h,await addPortfolio(h,names.A));ids.B=ensure(h,await addPortfolio(h,names.B));
 ids.pagesA=await addPages(h,ids.A);ids.pagesB=await addPages(h,ids.B);await active(h,ids.A,ids.pagesA[0]);
 await E(h,assets=>{
   state.imageLibrary=assets.map((id,i)=>{const c=document.createElement('canvas');c.width=64;c.height=64;const g=c.getContext('2d');g.fillStyle=['#d02232','#063b62','#18a268','#fa7a33','#59619d','#7dc42a'][i];g.fillRect(0,0,64,64);g.fillStyle='white';g.fillText(String(i),31,30);const src=c.toDataURL('image/png');return{id,name:'QA '+id,src,width:64,height:64,type:'image/png',size:src.length};});
   save(true);
 },ids.color);await h.flush();
}
const scenarios={
 1:async h=>{
    if(!await E(h,()=>!!V13.nsp?.addControl))return {status:'NOT_RUN',reason:'Tray controls not implemented in current build'};
    await active(h,ids.A,ids.pagesA[0]);
    h.assert.equal(ids.pagesA.length,2);h.assert.equal(ids.pagesB.length,2);
    h.assert.equal(await h.page.locator('[data-nsp-tray]').count(),1);
    ids.logo=await E(h,()=>V13.nsp.addControl(V13.nsp.pfc(),'logo'));ensure(h,ids.logo,'failed add Logo');
    ids.sys=await E(h,()=>V13.nsp.addControl(V13.nsp.pfc(),'systems'));ensure(h,ids.sys,'failed add System Logos');
    await active(h,ids.A,ids.pagesA[1]);
    h.assert.equal(await h.page.locator('[data-nsp-control]').count(),2);
    await active(h,ids.B,ids.pagesB[0]);
    h.assert.equal(await h.page.locator('[data-nsp-control]').count(),0);
    ensure(h,await E(h,()=>V13.nsp.addControl(V13.nsp.pfc(),'logo')),'failed add isolated control');
    await active(h,ids.B,ids.pagesB[1]);
    h.assert.equal(await h.page.locator('[data-nsp-control]').count(),1);
    const B=await E(h,()=>V13.nsp.collections(V13.nsp.pfc()).map(x=>x.id));
    h.assert.ok(!B.includes(ids.logo)&&!B.includes(ids.sys));
    await active(h,ids.A,ids.pagesA[0]);
    h.assert.equal(await h.page.locator('[data-nsp-control]').count(),2);
    return {portfolioPages:[...ids.pagesA,...ids.pagesB].length,controls:[2,1],scope:'real editor pages and rendered trays; no page scene objects'};
   },
 13:async h=>h.openOld(),
 11:async h=>{
   const old=await h.snapshot(),p=old.portfolios.find(p=>p.id===ids.A);ensure(h,p&&ids.square&&ids.grid,'requires loaded components fixture');
   // This asserts transport preserves the complete portfolio graph, including all component references. Images are packing/re-hydration data and are compared by stable IDs.
   return h.zipRoundtrip(envelope(old),(raw,hydrated)=>{
     const q=hydrated.portfolios.find(v=>v.id===ids.A);ensure(h,q,'imported portfolio lost');
     h.assert.deepEqual(q.pages.map(pg=>pg.visualObjects.map(o=>o.id)),p.pages.map(pg=>pg.visualObjects.map(o=>o.id)));
     h.assert.deepEqual(q.pages.flatMap(pg=>pg.visualObjects.filter(o=>o.type==='nspComponent').map(o=>[o.nspDefinitionId,o.nspVersion,o.hotelIds])),p.pages.flatMap(pg=>pg.visualObjects.filter(o=>o.type==='nspComponent').map(o=>[o.nspDefinitionId,o.nspVersion,o.hotelIds])));
     h.assert.deepEqual(q.nspDataControls,p.nspDataControls);h.assert.deepEqual(q.nspHotels,p.nspHotels);
     h.assert.deepEqual(hydrated.imageLibrary.map(x=>x.id),old.imageLibrary.map(x=>x.id));
     h.assert.ok(hydrated.customComponents.some(x=>x.id===ids.square),'component lost');
     h.assert.ok(raw.manifest.imageCount>0,'no packed image data');
   });
  },
 12:async h=>{
   await active(h,ids.A,ids.pagesA[0]); const tray=h.page.locator('[data-nsp-tray],.nsp-tray');
   ensure(h,await tray.count(),'data tray absent from editable canvas before print');return h.printApp(ids.A,'integration-print.pdf','[data-nsp-tray],.nsp-tray');
  }
};
module.exports={setup,scenarios,ids,helpers:{E,current,checkpoint,ensure,active,select,idOf,envelope}};
require('./middle.cjs');
require('./late.cjs');
