/* NSP Graphics Core: physical trim, optional bleed and binder-clearance policy.
   Geometry is in physical mm measured from the trim origin. */
(function registerPrintPolicy(V){
 'use strict';
 const sides=['left','right','top','bottom'];
 const epsilon=1e-7, maxCoverageRects=512;
 function length(v,fallback,max){
  if(typeof v!=='number'&&(typeof v!=='string'||!v.trim()))return fallback;
  const n=Number(v);
  return Number.isFinite(n)?Math.max(0,Math.min(max,n)):fallback;
 }
 function normalize(s){
  s=s&&typeof s==='object'?s:{};
  return {
   paper:['A3','A4','A5'].includes(s.paper)?s.paper:'A4',
   safeMarginMm:length(s.safeMarginMm,10,30),
   bleedEnabled:s.bleedEnabled===true,
   bleedMm:length(s.bleedMm,0,20),
   binderSide:sides.includes(s.binderSide)?s.binderSide:'none',
   binderClearanceMm:length(s.binderClearanceMm,0,50)
  };
 }
 const rect=(x,y,w,h)=>({x,y,w,h});
 function validRect(r){
  return r&&[r.x,r.y,r.w,r.h].every(Number.isFinite)&&r.w>0&&r.h>0;
 }
 function plan(dimensions,s){
  const settings=normalize(s),{widthMm:w,heightMm:h}=dimensions||{};
  if(![w,h].every(n=>Number.isFinite(n)&&n>=1&&n<=5000))throw Error('Invalid physical trim dimensions.');
  const b=settings.bleedEnabled?settings.bleedMm:0;
  const trim=rect(0,0,w,h),sheet=rect(-b,-b,w+2*b,h+2*b);
  const bleedBands=b>0?[
   {edge:'top',...rect(-b,-b,w+2*b,b)},{edge:'bottom',...rect(-b,h,w+2*b,b)},
   {edge:'left',...rect(-b,0,b,h)},{edge:'right',...rect(w,0,b,h)}
  ]:[];
  const side=settings.binderSide;
  const d=Math.min(settings.binderClearanceMm,side==='top'||side==='bottom'?h:w);
  const binder=side==='none'||d===0?null:
   side==='left'?rect(0,0,d,h):side==='right'?rect(w-d,0,d,h):
   side==='top'?rect(0,0,w,d):rect(0,h-d,w,d);
  return {settings,trim,sheet,binder,bleedBands};
 }
 function intersectRect(a,b){
  const x=Math.max(a.x,b.x),y=Math.max(a.y,b.y);
  const w=Math.min(a.x+a.w,b.x+b.w)-x,h=Math.min(a.y+a.h,b.y+b.h)-y;
  return w>0&&h>0?rect(x,y,w,h):null;
 }
 function bandUncovered(band,rects){
  const clips=rects.map(r=>intersectRect(band,r)).filter(Boolean);
  const boundaries=[...new Set([band.x,band.x+band.w,...clips.flatMap(r=>[r.x,r.x+r.w])])].sort((a,b)=>a-b);
  let covered=0;
  for(let i=1;i<boundaries.length;i++){
   const lo=boundaries[i-1],hi=boundaries[i],mid=lo+(hi-lo)/2;
   const ranges=clips.filter(r=>r.x<=mid&&mid<=r.x+r.w).map(r=>[r.y,r.y+r.h]).sort((a,b)=>a[0]-b[0]);
   let y=band.y,sum=0;
   for(const [a,b] of ranges){
    if(b>y){sum+=b-Math.max(a,y);y=b;}
   }
   covered+=(hi-lo)*sum;
  }
  return Math.max(0,band.w*band.h-covered);
 }
 function bleedCoverage(p,opaqueAxisAlignedRectsMm=[]){
  if(!p?.bleedBands?.length)return {enabled:false,complete:true,uncovered:[]};
  if(!Array.isArray(opaqueAxisAlignedRectsMm)||opaqueAxisAlignedRectsMm.length>maxCoverageRects)
   return {enabled:true,complete:false,uncovered:[],reason:'coverage-unverified'};
  const certified=opaqueAxisAlignedRectsMm.filter(validRect);
  const uncovered=p.bleedBands.map(b=>({edge:b.edge,areaMm2:bandUncovered(b,certified)})).filter(x=>x.areaMm2>epsilon);
  return {enabled:true,complete:uncovered.length===0,uncovered};
 }
 function area(poly){
  let sum=0;
  for(let i=1;i+1<poly.length;i++)sum+=(poly[i][0]-poly[0][0])*(poly[i+1][1]-poly[0][1])-
   (poly[i][1]-poly[0][1])*(poly[i+1][0]-poly[0][0]);
  return Math.abs(sum)/2;
 }
 function binderIntersection(p,shape){
  const b=p?.binder;
  if(!b)return {intersects:false,areaMm2:0};
  if(validRect(shape)){
   const overlap=intersectRect(b,shape);
   const areaMm2=overlap?overlap.w*overlap.h:0;
   return {intersects:areaMm2>epsilon,areaMm2};
  }
  // Accept a finite simple convex paint footprint (e.g. transformed object quad).
  if(!Array.isArray(shape)||shape.length<3||shape.length>64||
   !shape.every(pt=>Array.isArray(pt)&&pt.length===2&&pt.every(Number.isFinite)))
   return {intersects:false,areaMm2:0,reason:'footprint-unverified'};
  const affine=V.graphicsCore.affine;
  const areaMm2=area(affine.clip(shape,affine.quad(affine.identity,b.w,b.h,b.x,b.y)));
  return {intersects:areaMm2>epsilon,areaMm2};
 }
 V.graphicsCore=V.graphicsCore||{};
 V.graphicsCore.printPolicy=Object.freeze({normalize,plan,bleedCoverage,binderIntersection});
})(window.V13);
