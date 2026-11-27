/* NSP Graphics Core: document-space stops with screen-space snap tolerances. */
(function registerSmartGuides(V){
 'use strict';
 const core=V.graphicsCore,eps=1e-8;
 const validBox=b=>!!b&&[b.x,b.y,b.w,b.h,b.x+b.w,b.y+b.h].every(Number.isFinite)&&b.w>=0&&b.h>=0;
 function interval(b,k){
  if(!validBox(b)||!['x','y'].includes(k))return null;
  const span=k==='x'?b.w:b.h,low=b[k];
  return [low,low+span];
 }
 function axisStops(b,k){
  const i=interval(b,k);
  return i?[{value:i[0],edge:'start'},{value:i[0]+(i[1]-i[0])/2,edge:'center'},{value:i[1],edge:'end'}]:[];
 }
 function snapAxis(moving,targets,scale,threshold=8){
  if(!Array.isArray(moving)||!Array.isArray(targets)||!Number.isFinite(scale)||scale<=0||
    !Number.isFinite(threshold)||threshold<0)return null;
  let best=null;
  for(const m of moving){
   if(!m||!Number.isFinite(m.value))continue;
   for(const target of targets){
    if(!target||!Number.isFinite(target.value))continue;
    const delta=target.value-m.value,px=Math.abs(delta)*scale;
    const limit=Number.isFinite(target.threshold)?Math.min(threshold,Math.max(0,target.threshold)):threshold;
    if(px>limit+eps)continue;
    // Tier 0 is a real guide/visible alignment; use lower-ranked grid only
    // when no in-range real stop can be used. Caller may set explicit ranking.
    const priority=Number.isFinite(target.priority)?target.priority:target.kind==='grid'?1:0;
    if(!best||priority<best.priority||priority===best.priority&&px<best.px-eps)
     best={delta,target,moving:m,priority,px};
   }
  }
  return best?{delta:best.delta,target:best.target,moving:best.moving}:null;
 }
 function elements(bounds,others,axis){
  const i=interval(bounds,axis),crossAxis=axis==='x'?'y':'x',c=interval(bounds,crossAxis);
  if(!i||!c)return {before:null,after:null,equal:null};
  let before=null,after=null;
  for(const other of others){
   const b=other?.bounds||other,oi=interval(b,axis),oc=interval(b,crossAxis);
   if(!oi||!oc)continue;
   const low=Math.max(c[0],oc[0]),high=Math.min(c[1],oc[1]);
   if(high-low<=eps)continue; // Segment must belong to an overlapping lane.
   const cross=low+(high-low)/2;
   if(oi[1]<=i[0]+eps){
    const distance=Math.max(0,i[0]-oi[1]);
    if(!before||distance<before.distance-eps)before={axis,from:oi[1],to:i[0],cross,lane:[low,high],distance,other};
   }
   if(oi[0]>=i[1]-eps){
    const distance=Math.max(0,oi[0]-i[1]);
    if(!after||distance<after.distance-eps)after={axis,from:i[1],to:oi[0],cross,lane:[low,high],distance,other};
   }
  }
  const laneLow=before&&after?Math.max(before.lane[0],after.lane[0]):0,
    laneHigh=before&&after?Math.min(before.lane[1],after.lane[1]):0;
  const equal=before&&after&&laneHigh-laneLow>eps?{
   axis,kind:'equal-gap',edge:'center',value:before.from+(after.to-before.from)/2,
   distance:(before.distance+after.distance)/2,cross:laneLow+(laneHigh-laneLow)/2,before,after
  }:null;
  return {before,after,equal};
 }
 // Returned segments use `from/to` on the measured axis and `cross` on its
 // perpendicular axis. Dimensions are document units, not CSS px or mm.
 function gaps(bounds,others=[]){
  const list=Array.isArray(others)?others:[];
  return {x:elements(bounds,list,'x'),y:elements(bounds,list,'y')};
 }
 core.smartGuides=Object.freeze({snapAxis,axisStops,gaps});
})(window.V13);
