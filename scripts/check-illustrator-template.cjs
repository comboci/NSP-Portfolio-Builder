'use strict';
// Offline schema/source checks and standalone document proofs. No app launch,
// browser, application storage, native build or runtime acceptance.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const root=path.resolve(__dirname,'..'),out=path.join(root,'deliverables',process.env.NSP_TEMPLATE_VARIANT||'NSP-Portfolio-Editable-Master');
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
// Exercise the REAL canvas resolver before object clamping, and the REAL shared
// HTML renderer, in a VM. No browser, DOM, app bootstrap or application storage.
const shared=scripts.find(s=>s[2].includes('V.renderObjects = function'))[2];
const sharedCore=shared.slice(0,shared.indexOf('  paper = function'))+'\n})();';
const engine={window:{NSPIllustrator:api},state:{styleLibrary:[]}};
vm.runInNewContext(sharedCore,engine);
vm.runInNewContext(scripts.find(s=>s[1].includes('id="page-scene"'))[2],engine);
const V=engine.window.V13;
// Reproduce the reported regression through the same resolver with the design
// coordinate support disabled. Valid JSON alone did not catch this failure.
const legacyProbe=JSON.parse(JSON.stringify(pages[0]));delete legacyProbe.pageStyleOverrides.coordinateSpace;
engine.window.NSPIllustrator={...api,pageStyle:(p,s)=>s,canvasSize:(s,p)=>p};
const squeezed=V.resolvePage(legacyProbe);
assert.strictEqual(squeezed.width,842);assert.strictEqual(squeezed.height,595);
assert(squeezed.objects.some(o=>{const raw=legacyProbe.visualObjects.find(r=>r.id===o.id);return Math.abs(o.x-raw.x)>1||Math.abs(o.y-raw.y)>1;}));
engine.window.NSPIllustrator=api;
assert.strictEqual(V.pageSize({paperSize:'A4',orientation:'landscape'}).width,842);
assert.strictEqual(V.pageSize({paperSize:'A4',orientation:'landscape'}).height,595);
assert.throws(()=>api.coordinateSpace({width:Infinity,height:842}));
assert.throws(()=>api.coordinateSpace({width:0,height:842}));
const resolvedPages=pages.map(p=>V.resolvePage(p));
for(let i=0;i<pages.length;i++){
 const p=pages[i],resolved=resolvedPages[i];
 assert.strictEqual(resolved.width,1191);assert.strictEqual(resolved.height,842);
 assert.strictEqual(resolved.widthMm,297);assert.strictEqual(resolved.heightMm,210);
 for(const o of resolved.objects){const raw=p.visualObjects.find(r=>r.id===o.id);for(const k of ['x','y','w','h'])assert(Math.abs(o[k]-raw[k])<0.00001,o.id+' unexpectedly clamped '+k);}
 const document=V.renderDocument(p,i+1);
 assert(document.includes('--v13-width:1191px;--v13-height:842px;'));
 assert(document.includes('--v13-paper-width:297mm;--v13-paper-height:210mm;'));
 // Legacy ZIP: metadata-free Illustrator imports are recognized from their
 // source tags; a reload/duplicate must preserve geometry and the paper size.
 const legacy=JSON.parse(JSON.stringify(p));delete legacy.pageStyleOverrides.coordinateSpace;
 const old=V.resolvePage(legacy);assert.strictEqual(old.width,1191);assert.strictEqual(old.height,842);
 const duplicate=JSON.parse(JSON.stringify(p));duplicate.id+='-copy';assert.strictEqual(V.resolvePage(duplicate).width,1191);
 const stored=JSON.parse(JSON.stringify(p));assert.strictEqual(V.resolvePage(stored).width,1191);
}
// Templates carry the same style field used by instantiate/writeTemplateToPage.
for(const t of payload.templates)assert.strictEqual(V.resolvePage({id:t.id,visualObjects:t.objects,pageStyleOverrides:t.style,layers:t.layers}).width,1191);
const unrelated={id:'ordinary',pageStyleOverrides:{paperSize:'A4',orientation:'landscape'},visualObjects:[{id:'outside',type:'shape',x:900,y:700,w:50,h:50}]};
assert.strictEqual(V.resolvePage(unrelated).width,842);
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
  const resolved=resolvedPages[i];
  let svg='<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="'+resolved.width+'" height="'+resolved.height+'" viewBox="0 0 '+resolved.width+' '+resolved.height+'"><rect width="100%" height="100%" fill="white"/>'+resolved.objects.map(svgObject).join('')+'</svg>';
  // Nested vector markup uses width/height percentages; set its local viewport.
  svg=svg.replace(/<svg x="([^"]+)" y="([^"]+)" ([^>]*?)viewBox="0 0 ([^ ]+) ([^"]+)"/g,(m,x,y,attrs,w,h)=>'<svg x="'+x+'" y="'+y+'" '+attrs.replace('width="100%" height="100%"','width="'+w+'" height="'+h+'"')+'viewBox="0 0 '+w+' '+h+'"');
  fs.writeFileSync(path.join(preview,'page-'+(i+1)+'.svg'),svg);
  await sharp(Buffer.from(svg),{density:144,limitInputPixels:50000000}).resize(1191,842).png().toFile(path.join(preview,'page-'+(i+1)+'.png'));
 }
 const result={sourceSyntax:'PASS',primitiveAndSceneValidation:'PASS',actualImportSchemaValidator:'PASS',originalSqueezeReproduced:'PASS',actualSharedCanvasAndRenderer:'PASS',unclampedGeometryAllFivePages:'PASS',legacyZipRecovery:'PASS',templateAndDuplicateCanvas:'PASS',ordinaryA4Unaffected:'PASS',pages:5,reusableTemplates:5,canvas:[1191,842],paperMm:[297,210],counts,assets:assets.size,standaloneProofs:5,appRuntimeExecuted:false,printAcceptance:'OWNER_PENDING'};
 fs.writeFileSync(path.join(out,'static-validation.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
run().catch(e=>{console.error(e);process.exitCode=1;});
