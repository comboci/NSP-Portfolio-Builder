const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const text=fs.readFileSync(process.argv[2]||'index.html','utf8');
function scope(a,b){const x=text.indexOf(a),y=text.indexOf(b,x+a.length);assert(x>=0&&y>x,[a,b].join(' ... '));return text.slice(x,y);}
let uid=0;
let v=vm.runInNewContext([
 scope('function v291RemapProjectPortfolios','async function v77CopyProject'),
 scope('function normalizeName','function v277PrepareOpen'),
 scope('function v276PortfolioIds','async function v276FindDiskProject'),
 ';({copy:v291RemapProjectPortfolios, resolve:v277ResolveImportProject,disk:v276DiskIdentity})'
].join('\n'),{uid:()=>`new-${++uid}`,fail(m){throw Error(m)},safeFolder:n=>n});
const pages=[{id:'page001',visualObjects:[{id:'object001',assetId:'private001'}]}];
const original={id:'project-a',name:'Hotel Alpha',data:{activePortfolioId:'pf-2', portfolios:[{id:'pf-1',pages:[]},{id:'pf-2',pages}],pages}};
const oldCopy={...original,id:'project-old-copy',name:'Hotel Alpha (old copy)'};
const copy={id:'new-id',name:'Hotel Alpha (copy)',data:v.copy(structuredClone(original.data))};
const payload=(project, tagged)=>({app:'NSP Portfolio Builder',kind:'NSP-Project-Backup',schemaVersion:2,
 project:{...(tagged?{workspaceId:project.id}:{}),name:project.name,data:project.data}});
assert.notEqual(copy.data.portfolios[0].id,'pf-1');
assert.notEqual(copy.data.portfolios[1].id,'pf-2');
assert.equal(copy.data.activePortfolioId,copy.data.portfolios[1].id);
assert.equal(copy.data.pages,copy.data.portfolios[1].pages);
assert.deepEqual(copy.data.pages,pages); assert.equal(original.data.portfolios[1].id,'pf-2');
assert.throws(()=>v.copy({portfolios:[{id:'x'},{id:'x'}]}),/یکتا/);
assert.equal(v.resolve(payload(original,false),[original,oldCopy,copy]),original);
assert.equal(v.resolve(payload(original,true),[original,oldCopy,copy]),original);
assert.equal(v.resolve(payload(copy,true),[original,oldCopy,copy]),copy);
assert.equal(v.resolve(payload(copy,true),[original]),null);
assert.equal(v.resolve(payload({...original,name:'Renamed'},true),[original]),original);
assert.throws(()=>v.resolve(payload({...original,id:'different'},true),[original]),/جایگزین نشد/);
assert.throws(()=>v.resolve(payload({...original,name:'Renamed'},false),[original]),/تطابق ندارد/);
assert.throws(()=>v.resolve(payload({...original,id:'bad id'},true),[original]),/معتبر نیست/);
assert.equal(v.disk(payload(original,true),original,[original,oldCopy,copy],original.name),'match');
assert.equal(v.disk(payload(original,true),copy,[original,oldCopy,copy],original.name),'other');
assert.equal(v.disk(payload({...original,id:'different'},true),original,[original],original.name),'uncertain');
assert.equal(v.disk(payload(original,false),original,[original,oldCopy],original.name),'uncertain');
assert.equal(v.disk(payload(original,false),original,[original,copy],original.name),'match');
const blank={...original,data:{portfolios:[],pages:[],activePortfolioId:null}};
assert.equal(v.disk(payload(blank,false),blank,[blank],blank.name),'legacy-empty');
assert.equal(v.disk(payload(blank,true),blank,[blank],blank.name),'match');
console.log('PASS PB-05: active portfolio remap preserves page graph; tagged and legacy Open/Delete positive/negative identity cases.');
