/* NSP Graphics Core: declarative, non-destructive image treatment metadata. */
(function registerImageTreatment(V){
 'use strict';
 const MAX_STOPS=8, COLOR=/^#[\da-f]{6}$/i;
 const ownsOnly=(value,keys)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&
  Object.keys(value).every(key=>keys.includes(key));
 const between=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
 // Public descriptor uses CSS angle conventions: 0° up, 90° right. No
 // gradient object means optics remain unchanged, including old projects.
 function normalizeGradient(value){
  if(value==null)return null;
  if(!ownsOnly(value,['angle','stops'])||!between(value.angle,-360,360)||
    !Array.isArray(value.stops)||value.stops.length<2||value.stops.length>MAX_STOPS)
   throw Error('Invalid image gradient.');
  let previous=-1;
  const stops=value.stops.map(s=>{
   if(!ownsOnly(s,['color','opacity','position'])||!between(s.position,0,100)||
     s.position<previous||!between(s.opacity,0,1)||typeof s.color!=='string'||!COLOR.test(s.color))
    throw Error('Invalid image gradient stop.');
   previous=s.position;
   return {position:s.position===0?0:s.position,color:s.color.toLowerCase(),opacity:s.opacity===0?0:s.opacity};
  });
  const angle=((value.angle%360)+360)%360;
  return {angle,stops};
 }
 function describeGradient(value){
  const g=normalizeGradient(value);
  return g?{angle:g.angle,stops:g.stops.map(({position,color,opacity})=>({
   position,color,opacity,r:parseInt(color.slice(1,3),16),g:parseInt(color.slice(3,5),16),b:parseInt(color.slice(5,7),16)
  }))}:null;
 }
 function gradientLine(value,width,height){
  const g=normalizeGradient(value);
  if(!g)return null;
  if(!between(width,.01,100000)||!between(height,.01,100000))throw Error('Invalid gradient frame.');
  const radians=g.angle*Math.PI/180,dx=Math.sin(radians),dy=-Math.cos(radians);
  // User-space endpoints use the real frame aspect ratio; a square
  // normalized coordinate box would change the angle on wide images.
  const half=(Math.abs(dx)*width+Math.abs(dy)*height)/2;
  const x=width/2,y=height/2;
  return {x1:x-dx*half,y1:y-dy*half,x2:x+dx*half,y2:y+dy*half,
   stops:g.stops.map(({position,color,opacity})=>({offset:position/100,color,opacity}))};
 }
 function defaultGradient(){
  return {angle:180,stops:[{position:0,color:'#000000',opacity:0},{position:100,color:'#000000',opacity:.5}]};
 }
 // Known-original geometry feeds both the SVG renderer and physical sampling.
 const cap=(v,min,max,fallback)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):fallback));
 function sample(asset,e,width,height,fit){
  if(!asset||![asset.width,asset.height,width,height].every(v=>Number.isFinite(Number(v))&&Number(v)>0))return null;
  e=e&&typeof e==='object'?e:{};
  const cropX=cap(e.cropX,0,99,0),cropY=cap(e.cropY,0,99,0);
  const cw=Number(asset.width)*cap(e.cropW,1,100-cropX,100-cropX)/100,
   ch=Number(asset.height)*cap(e.cropH,1,100-cropY,100-cropY)/100;
  const x=cap(e.x,0,100,50),y=cap(e.y,0,100,50),zoom=cap(e.zoom,1,8,1);
  const cx=width/cw,cy=height/ch,fitScale=fit==='none'?1:fit==='cover'?Math.max(cx,cy):Math.min(cx,cy);
  const sx=fit==='fill'?cx:fitScale,sy=fit==='fill'?cy:fitScale;
  return {cropX,cropY,cw,ch,x,y,zoom,sx,sy,dx:(width-cw*sx)*x/100,dy:(height-ch*sy)*y/100};
 }
 V.graphicsCore.imageTreatment=Object.freeze({MAX_STOPS,normalizeGradient,describeGradient,gradientLine,defaultGradient,sample});
})(window.V13);
