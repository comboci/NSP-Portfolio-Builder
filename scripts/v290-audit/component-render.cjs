const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync(process.argv[2],'utf8');
const V13={nsp:{slot:()=>{},builtin:()=>{}}};
const record={id:'hotel',hotelName:'Hotel QA',stars:'4',city:'City QA',year:'1404',images:{large:{assetId:'qa-image'}}};
const fields=['name','city','stars','year','systems'];
const system={id:'light',name:'Generic',nameFa:'فارسی',nameEn:'English',assetId:'icon'};
const capStart=html.indexOf('const systemCaption='),capEnd=html.indexOf('const tools={records,systems:',capStart);
const caption=vm.runInNewContext(html.slice(capStart,capEnd)+';systemCaption;');
const tools={
 systemCaption:caption,records:()=>[record],systems:()=>[system],primitive:(id,type,x,y,w,h,a={})=>({id,type,x,y,w,h,...a}),
 text:(id,text,x,y,w,h,_o,a={})=>({id,type:'text',text,x,y,w,h,...a})
};
const context=vm.createContext({V13,window:{V13},fields,records:tools.records,systemRows:tools.systems,text:tools.text,
 systemCaption:caption});
for(const id of ['nsp-view','nsp-slots']){
 const script=new RegExp('<script id="'+id+'">([\\s\\S]*?)<\\/script>').exec(html)?.[1];
 assert.ok(script);vm.runInContext(script,context,{filename:id+'.js'});
}
const start=html.indexOf('function layoutText(o,p)'),end=html.indexOf('function content(o,opts)',start);
assert.equal(caption(system,{direction:'rtl'}),'فارسی');assert.equal(caption(system,{direction:'ltr'}),'English');assert.equal(caption(system,{direction:'rtl',systemLabelLanguage:'generic'}),'Generic');
const N=V13.nsp;N.layoutText=vm.runInContext(html.slice(start,end)+';layoutText;',context);
const options={fields:['name','systems'],order:['name','systems'],layoutDirection:'rtl',direction:'rtl',imageRole:'large',
 showImage:true,systemMode:'both',spacing:0,fontSize:12,lineHeight:1.5,recordGap:4,indent:0,align:'right',separator:' · '};
const textStyle={id:'slot-text',type:'text',nspField:'hotelText',x:22,y:22,w:130,h:60,fontSize:23,fontFamily:'Arial',
 direction:'ltr',color:'#ff0000',lineHeight:2,opacity:0.4,verticalAlign:'bottom'};
const customText={id:'text',nspBase:'hotelText',nspUseLayout:false,nspSlots:[textStyle],nspDesignSize:{w:200,h:120},w:200,h:120,nspOptions:options};
const rendered=N.applySlots(customText,[],{},tools)[0];
assert.equal(rendered.x,22);assert.equal(rendered.y,22);assert.equal(rendered.h,46);
for(const key of ['fontSize','fontFamily','direction','color','lineHeight','opacity','verticalAlign'])assert.equal(rendered[key],textStyle[key]);
assert.ok(rendered.text.includes(record.hotelName));
const view={id:'local-view-card-6',nspBase:'hotelView',nspUseLayout:false,nspDesignSize:{w:720,h:470},w:720,h:470,
 nspSlots:[{id:'photo',nspField:'image',x:0,y:0,w:130,h:110,rotation:30,opacity:0.4},
 {id:'name',nspField:'name',x:145,y:12,w:180,h:70,verticalAlign:'bottom',fontStyle:'italic',opacity:0.4,direction:'ltr'}],
 nspOptions:options};
const custom=N.applySlots(view,N.layoutView(view,{},tools),{},tools);
const image=custom.find(p=>p.type==='image'),name=custom.find(p=>p.type==='text');
assert.equal(image.rotation,30);assert.equal(image.opacity,0.4);assert.equal(image.assetId,'qa-image');
assert.equal(name.verticalAlign,'bottom');assert.equal(name.fontStyle,'italic');assert.equal(name.opacity,0.4);
const grid={...view,id:'local-card-2-view-grid',nspBase:'hotelGrid',w:900,h:480,nspDesignSize:{w:900,h:480},
 nspOptions:{...options,cols:2,count:2,background:'transparent',borderWidth:0}};
const gridTools={...tools,records:()=>[record,{...record,id:'second',hotelName:'Second'}]};
const gridResult=N.applySlots(grid,N.layoutGrid(grid,{},gridTools),{},gridTools);
assert.equal(gridResult.filter(p=>p.type==='text').length,2);
assert.equal(gridResult.some(p=>p.type==='shape'),false);
const cleanBody=html.slice(html.indexOf(' function cleanSlots(input,base){'),html.indexOf(' function shape(def'));
const keyList=/ const keys='([^']+)'\.split/.exec(html.slice(html.indexOf('<script id="nsp-editor">')))?.[1];
const clean=vm.runInNewContext(cleanBody+';cleanSlots',{keys:keyList.split(' '),primitive:new Set(['text']),cp:v=>JSON.parse(JSON.stringify(v)),slotTypes:{name:'text'},v13Objects:x=>x});
const layers=clean([{id:'hidden-layer',type:'text',text:'QA',visible:true,layerVisible:false,renderVisible:false},
 {id:'hidden-self',type:'text',visible:false},{id:'visible',type:'text',visible:true,layerVisible:true,renderVisible:true}], 'hotelView');
assert.deepEqual(Array.from(layers,x=>x.visible),[false,false,true]);
assert.match(html,/inertBackground.set\(el,el.inert\);el.inert=true/);
assert.match(html,/for\(const \[el,wasInert\] of inertBackground\)el.inert=wasInert/);
assert.match(html,/active===first:active===last/);
assert.match(html,/previous\?\.isConnected&&!previous.disabled\)previous.focus/);
console.log('PB-11/15/17 positive renderer VM + PB-18 focus source contract PASS');
