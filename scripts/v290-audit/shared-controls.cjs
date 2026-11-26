const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.argv[2],'utf8');
function code(id){const a='<script id="'+id+'">',i=source.indexOf(a);assert.ok(i>=0);return source.slice(i+a.length,source.indexOf('</script>',i));}
(async()=>{
 const p={id:'portfolio',pages:[],nspHotels:[{id:'hotel',hotelName:'QA',projectName:'QA',city:'',stars:'',year:'1404',systems:['old-system'],images:{}}],nspDataControls:[{id:'catalog',name:'Systems',type:'systems',entries:[{id:'light',name:'Generic',nameFa:'فارسی',nameEn:'English',assetId:''}]}]};
 let deferred=[],saves=0;const messages=[];
 const c=vm.createContext({V13:{editor:{},flushStorage(){return new Promise(r=>deferred.push(r));}},state:{activeWorkspaceId:'workspace',activePortfolioId:p.id,portfolios:[p]},document:{addEventListener(){},querySelector(){return null}},save(){saves++;return true},render(){},alert(x){messages.push(x)},window:null});c.window=c;
 for(const id of ['nsp-tray','nsp-controls','nsp-hotels','nsp-view'])new vm.Script(code(id),{filename:id}).runInContext(c);
 const N=c.V13.nsp;
 assert.doesNotThrow(()=>N.validate(c.state));assert.deepEqual(Array.from(N.unresolvedSystems(p.nspHotels[0],p)),['old-system']);
 const o={id:'item',w:430,h:260,hotelIds:['hotel'],nspOptions:N.cleanOptions({fields:['systems'],direction:'ltr'})};
 assert(N.layoutText(o,p).some(x=>x.text.includes('Undefined system')));
 const one=N.editHotel(p,'hotel',r=>({systems:[...r.systems,'light']})),two=N.editHotel(p,'hotel',r=>({systems:r.systems.filter(x=>x!=='old-system')}));
 await Promise.resolve();assert.equal(saves,1);deferred.shift()();assert.equal(await one,true);
 await Promise.resolve();assert.equal(saves,2);deferred.shift()();assert.equal(await two,true);
 assert.deepEqual(Array.from(p.nspHotels[0].systems),['light']);
 assert(N.layoutText(o,p).some(x=>x.text.includes('English')));assert(N.layoutText({...o,nspOptions:{...o.nspOptions,direction:'rtl'}},p).some(x=>x.text.includes('فارسی')));
 assert(N.layoutText({...o,nspOptions:{...o.nspOptions,systemLabelLanguage:'generic'}},p).some(x=>x.text.includes('Generic')));
 assert.equal(messages.length,0);assert.match(source,/push\('error','unresolvedHotelSystem'/);
 console.log('PASS PB10 two queued/rebased actual mutations; PB12 legacy unresolved preservation and print contract; PB14 locale and fallback modes');
})().catch(e=>{console.error(e);process.exit(1)});
