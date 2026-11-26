// Portable NSP Portfolio Browser acceptance runner. Never touches real browser profiles or repo files.
const {chromium}=require('playwright'), http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(process.env.NSP_REPO||path.join(__dirname,'../..')), out=path.resolve(process.env.NSP_QA_OUT||__dirname);
const old=cp.execFileSync('unzip',['-p',path.join(root,'Project ZIP/Portfolio-01.zip'),'project file/Portfolio-01/project.json']);
const descriptions=['Two isolated portfolios/multiple pages','Two logo variants and multiple bound images','One logo update with geometry unchanged','System name/icon propagates to Hotel View and Grid','Hotel Text fields and RTL/LTR','Hotel View independent visibility','Grid with four distinct hotels','Create Hotel View Square','Published component appears in Toolbox','Reload component and reuse','ZIP roundtrip preserve refs','Print/PDF without tray','Open pre-V290 project','Drag and Properties responsiveness','Database unavailable/no Office traffic'];
function reply(req,res){
 const uri=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(uri==='/qa-old-project.json'){res.setHeader('Content-Type','application/json');return res.end(old);}
 const f=path.resolve(root,'.'+uri);if(!f.startsWith(root+'/')||f.split('/').includes('.git')){res.statusCode=403;return res.end();}
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
 if(types[path.extname(f)])res.setHeader('Content-Type',types[path.extname(f)]);
 fs.createReadStream(f).on('error',()=>{res.statusCode=404;res.end();}).pipe(res);
}
async function main(){
 const adapter=require(process.env.NSP_QA_ADAPTER?path.resolve(process.env.NSP_QA_ADAPTER):path.join(__dirname,'late.cjs'));
 const server=http.createServer(reply).listen(0,'127.0.0.1');await new Promise((r,j)=>{server.once('listening',r);server.once('error',j);});let browser;
 try{
 const git=(...args)=>cp.execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 const url='http://127.0.0.1:'+server.address().port+'/index.html',origin=new URL(url).origin;
 browser=await chromium.launch({executablePath:process.env.NSP_CHROME||undefined,args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:1600,height:1050},deviceScaleFactor:1,locale:'fa-IR',acceptDownloads:true});
 const requests=[],errors=[],dialogs=[],answers=[];context.on('request',r=>requests.push({url:r.url(),method:r.method(),type:r.resourceType()}));
 await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
 const page=await context.newPage();page.setDefaultTimeout(6500);page.on('pageerror',e=>errors.push(e.stack));
 page.on('dialog',async d=>{dialogs.push({type:d.type(),message:d.message()});const a=answers[0];if(a?.type===d.type()){answers.shift();if(a.accept!==false)await d.accept(a.text);else await d.dismiss();}else if(d.type()==='confirm'&&d.message().includes('هشدار حاشیه'))await d.accept();else await d.dismiss();});
 const result={branch:git('branch','--show-current'),commit:git('rev-parse','HEAD'),workingTreeClean:!git('status','--porcelain'),applicationHash:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'index.html'))).digest('hex'),url,browser:browser.version(),backend:'Browser; Native/Tauri NOT_RUN',scenarios:[],errors,requests,dialogs};
 const ready=()=>page.waitForFunction(()=>window.V13?.persistenceState==='saved');
 const projects=()=>page.locator('button[onclick^="go("]').filter({hasText:'پروژه‌ها'}).last().click();
 const flush=async()=>{await page.evaluate(async()=>{await V13.flushStorage();if(V13.saveError||V13.saveBlocked)throw Error(V13.saveError||'saving blocked');});await ready();};
 const snapshot=()=>page.evaluate(()=>JSON.parse(JSON.stringify(state)));
 async function fileInOPFS(data) {
  await page.evaluate(async data=>{const dir=await navigator.storage.getDirectory();const f=await dir.getFileHandle('project.json',{create:true});const writer=await f.createWritable();await writer.write(data);await writer.close();window.showDirectoryPicker=()=>Promise.resolve(dir);},data);
 }
 async function openOld(){
  await projects();await fileInOPFS(old.toString());answers.push({type:'prompt',text:'1'});
  await page.locator('button[onclick="v265OpenRepository()"]').click();const raw=JSON.parse(old).project;
  await page.getByRole('button',{name:raw.name,exact:true}).waitFor();await ready();
  const now=await snapshot();assert.equal(now.activeWorkspaceName,raw.name);assert.equal(now.portfolios.length,raw.data.portfolios.length);
  const pages=now.portfolios.flatMap(p=>p.pages), originals=raw.data.portfolios.flatMap(p=>p.pages);assert.equal(pages.length,originals.length);
  for(const [i,p] of pages.entries()){assert.equal(p.title,originals[i].title);assert.equal(p.visualObjects.length,originals[i].visualObjects.length);assert.equal(p.pageStyleOverrides?.orientation,originals[i].pageStyleOverrides?.orientation);}
  return {basis:'Actual Open Project UI, test supplies real OPFS handle for native folder picker. Actual checked-in V268 project.',pages:pages.length,objects:pages.reduce((n,p)=>n+p.visualObjects.length,0)};
 }
 async function printApp(portfolioId,file='integration-print.pdf',traySelector){
  await page.evaluate(()=>{window.__qaPrints=0;window.print=()=>{window.__qaPrints++;};});
  await page.evaluate(id=>{void v111PrintPortfolio(state.activeWorkspaceId,id||state.activePortfolioId);},portfolioId);
  try{await page.waitForFunction(()=>window.__qaPrints>0,undefined,{timeout:3000});}catch(e){throw Error('Print not invoked. '+(await page.locator('#v82-preflight-results').first().textContent().catch(()=>'')));}
  if(traySelector)assert.equal(await page.locator('.print-zone '+traySelector).count(),0);
  const media=await page.evaluate(()=>({snapshot:document.querySelectorAll('#v37-print-snapshot article.v13-document').length,bodyClass:document.body.className,statePages:state.pages.length}));
  await page.emulateMedia({media:'print'});
  const layout=await page.evaluate(()=>Array.from(document.querySelectorAll('#v37-print-snapshot article.v13-document')).map(x=>({y:x.getBoundingClientRect().y,h:x.getBoundingClientRect().height,break:getComputedStyle(x).breakAfter,page:getComputedStyle(x).page,bodyOverflow:getComputedStyle(document.body).overflow,htmlOverflow:getComputedStyle(document.documentElement).overflow,parentOverflow:getComputedStyle(x.parentElement).overflow})));
  const target=path.join(out,file);await page.pdf({path:target,preferCSSPageSize:true,printBackground:true});
  await page.emulateMedia({media:'screen'});
  const info=cp.execFileSync('pdfinfo',[target],{encoding:'utf8'}), extracted=cp.execFileSync('pdftotext',[target,'-'],{encoding:'utf8'});
  const pages=Number(/^Pages:\s+(\d+)/m.exec(info)?.[1]);assert.ok(pages>0);const expectedPages=await page.evaluate(id=>state.portfolios.find(x=>x.id===(id||state.activePortfolioId))?.pages.length,portfolioId);assert.equal(pages,expectedPages,'PDF lost or added pages '+JSON.stringify({actual:pages,expected:expectedPages,media,layout}));assert.ok(!/System Logos|Data Controls Tray/.test(extracted),'tray leaked into PDF text');
  return {file,pages,physicalSize:/^Page size:\s+(.*?)$/m.exec(info)?.[1],nativeDialog:'NOT_RUN (intercepted window.print; Chromium emitted PDF)'};
 }
 async function zipRoundtrip(input,verify){
  const decision={type:'confirm',accept:true};answers.push(decision);let r;
  try{r=await page.evaluate(async input=>{
   const T=V265RepositoryTransport,U=V268ZipTransport;
   const packed=await T.pack(input,new Map(),async bytes=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join(''));
   const entries=new Map([['project.json',new TextEncoder().encode(packed.json)],...[...packed.files].map(([n,b])=>['Image/'+n,b])]);
   const z=new File(T.zipParts(entries),'QA-Roundtrip.zip',{type:'application/zip'});
   const root=await (await navigator.storage.getDirectory()).getDirectoryHandle('qa-zip-root',{create:true});
   const marker=await root.getFileHandle('index.html',{create:true});await (await marker.createWritable()).close();
   const raw=(await U.readRepositoryZip(z)).raw;
   const imported=await U.importRepositoryZip(z,state,root);
   return {raw,imported,state:JSON.parse(JSON.stringify(state)),files:entries.size};
  },input);}finally{const i=answers.indexOf(decision);if(i>=0)answers.splice(i,1);}
  assert.equal(r.imported,true);await verify?.(r.raw,r.state);
  return {files:r.files,basis:'Actual application ZIP pack/read/import/write/readback through isolated OPFS; native chooser not run.'};
 }
 async function dragMeasure(selector,{dx=90,dy=55,steps=18}={}){
  const t=page.locator(selector).first();const p=await t.evaluate(el=>{const r=el.getBoundingClientRect();for(const yy of [0.55,0.4,0.3,0.65])for(const xx of [0.45,0.6,0.3,0.7]){const x=r.left+r.width*xx,y=r.top+r.height*yy,hit=document.elementFromPoint(x,y);if(hit?.closest('[data-v13-object-id]')===el)return {x,y,hit:hit.className,r:[r.x,r.y,r.width,r.height]};}return {x:null,rect:[r.x,r.y,r.width,r.height],hit:document.elementFromPoint(Math.max(0,r.x+40),Math.max(0,r.y+40))?.outerHTML.slice(0,220)};});
  assert.ok(p.x!==null,'object inaccessible at drag origin '+JSON.stringify(p));
  const {x,y}=p;
  await page.evaluate(()=>{const vals=[];let stop=false,prev=performance.now();window.__qaFrames={vals,stop:()=>{stop=true;}};requestAnimationFrame(function tick(ms){vals.push(ms-prev);prev=ms;if(!stop)requestAnimationFrame(tick);});});
  const start=Date.now();await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+dy,{steps});await page.mouse.up();
  const frames=await page.evaluate(()=>{window.__qaFrames.stop();return [...window.__qaFrames.vals];});assert.ok(frames.length>1);
  frames.sort((a,b)=>a-b);
  return {dragMs:Date.now()-start,maxFrameMs:frames.at(-1),p95FrameMs:frames[Math.floor(frames.length*.95)],samples:frames.length,dragOrigin:p,basis:'One isolated headless Chromium drag; not Windows performance certification.'};
 }
 fs.mkdirSync(out,{recursive:true});
 const h={root,out,url,origin,context,page,assert,answers,ready,flush,projects,snapshot,openOld,printApp,zipRoundtrip,dragMeasure,requests,errors,dialogs};
 await page.addInitScript(()=>{const start=()=>new MutationObserver(()=>{const save=document.querySelector('.v275-leave-dialog[open] button[value=save]');if(save)save.click();}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});if(document.documentElement)start();else document.addEventListener('DOMContentLoaded',start,{once:true});});
 await page.goto(url);await ready();result.title=await page.title();
 if(adapter.setup){try{await adapter.setup(h);}catch(e){result.setupError=String(e?.stack||e);}}
 const persist=()=>fs.writeFileSync(path.join(out,'integration-report.json'),JSON.stringify(result,null,2)+'\n');
 for(let i=0;i<descriptions.length;i++){
  const id=([1,2,3,4,5,6,7,8,9,10,14,15,12,11,13])[i],scenario=descriptions[id-1],fn=adapter.scenarios?.[id]||(id===13?openOld:null);
  if(!fn){result.scenarios.push({id,scenario,status:'NOT_RUN',reason:'No adapted workflow was available.'});continue;}
  persist();console.error("scenario",id,"begin");
  try{const evidence=await fn(h);if(!evidence)throw Error('No evidence returned');result.scenarios.push({id,scenario,status:evidence.status||'PASS',evidence});}
  catch(e){result.scenarios.push({id,scenario,status:'FAIL',reason:String(e?.stack||e)});}
 }
 fs.writeFileSync(path.join(out,'integration-report.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({title:result.title,commit:result.commit,applicationHash:result.applicationHash,setupError:result.setupError,scenarios:result.scenarios,errors},null,2));
 if(result.setupError||result.scenarios.some(x=>x.status==='FAIL')||errors.length)process.exitCode=1;
 }finally{await browser?.close();server.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
