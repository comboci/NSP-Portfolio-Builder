/* NSP Graphics Core: deterministic declarative local layout plans. */
(function registerAutoLayout(V){
 'use strict';
 const core=V.graphicsCore, MAX_LENGTH=100000, MAX_ITEMS=500, EPS=1e-8;
 const modes=['row','column','grid'],alignments=['start','center','end','stretch'];
 const number=(value,fallback=0,min=0,max=MAX_LENGTH)=>
  typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
 const member=(v,choices,fallback)=>choices.includes(v)?v:fallback;
 function normalize(config={}){
  config=config&&typeof config==='object'?config:{};
  const p=config.padding&&typeof config.padding==='object'?config.padding:{};
  return {mode:member(config.mode,modes,'column'),padding:{
   top:number(p.top),right:number(p.right),bottom:number(p.bottom),left:number(p.left)
  },gap:number(config.gap,8),rowGap:number(config.rowGap,number(config.gap,8)),
   columnGap:number(config.columnGap,number(config.gap,8)),columns:Math.trunc(number(config.columns,2,1,40)),
   align:member(config.align,alignments,'start'),justify:member(config.justify,['start','center','end'],'start')};
 }
 function item(entry){
  const c=entry.constraints&&typeof entry.constraints==='object'?entry.constraints:entry;
  const minW=number(c.minW,1,1),minH=number(c.minH,1,1);
  const maxW=number(c.maxW,MAX_LENGTH,minW),maxH=number(c.maxH,MAX_LENGTH,minH);
  const width=number(entry.desiredW,number(entry.w,minW,minW,maxW),minW,maxW);
  const height=number(entry.desiredH,number(entry.h,minH,minH,maxH),minH,maxH);
  return {id:entry.id,width,height,minW,minH,maxW,maxH,
   fixed:entry.locked===true?'locked':Math.abs(number(entry.rotation,0,-360,360)%360)>EPS?'rotated':null};
 }
 const cap=(n,min,max)=>Math.min(max,Math.max(min,n));
 const offset=(slack,a)=>Math.max(0,slack)*(a==='end'?1:a==='center' ? .5 : 0);
 function plan(frame,children,config={}){
  const cfg=normalize(config);
  if(!frame||![frame.w,frame.h].every(v=>Number.isFinite(v)&&v>=1&&v<=MAX_LENGTH)||
    !Array.isArray(children)||children.length>MAX_ITEMS)
   throw Error('Invalid Auto Layout frame or child list.');
  const ids=new Set();
  const original=children.map(o=>{
   if(!o||typeof o!=='object'||typeof o.id!=='string'||!o.id||ids.has(o.id))
    throw Error('Invalid or duplicate Auto Layout child identity.');
   ids.add(o.id);return item(o);
  });
  const p=cfg.padding,content={x:p.left,y:p.top,w:Math.max(0,frame.w-p.left-p.right),h:Math.max(0,frame.h-p.top-p.bottom)};
  const blocked=original.filter(o=>o.fixed).map(o=>({id:o.id,reason:o.fixed}));
  // The adapter should refuse atomic application if blocked is non-empty.
  // A plan never moves or deletes these children and is still inspectable.
  const items=original.filter(o=>!o.fixed),rects=[],overflow=[];
  function add(i,x,y,w,h){
   const rect={id:i.id,x,y,w,h};
   rects.push(rect);
   if(x<content.x-EPS||y<content.y-EPS||x+w>content.x+content.w+EPS||y+h>content.y+content.h+EPS)
    overflow.push(i.id);
  }
  if(cfg.mode==='grid'){
   const cols=cfg.columns,cell=Math.max(0,(content.w-(cols-1)*cfg.columnGap)/cols);
   const widths=items.map(i=>cfg.align==='stretch'?cap(cell,i.minW,i.maxW):Math.min(i.width,Math.max(cell,i.minW)));
   const rowHeights=[];
   items.forEach((i,n)=>{const row=Math.floor(n/cols);rowHeights[row]=Math.max(rowHeights[row]||0,i.height);});
   const total=rowHeights.reduce((a,b)=>a+b,0)+Math.max(0,rowHeights.length-1)*cfg.rowGap;
   let y=content.y+offset(content.h-total,cfg.justify);
   for(let row=0;row<rowHeights.length;row++){
    const rowH=rowHeights[row];
    for(let col=0;col<cols;col++){
     const n=row*cols+col,i=items[n];if(!i)break;
     const w=widths[n],h=cfg.align==='stretch'?cap(rowH,i.minH,i.maxH):i.height;
     const x=content.x+col*(cell+cfg.columnGap)+offset(cell-w,cfg.align);
     add(i,x,y+offset(rowH-h,cfg.align),w,h);
     // A minimum wider than its assigned cell is overflow even if the
     // frame contains it: otherwise it could overlap the neighbouring cell.
     if(w>cell+EPS&&!overflow.includes(i.id))overflow.push(i.id);
    }
    y+=rowH+cfg.rowGap;
   }
  }else{
   const row=cfg.mode==='row',extent=row?content.w:content.h,cross=row?content.h:content.w;
   const total=items.reduce((sum,i)=>sum+(row?i.width:i.height),0)+Math.max(0,items.length-1)*cfg.gap;
   let cursor=(row?content.x:content.y)+offset(extent-total,cfg.justify);
   for(const i of items){
    const main=row?i.width:i.height,preferred=row?i.height:i.width;
    const size=cfg.align==='stretch'?cap(cross,row?i.minH:i.minW,row?i.maxH:i.maxW):preferred;
    const c=(row?content.y:content.x)+offset(cross-size,cfg.align);
    if(row)add(i,cursor,c,main,size);else add(i,c,cursor,size,main);
    cursor+=main+cfg.gap;
   }
  }
  return {config:cfg,content,rects,overflow,blocked};
 }
 core.autoLayout=Object.freeze({normalize,plan});
})(window.V13);
