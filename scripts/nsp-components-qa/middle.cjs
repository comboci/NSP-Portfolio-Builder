const {scenarios,ids,helpers:f}=require('./adapter.cjs'), {E,current,checkpoint,ensure,active,select,idOf}=f;
const not=reason=>({status:'NOT_RUN',reason});
const htmlFor=(h,id)=>E(h,id=>{const ctx=V13.editor.currentPage(),pg=state.portfolios.find(p=>p.id===ctx?.portfolioId)?.pages.find(pg=>pg.id===ctx?.pageId);if(!pg)return '';const out=V13.renderDocument(pg,1);if(!id)return out;const t=document.createElement('template');t.innerHTML=out;return t.content.querySelector('[data-v13-object-id="'+CSS.escape(id)+'"]')?.outerHTML||'';},id);
const projectDefs=h=>E(h,()=>V13.nsp.builtins.map(x=>({id:x.id,base:x.nspBase,name:x.name,width:x.width,height:x.height})));
const objectProps=(h,id)=>E(h,id=>{const ctx=V13.editor.currentPage(),o=state.portfolios.find(p=>p.id===ctx.portfolioId).pages.find(p=>p.id===ctx.pageId).visualObjects.find(o=>o.id===id);return o?JSON.parse(JSON.stringify(o)):null;},id);
const pick=(o,k)=>Object.fromEntries(k.map(x=>[x,o?.[x]]));
async function makeImage(h,id,geom){
 const a=await E(h,([id,geom])=>{const ctx=V13.editor.currentPage(),pg=state.portfolios.find(p=>p.id===ctx.portfolioId).pages.find(p=>p.id===ctx.pageId);const key=uid();pg.visualObjects.push({id:key,type:'image',name:'QA Logo surface',x:geom[0],y:geom[1],w:geom[2],h:geom[3],rotation:12,objectFit:'contain',imageEdit:JSON.stringify({cropX:0,cropY:0,cropW:0.8,cropH:0.9}),visible:true,locked:false,assetId:id});if(!V13.queuePageSave(state.activeWorkspaceId,ctx.portfolioId,pg))return null;render();return key;},[id,geom]);
 await checkpoint(h);return a;
}
let visual={mainImgs:[],signature:null};
async function addEntry(h,cid,entry){return E(h,([cid,entry])=>V13.nsp.addEntry(V13.nsp.pfc(),V13.nsp.collections(V13.nsp.pfc()).find(x=>x.id===cid),entry),[cid,entry]);}
async function editEntry(h,cid,id,changes){return E(h,([cid,id,changes])=>{const p=V13.nsp.pfc(),c=V13.nsp.collections(p).find(v=>v.id===cid),e=c?.entries.find(v=>v.id===id);return V13.nsp.editEntry(p,c,e,changes);},[cid,id,changes]);}
async function getDefined(h,cid){return E(h,cid=>V13.nsp.collections(V13.nsp.pfc()).find(x=>x.id===cid)?.entries||[],cid);}
async function storeHotel(h,row){return E(h,row=>V13.nsp.addHotel(V13.nsp.pfc(),row),row);}
async function insert(h,base){
 const d=(await projectDefs(h)).find(x=>x.base===base||x.name.toLowerCase()===base.replace(/([A-Z])/g,' $1').toLowerCase());
 ensure(h,d,'missing built-in '+base);
 const before=(await current(h)).visualObjects.map(o=>o.id);
 const loc=h.page.locator('[data-nsp-insert="'+d.id+'"]');
 if(await loc.isVisible())await loc.click();else await E(h,id=>V13.nsp.insert(V13.nsp.builtins.find(x=>x.id===id)),d.id);
 await checkpoint(h);
 return ensure(h,(await current(h)).visualObjects.find(o=>!before.includes(o.id))?.id,'insert did not create a real object');
}
async function patch(h,id,values){
 await select(h,id);await E(h,values=>V13.editor.nspPatch(values),values);await checkpoint(h);
}
async function can(h,k){return E(h,k=>typeof V13.nsp?.[k]==='function',k);}
async function bind(h,image,cid,eid){
 return E(h,([image,cid,eid])=>{visualSelect(image);return V13.editor.nspBindImage({kind:'logo',controlId:cid,variantId:eid});},[image,cid,eid]);
}
const title=['QA Orchid Hotel','QA Walnut Hotel','QA Almond Hotel','QA Plum Hotel'];
async function hotels(h){
 if(ids.hotels.length)return;
 for(const [i,name] of title.entries()){
  const row={id:'qa-hotel-'+i,hotelName:name,projectName:'QA Project '+i,city:['Tehran','Mashhad','Shiraz','Rasht'][i],stars:i+2,year:String(1401+i),systems:ids.system?[ids.system]:[],images:{large:{assetId:ids.color[i]},small:{assetId:ids.color[i]},square:{assetId:ids.color[i]},rectangle:{assetId:ids.color[i]}}};
  const r=await storeHotel(h,row);
  ids.hotels.push(ensure(h,idOf(r)||r===true&&row.id,'hotel add failed '+i));
 }
}
scenarios[2]=async h=>{
 if(!await can(h,'addEntry'))return not('Data binding E03 absent');
 await active(h,ids.A,ids.pagesA[0]);
 for(const [i,name] of ['Primary','Light'].entries()){
  const rows=await getDefined(h,ids.logo);let id=rows.find(v=>v.name===name)?.id;
  if(!id){const created=await addEntry(h,ids.logo,{id:name,name,assetId:ids.color[i]});id=idOf(created)||((await getDefined(h,ids.logo)).find(x=>x.name===name)?.id);}
  else await editEntry(h,ids.logo,id,{assetId:ids.color[i]});
  ids.variants.push(ensure(h,id,'variant not stored '+name));
 }
 for(let i=0;i<4;i++){
  const image=await makeImage(h,ids.color[0],[45+i*86,690,72,63]);
  ensure(h,image,'no fixture image');await bind(h,image,ids.logo,ids.variants[i%2]);await checkpoint(h);
  visual.mainImgs.push(image);
 }
 const s=await current(h);
 for(let i=0;i<visual.mainImgs.length;i++){const o=s.visualObjects.find(o=>o.id===visual.mainImgs[i]);h.assert.ok(JSON.stringify(o).includes(ids.variants[i%2]));}
 return {variants:ids.variants.length,boundInstances:visual.mainImgs.length,basis:'real editor-selected Image instances, stable IDs, and actual app persistence'};
};
scenarios[3]=async h=>{
 if(!await can(h,'editEntry'))return not('Data binding E03 absent');
 ensure(h,visual.mainImgs.length===4,'requires scenario 2');
 const geom=['x','y','w','h','rotation','imageEdit','layerId','layerOrigin','objectFit'];
 const props=async()=>Promise.all(visual.mainImgs.map(x=>objectProps(h,x)));
 const before=(await props()).map(o=>pick(o,geom));
 const assets=await h.snapshot(),oldRed=assets.imageLibrary.find(x=>x.id===ids.color[0]).src,oldBlue=assets.imageLibrary.find(x=>x.id===ids.color[1]).src,next=assets.imageLibrary.find(x=>x.id===ids.color[4]).src;
 const html=await htmlFor(h);ensure(h,html.includes(oldRed)&&html.includes(oldBlue),'original variants not both rendered');
 ensure(h,await editEntry(h,ids.logo,ids.variants[0],{assetId:ids.color[4]}),'variant change failed');
 const after=await props(),markup=await htmlFor(h);
 h.assert.deepEqual(after.map(o=>pick(o,geom)),before);
 ensure(h,markup.includes(next)&&markup.includes(oldBlue)&&!markup.includes(oldRed),'live image renderer did not selectively swap asset');
 return {changed:2,unchanged:2,preserved:geom};
};
scenarios[4]=async h=>{
 if(!await can(h,'addHotel')||!await can(h,'layoutGrid'))return not('Hotel view/grid absent');
 const sys={id:'qa-grms',name:'QA GRMS',nameFa:'سامانه آزمایشی یک',nameEn:'QA GRMS English',assetId:ids.color[3]};
 const out=await addEntry(h,ids.sys,sys);ids.system=ensure(h,idOf(out)||((await getDefined(h,ids.sys)).find(s=>s.name===sys.name)?.id),'system missing');
 await hotels(h);ids.view=await insert(h,'hotelView');ids.grid=await insert(h,'hotelGrid');
 await patch(h,ids.view,{hotelIds:[ids.hotels[0]],nspOptions:{systemMode:'both',layoutDirection:'rtl',showImage:true,fields:['name','city','stars','year','systems']}});
 await patch(h,ids.grid,{hotelIds:ids.hotels,nspOptions:{systemMode:'both',layoutDirection:'rtl',showImage:true,fields:['name','city','stars','year','systems'],cols:2,count:4}});
 const assets=(await h.snapshot()).imageLibrary,oldIcon=assets.find(x=>x.id===ids.color[3]).src,newIcon=assets.find(x=>x.id===ids.color[5]).src;
 const markup=async()=>{const items=await Promise.all([ids.view,ids.grid].map(id=>htmlFor(h,id)));return items;};
 const before=await markup();const label0=x=>x.includes(sys.nameFa)||x.includes(sys.nameEn)||x.includes(sys.name);ensure(h,before.every(x=>label0(x)&&x.includes(oldIcon)),'initial system missing from '+before.map(x=>({text:label0(x),icon:x.includes(oldIcon),len:x.length})).map(x=>JSON.stringify(x)).join(','));
 ensure(h,await editEntry(h,ids.sys,ids.system,{name:'QA GRMS revised',nameFa:'سامانه آزمایشی جدید',nameEn:'QA GRMS revised',assetId:ids.color[5]}),'system edit failed');
 const after=await markup();ensure(h,after.every(x=>(x.includes('سامانه آزمایشی جدید')||x.includes('QA GRMS revised'))&&x.includes(newIcon)&&!x.includes(sys.nameFa)),'new name/icon not live');
 const total=after.join('').split(/سامانه آزمایشی جدید|QA GRMS revised/).length-1;h.assert.ok(total>=2,'both types were not drawn');
 return {renamedLabelsInActualPageRender:total,source:'one portfolio-level System Logos control'};
};
scenarios[5]=async h=>{
 if(!await can(h,'addHotel'))return not('Hotel Text E04 absent');
 if(!ids.hotels.length)await hotels(h);
 ids.text=await insert(h,'hotelText');
 await patch(h,ids.text,{hotelIds:[ids.hotels[0],ids.hotels[1]],nspOptions:{fields:['name'],direction:'rtl'}});
 let html=await htmlFor(h,ids.text);ensure(h,html.includes(title[0])&&html.includes(title[1])&&!html.includes('Tehran')&&!html.includes('Mashhad'),'name-only text mode not honored');
 await patch(h,ids.text,{hotelIds:[ids.hotels[0],ids.hotels[1]],nspOptions:{fields:['name','city','stars','year'],direction:'ltr'}});
 html=await htmlFor(h,ids.text);ensure(h,html.includes('Tehran')&&html.includes('Mashhad')&&html.includes('1401')&&html.includes('1402'),'full text options missing');
 const local=(await current(h)).visualObjects.find(o=>o.id===ids.text)?.nspOptions;ensure(h,local?.direction==='ltr','LTR not stored');
 return {records:2,modes:['name-only RTL','name/city/stars/year LTR'],render:'existing page renderer'};
};
scenarios[6]=async h=>{
 if(!ids.view)return not('View fixture not available; inspect scenario 4');
 const img=(await h.snapshot()).imageLibrary.find(x=>x.id===ids.color[0]).src;
 const old=await objectProps(h,ids.view),viewPattern=new RegExp(ids.view+'[^"]*photo');
 let before=await htmlFor(h,ids.view);ensure(h,before.includes(img),'view initial photograph absent');
 await patch(h,ids.view,{nspOptions:{...old.nspOptions,showImage:false,fields:['name']}});
 const after=await htmlFor(h,ids.view);ensure(h,!viewPattern.test(after),'view photograph remains after toggle');
 const o=await objectProps(h,ids.view);h.assert.equal(o.nspOptions.showImage,false);h.assert.deepEqual(o.nspOptions.fields,['name']);
 await patch(h,ids.view,{nspOptions:old.nspOptions});
 return {scope:'real persisted view instance properties and browser renderer'};
};
scenarios[7]=async h=>{
 if(!ids.grid)return not('Grid fixture not available; inspect scenario 4');
 const o=await objectProps(h,ids.grid);h.assert.deepEqual(o.hotelIds,ids.hotels);h.assert.equal(new Set(o.hotelIds).size,4);
 const markup=await htmlFor(h,ids.grid);for(const n of title)ensure(h,markup.includes(n),'missing grid record '+n);
 return {cards:4,arrayIds:o.hotelIds};
};
module.exports={projectDefs,insert,patch,objectProps,htmlFor};
