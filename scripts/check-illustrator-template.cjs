'use strict';
// Offline schema/source checks and standalone document proofs. No app launch,
// browser, application storage, native build or runtime acceptance.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),out=path.join(root,'deliverables','NSP-Portfolio-Editable-Master');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
for(const [,attrs,body] of scripts){if(/application\/json/.test(attrs))JSON.parse(body);else new vm.Script(body);}
new vm.Script(scripts.filter(s=>!/application\/json/.test(s[1])).map(s=>s[2]).join('\n;\n'));
const helpers=fs.readFileSync(path.join(root,'scripts','illustrator-primitives.js'),'utf8');
assert(scripts.find(s=>s[1].includes('nsp-illustrator-primitives'))[2].trim()===helpers.trim());
const context={window:{}};vm.runInNewContext(helpers,context);const api=context.window.NSPIllustrator;
const json=fs.readFileSync(path.join(out,'project file','NSP-Portfolio','project.json'),'utf8');
const payload=JSON.parse(json),pages=payload.project.data.portfolios[0].pages;
assert.strictEqual(pages.length,5);assert.strictEqual(payload.templates.length,5);
const assets=new Map(payload.publicImages.map(a=>[a.id,a]));
const counts={};
function checkObjects(objects){
 const ids=new Set(objects.map(o=>o.id));assert.strictEqual(ids.size,objects.length);
 for(const o of objects){
  api.validate(o);
  assert(o.w>=1&&o.h>=1&&o.x>=-.001&&o.y>=-.001&&o.x+o.w<=1191.001&&o.y+o.h<=842.001, o.id+' bounds');
  if(o.blockId){const parent=objects.find(b=>b.id===o.blockId);assert(parent&&parent.type==='block');assert(parent.layerId===o.layerId);assert(o.x>=parent.x-.001&&o.y>=parent.y-.001&&o.x+o.w<=parent.x+parent.w+.001&&o.y+o.h<=parent.y+parent.h+.001);}
  if(o.type==='image'){assert(assets.has(o.assetId));const e=JSON.parse(o.imageEdit);for(const k of ['cropX','cropY'])assert(e[k]>=-.001&&e[k]<100);for(const k of ['cropW','cropH'])assert(e[k]>=1&&e[k]<=100.001);}
  if(o.type==='text'){assert(o.sourceTextLayout);assert(o.sourceTextLayout.glyphs.some(g=>g.d));assert(api.textMarkup(o).content);assert.strictEqual(api.textMarkup({...o,text:o.text+' edited'}).content,null);assert.strictEqual(api.textMarkup({...o,direction:'rtl'}).content,null);}
 }
}
for(const pg of pages){
 const layerIds=new Set(pg.layers.map(l=>l.id));checkObjects(pg.visualObjects);
 assert.strictEqual(pg.objectOrder.length,pg.visualObjects.length);
 for(const o of pg.visualObjects){assert(layerIds.has(o.layerId));counts[o.type]=(counts[o.type]||0)+1;}
 assert(typeof pg.chartLabels==='string'&&typeof pg.chartValues==='string');
}
for(const t of payload.templates){checkObjects(t.objects);assert(payload.templateCategories.some(c=>c.id===t.categoryId));}
for(const a of assets.values()){assert(a.path.startsWith('../../Image/'));const p=path.join(out,'Image',path.basename(a.path));assert(fs.statSync(p).size===a.size);}
assert.throws(()=>api.path('M0 0<script>alert(1)</script>'));
assert.throws(()=>api.path('M0 0 L1e999 2'));
assert.throws(()=>api.path('M0 0 C1 2'));
assert.throws(()=>api.path('M0 0 E1 2'));
assert.throws(()=>api.validate({type:'vectorPath',pathData:'M0 0',pathWidth:-1,pathHeight:1}));
assert.throws(()=>api.typography({...pages[0].visualObjects.find(o=>o.type==='text').sourceTextLayout,fontData:'https://invalid.example/font.ttf'}));
// Parse the actual project validator functions in isolation, without evaluating
// the application bootstrap or DOM. This catches transport/schema mismatches.
const main=scripts.find(s=>s[2].includes('function v13Objects('))[2];
const start=main.indexOf('function v13Record('),end=main.indexOf('function initialProjectData(');
assert(start>=0&&end>start);
const validatorCode=main.slice(start,end);
const validator={window:{NSPIllustrator:api}};vm.runInNewContext(validatorCode,validator);
for(const pg of pages){validator.v13Objects(JSON.parse(JSON.stringify(pg.visualObjects)),'page',true);validator.v20SceneRecord(JSON.parse(JSON.stringify(pg)),'page');}
vm.runInNewContext('function v13Copy(value){return JSON.parse(JSON.stringify(value));}\n'+main.slice(main.indexOf('function v13NormalizeProject('),main.indexOf('function isIndependentPage('))+ '\n'+main.slice(main.indexOf('function v111AssetIds('),main.indexOf('function v111RebindImages(')),validator);
const hydratedData=JSON.parse(JSON.stringify(payload.project.data));
hydratedData.templates=payload.templates;hydratedData.templateCategories=payload.templateCategories;
hydratedData.globalImageLibrary=payload.publicImages.map(a=>({...a,src:'data:image/png;base64,'+fs.readFileSync(path.join(out,'Image',path.basename(a.path))).toString('base64')}));
const normalized=validator.v13NormalizeProject(hydratedData);
assert.strictEqual(normalized.pages.length,5);assert.strictEqual(normalized.templates.length,5);
// Render assets through the same primitive generator, outside the application.
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function svgObject(o){
 if(o.type==='block')return '';
 const xy=' x="'+o.x+'" y="'+o.y+'"';
 if(o.type==='vectorPath')return api.vectorMarkup(o).replace('<svg ','<svg'+xy+' ');
 if(o.type==='text'){
  const markup=api.textMarkup(o).content.match(/<svg[\s\S]*<\/svg>/)[0];
  return markup.replace('<svg ','<svg'+xy+' ').replace('width="100%" height="100%"','width="'+o.w+'" height="'+o.h+'"').replace('fill:currentColor','fill:'+o.color);
 }
 const a=assets.get(o.assetId),e=JSON.parse(o.imageEdit),file=path.join(out,'Image',path.basename(a.path));
 const src='data:image/png;base64,'+fs.readFileSync(file).toString('base64');
 const c=api.clipDefs(o.vectorClips,o.w,o.h),sx=100/e.cropW,sy=100/e.cropH;
 return '<svg'+xy+' width="'+o.w+'" height="'+o.h+'" viewBox="0 0 '+o.w+' '+o.h+'" overflow="hidden"><defs>'+c.defs+'</defs>'+c.open+'<image href="'+src+'" x="'+(-e.cropX/100*o.w*sx)+'" y="'+(-e.cropY/100*o.h*sy)+'" width="'+o.w*sx+'" height="'+o.h*sy+'" preserveAspectRatio="none"/>'+c.close+'</svg>';
}
async function run(){
 const sharp=require(process.env.NSP_SHARP_MODULE||'sharp');
 const preview=path.join(out,'Preview');fs.mkdirSync(preview,{recursive:true});
 for(let i=0;i<pages.length;i++){
  let svg='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1191" height="842" viewBox="0 0 1191 842"><rect width="1191" height="842" fill="white"/>'+pages[i].visualObjects.map(svgObject).join('')+'</svg>';
  // Nested vector markup uses width/height percentages; set its local viewport.
  svg=svg.replace(/<svg x="([^"]+)" y="([^"]+)" ([^>]*?)viewBox="0 0 ([^ ]+) ([^"]+)"/g,(m,x,y,attrs,w,h)=>'<svg x="'+x+'" y="'+y+'" '+attrs.replace('width="100%" height="100%"','width="'+w+'" height="'+h+'"')+'viewBox="0 0 '+w+' '+h+'"');
  fs.writeFileSync(path.join(preview,'page-'+(i+1)+'.svg'),svg);
  await sharp(Buffer.from(svg),{density:144,limitInputPixels:50000000}).resize(1191,842).png().toFile(path.join(preview,'page-'+(i+1)+'.png'));
 }
 const result={sourceSyntax:'PASS',primitiveAndSceneValidation:'PASS',actualImportSchemaValidator:'PASS',pages:5,reusableTemplates:5,counts,assets:assets.size,standaloneProofs:5,appRuntimeExecuted:false,printAcceptance:'OWNER_PENDING'};
 fs.writeFileSync(path.join(out,'static-validation.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
