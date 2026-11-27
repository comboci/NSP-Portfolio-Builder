/* NSP Graphics Core: selection geometry in document space. Embedded verbatim in index.html. */
(function registerSelectionGeometry(V){
 'use strict';
 const core=V.graphicsCore,A=core.affine;
 const EPS=1e-8;
 const pair=value=>Array.isArray(value)&&value.length===2&&value.every(Number.isFinite);
 const hasFrame=o=>!!o&&[o.x,o.y,o.w,o.h].every(Number.isFinite)&&o.w>0&&o.h>0;
 function polygon(o){
  return hasFrame(o)?A.quad(A.matrix(o,o.w,o.h),o.w,o.h):null;
 }
 function bounds(objects){
  if(!Array.isArray(objects)||!objects.length)return null;
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const o of objects){
   const corners=polygon(o);
   if(!corners||corners.some(point=>!pair(point)))return null;
   for(const [x,y] of corners){
    left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
   }
  }
  return {x:left,y:top,w:right-left,h:bottom-top};
 }
 function marqueeHit(o,box,crossing=false){
  if(!box||![box.x,box.y,box.w,box.h].every(Number.isFinite)||!box.w||!box.h)return false;
  const x=Math.min(box.x,box.x+box.w),y=Math.min(box.y,box.y+box.h),w=Math.abs(box.w),h=Math.abs(box.h);
  const corners=polygon(o);
  if(!corners||corners.some(point=>!pair(point))||!Number.isFinite(x+w)||!Number.isFinite(y+h))return false;
  if(!crossing)return corners.every(([px,py])=>px>=x-EPS&&px<=x+w+EPS&&py>=y-EPS&&py<=y+h+EPS);
  // Clipping the actual quadrilateral rejects false intersections with the
  // empty corners of a rotated object's axis-aligned bounding box.
  return A.clip(corners,[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]).length>0;
 }
 function scale(o,anchor,q){
  if(!hasFrame(o)||!pair(anchor)||!Number.isFinite(q)||q<=0)return null;
  const [ax,ay]=anchor;
  // The pivot is a fraction of dimensions. Scaling position and local
  // extents together scales every transformed corner about the same anchor.
  const x=ax+(o.x-ax)*q,y=ay+(o.y-ay)*q,w=o.w*q,h=o.h*q;
  return [x,y,w,h].every(Number.isFinite)&&w>0&&h>0?{x,y,w,h}:null;
 }
 function rotate(o,pivot,degrees){
  if(!hasFrame(o)||o.type==='block'||!pair(pivot)||!Number.isFinite(degrees))return null;
  const f=A.frame(o),[px,py]=A.point(o,f.px,f.py,f),[ax,ay]=pivot;
  const delta=(degrees%360)*Math.PI/180,c=Math.cos(delta),s=Math.sin(delta);
  const x=ax+c*(px-ax)-s*(py-ay)-f.px*o.w;
  const y=ay+s*(px-ax)+c*(py-ay)-f.py*o.h;
  let rotation=f.angle+degrees;
  if(rotation>360||rotation< -360)rotation%=360; // Persist within the document validator's signed range.
  return [x,y,rotation].every(Number.isFinite)?{x,y,rotation}:null;
 }
 // Signed shortest difference between two degree samples. A gesture that
 // accumulates this increment continuously can cross ±180° without a jump.
 function angleDelta(start,current){
  if(![start,current].every(Number.isFinite))return null;
  return (((current%360)-(start%360)+540)%360+360)%360-180;
 }
 core.selectionGeometry=Object.freeze({bounds,marqueeHit,scale,rotate,angleDelta});
})(window.V13);
