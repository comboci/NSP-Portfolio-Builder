/* NSP Graphics Core: affine geometry. Embedded verbatim in index.html. */
(function registerAffine(V){
 'use strict';
 const pivots=Object.freeze(Object.fromEntries(Object.entries({
  center:[.5,.5],'top-left':[0,0],'top-center':[.5,0],'top-right':[1,0],
  'middle-left':[0,.5],'middle-right':[1,.5],'bottom-left':[0,1],
  'bottom-center':[.5,1],'bottom-right':[1,1]
 }).map(([key,value])=>[key,Object.freeze(value)])));
 const identity=Object.freeze([1,0,0,1,0,0]);
 const finite=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
 const clamp=(value,min,max,fallback)=>Math.max(min,Math.min(max,finite(value,fallback)));
 function frame(o){
  const [px,py]=Object.hasOwn(pivots,o.transformPivot)?pivots[o.transformPivot]:pivots.center;
  const angle=o.type==='block'?0:clamp(o.rotation,-360,360,0),rad=angle*Math.PI/180;
  const cos=Math.cos(rad),sin=Math.sin(rad);
  const mx=o.type!=='block'&&o.flipH===true?-1:1,my=o.type!=='block'&&o.flipV===true?-1:1;
  return {px,py,angle,mx,my,xx:cos*mx,xy:-sin*my,yx:sin*mx,yy:cos*my};
 }
 function offset(f,w,h,u,v){
  const a=(u-f.px)*w,b=(v-f.py)*h;
  return [f.px*w+f.xx*a+f.xy*b,f.py*h+f.yx*a+f.yy*b];
 }
 function point(o,u,v,f=frame(o)){
  const [x,y]=offset(f,o.w,o.h,u,v);
  return [o.x+x,o.y+y];
 }
 function matrix(o,w,h){
  const f=frame(o),[x,y]=offset(f,w,h,0,0);
  return [f.xx,f.yx,f.xy,f.yy,finite(o.x,0)+x,finite(o.y,0)+y];
 }
 function css(o){
  if(o.type==='block')return '';
  const f=frame(o);
  return 'transform-origin:'+(f.px*100)+'% '+(f.py*100)+'%;transform:rotate('+f.angle+'deg) scale('+f.mx+','+f.my+');';
 }
 // Matrix shape follows the canvas/CSS convention [a,b,c,d,tx,ty].
 function compose([a,b,c,d,x,y],[e,f,g,h,u,v]){
  return [a*e+c*f,b*e+d*f,a*g+c*h,b*g+d*h,a*u+c*v+x,b*u+d*v+y];
 }
 function quad(m,w,h,x=0,y=0){
  return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([u,v])=>
   [m[0]*u+m[2]*v+m[4],m[1]*u+m[3]*v+m[5]]);
 }
 const cross=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
 function clip(poly,box){
  const sign=Math.sign(cross(box[0],box[1],box[2]))||1;
  for(let i=0;i<box.length&&poly.length;i++){
   const a=box[i],b=box[(i+1)%box.length],old=poly;poly=[];
   let p=old.at(-1),dp=sign*cross(a,b,p);
   for(const q of old){
    const dq=sign*cross(a,b,q),inP=dp>=-1e-8,inQ=dq>=-1e-8;
    if(inP!==inQ){
     const t=dp/(dp-dq);
     if(Number.isFinite(t))poly.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);
    }
    if(inQ)poly.push(q);
    p=q;dp=dq;
   }
  }
  return poly;
 }
 V.graphicsCore=V.graphicsCore||{};
 V.graphicsCore.affine=Object.freeze({identity,finite,clamp,frame,offset,point,matrix,css,compose,quad,clip});
})(window.V13);
