const {scenarios,ids,helpers:f}=require('./adapter.cjs'), {E,current,active,select,ensure}=f;
const {projectDefs,objectProps,patch}=require('./middle.cjs');
const not=reason=>({status:'NOT_RUN',reason});
const sq='Hotel View Square';
async function can(h){return E(h,()=>!!V13.nsp?.definitionEditor);}
async function waitRendered(h,name) {
 const visible=await h.page.locator('[data-nsp-insert]').count();ensure(h,visible,'NSP Toolbox has no rendered tools');
 const button=h.page.locator('[data-nsp-insert]').filter({hasText:name});await button.waitFor({state:'attached'});
 return button;
}
scenarios[8]=async h=>{
 if(!await can(h))return not('Component Editor E07 absent');
 await h.flush();const base=(await projectDefs(h)).find(x=>x.base==='hotelView');ensure(h,base,'Hotel View definition missing');
 await E(h,()=>go('nsp-component-editor'));
 const row=h.page.locator('[data-nsp-def-row="'+base.id+'"]');await row.waitFor({state:'visible'});
 await row.locator('td').first().dblclick();
 const title=h.page.locator('[data-catalog-title]');await title.waitFor({state:'visible'});
 await title.fill(sq);
 const box=await E(h,()=>V13.editor.catalogDraft()?.nspEditorDraft),dims=Math.max(box.width,box.height);
 if(dims>842) {
   const down=810;
   await E(h,size=>{const pg=V13.editor.catalogDraft(),c=pg.nspEditorDraft;const scale=size/Math.max(c.width,c.height);
    pg.visualObjects.forEach(o=>{for(const k of ['x','y','w','h','fontSize'])if(typeof o[k]==='number')o[k]*=scale;});},down);
 }
 const size=Math.min(dims,810);
 await h.page.locator('[data-nsp-def-size="width"]').fill(String(size));
 await h.page.locator('[data-nsp-def-size="height"]').fill(String(size));
 const save=h.page.locator('[data-v137-action="save-catalog-draft"],[data-v13-action="save-catalog-draft"]').filter({hasText:'ذخیره'}).first();
 if(await save.isVisible()){await save.click();await h.flush();}
 else ensure(h,await E(h,()=>V13.nsp.definitionEditor.saveDraft(false)),'Component Editor save failed');
 await h.flush();
 const saved=await E(h,sq=>V13.nsp.definitionEditor.list().find(x=>x.name===sq),sq);
 ids.square=ensure(h,saved?.id,'saved definition not listed');h.assert.notEqual(ids.square,base.id);h.assert.equal(saved.width,saved.height);
 ensure(h,(saved.objects||[]).length>=2,'definition not a real primitive collection');
 return {newId:ids.square,sourceId:base.id,size:[saved.width,saved.height],editablePrimitives:saved.objects.length,definitionStatus:saved.nspStatus};
};
scenarios[9]=async h=>{
 if(!ids.square)return not('Square draft unavailable');
 await active(h,ids.A,ids.pagesA[1]);const b=await waitRendered(h,sq);
 h.assert.equal(await b.getAttribute('data-nsp-insert'),ids.square);
 return {id:ids.square,toolboxRendered:true};
};
scenarios[10]=async h=>{
 if(!ids.square)return not('Square draft unavailable');
 await h.flush();await h.page.reload();await h.ready();
 await active(h,ids.A,ids.pagesA[1]);const b=await waitRendered(h,sq);
 const seen=await E(h,id=>V13.nsp.definitionEditor.lookup(id),ids.square);ensure(h,seen?.objects?.length,'persisted definition missing');
 const count=(await current(h)).visualObjects.length;
 await E(h,()=>V13.dock?.open?.('toolbox'));
 if(await b.isVisible())await b.click();
 else await E(h,id=>V13.nsp.insert(V13.nsp.definitionEditor.lookup(id)),ids.square);
 await h.flush();const pg=await current(h);const latest=pg.visualObjects.find(x=>x.nspDefinitionId===ids.square);
 ensure(h,latest&&pg.visualObjects.length===count+1,'reloaded custom tool did not add its object');
 if(ids.hotels[0])await patch(h,latest.id,{hotelIds:[ids.hotels[0]]});
 return {reloaded:true,definitionId:ids.square,instantiated:latest.id};
};
scenarios[14]=async h=>{
 if(!ids.square)return not('Hotel View Square fixture unavailable');
 await active(h,ids.A,ids.pagesA[1]);const obj=(await current(h)).visualObjects.find(x=>x.nspDefinitionId===ids.square);ensure(h,obj,'square instance unavailable');await select(h,obj.id);
 const prior=await objectProps(h,obj.id);
 const id='[data-v13-editor] [data-v13-canvas-host] [data-v13-object-id="'+obj.id+'"]';
 await h.page.locator(id).first().scrollIntoViewIfNeeded();
 const perf=await h.dragMeasure(id,{dx:34,dy:19,steps:18});
 await h.flush();const after=await objectProps(h,obj.id);
 ensure(h,after&&(prior.x!==after.x||prior.y!==after.y),'real mouse drag did not change position '+JSON.stringify({before:[prior.x,prior.y],after:[after.x,after.y],size:[prior.w,prior.h],perf}));
 await select(h,obj.id);
 const prop=h.page.locator('[data-v13-property="name"]').first();await prop.waitFor({state:'visible'});
 const t=Date.now();
 const rotation=after.name;const x=rotation+' QA';
 await prop.fill(String(x));await prop.press('Tab');await h.flush();
 const afterIn=await objectProps(h,obj.id);ensure(h,afterIn&&afterIn.name!==rotation,'Properties name input did not update');
 return {...perf,propertyMs:Date.now()-t,delta:[after.x-prior.x,after.y-prior.y],updatedName:afterIn.name};
};
scenarios[15]=async h=>{
 if(!ids.view)return not('Hotel View fixture unavailable');
 await active(h,ids.A,ids.pagesA[0]);await select(h,ids.view);
 const options=await E(h,()=>[...document.querySelectorAll('option,input[type=radio],button')].filter(o=>/database/i.test(o.textContent||o.value||'')).map(o=>({tag:o.tagName,text:o.textContent,value:o.value,disabled:o.disabled||o.parentElement?.disabled||false})).filter(o=>o.tag==='OPTION'||o.tag==='INPUT'||o.tag==='BUTTON'&&/^\s*database\b/i.test(o.text)));
 ensure(h,options.length&&options.every(o=>o.disabled),'Database missing or enabled');
 const external=h.requests.filter(r=>new URL(r.url).origin!==h.origin);
 const office=external.filter(x=>/office|sqlserver/i.test(x.url));
 h.assert.deepEqual(office,[]);
 return {databaseDisabled:true,occurrences:options.length,officeRequests:office.length,observedNetworkRequests:h.requests.length};
};
