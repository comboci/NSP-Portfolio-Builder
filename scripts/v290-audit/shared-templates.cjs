const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const text=fs.readFileSync(process.argv[2]||'index.html','utf8');
function scope(a,b){const x=text.indexOf(a),y=text.indexOf(b,x+a.length);assert(x>=0&&y>x,[a,b].join(' ... '));return text.slice(x,y);}
let uid=0;
const state={styleLibrary:[],templates:[],templateCategories:[],globalImageLibrary:[]};
const importDeps=vm.runInNewContext([
 scope('function v13Copy','function initialProjectData'),
 scope('function v111AssetIds','function backupScenes'),
 scope('function backupScenes','function backupDependencies'),
 scope('function v291TemplateSignature','async function v111ExportProject'),
 'importBackupDependencies',
].join('\n'),{uid:()=>`new-${++uid}`,state,window:{NSPIllustrator:{validate(){}, pageStyle:(record,style)=>style}}});
const img='data:image/png;base64,YQ==';
const cat={id:'source-cat',name:'Hotel',parentId:null};
const style={id:'source-style',name:'A',fontFamily:'Arial',fontSize:12,fontWeight:400,color:'#000'};
const tpl={id:'source-template',name:'Hotel',categoryId:cat.id,objects:[{id:'hero',type:'image',assetId:'asset',styleId:style.id,templateSourceId:'source-template'}]};
const deps={templates:[tpl],templateCategories:[cat],styleLibrary:[style],publicImages:[{id:'asset',src:img}]};
function load(data=deps){
 const source=data.templates[0].id;
 const pg={id:'page-1',pageTemplateId:source,visualObjects:[{id:'page-hero',templateSourceId:source,assetId:'asset',styleId:style.id}],layers:[{id:'image-layer',templateSourceId:source}],snapshot:{objects:[{id:'snap-hero',templateSourceId:source}],layers:[{id:'snap-layer',templateSourceId:source}]}};
 Object.assign(state,importDeps(data,[{pages:[pg]}],[],[]));return pg;
}
const first=load(),second=load();
assert.equal(state.templates.length,1);
assert.equal(state.styleLibrary.length,1);
assert.equal(state.globalImageLibrary.length,1);
assert.equal(first.pageTemplateId,second.pageTemplateId);
for(const row of [...second.visualObjects,...second.layers,...second.snapshot.objects,...second.snapshot.layers])assert.equal(row.templateSourceId,first.pageTemplateId);
assert.equal(second.visualObjects[0].assetId,state.globalImageLibrary[0].id);
assert.equal(second.visualObjects[0].styleId,state.styleLibrary[0].id);
const variant=structuredClone(deps);variant.templates[0].objects[0].x=40;
const different=load(variant);
assert.equal(state.templates.length,2);
assert.notEqual(different.pageTemplateId,first.pageTemplateId);
assert.equal(load(variant).pageTemplateId,different.pageTemplateId);
assert.equal(state.templates[0].objects[0].x,0);
const renumber=structuredClone(deps);renumber.templates[0].id='another-id';renumber.templates[0].updatedAt='2026-11-01T00:00:00Z';
assert.equal(load(renumber).pageTemplateId,first.pageTemplateId);
assert.equal(state.templates.length,2);
assert.equal(load().pageTemplateId,first.pageTemplateId);
assert.equal(state.templates.length,2);
console.log('PASS PB-13: repeat and renumbered exact reuse; actual content conflict forks once; references rebound and prior design unmodified.');
