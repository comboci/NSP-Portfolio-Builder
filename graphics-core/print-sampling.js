/* NSP Graphics Core: physical output sampling. Embedded verbatim in index.html. */
(function registerPrintSampling(V){
 'use strict';
 const {clamp}=V.graphicsCore.affine;
 const cssPxPerInch=96,mmPerInch=25.4;
 function paperScale(size,width,height){
  return Math.min(size.widthMm*cssPxPerInch/mmPerInch/width,size.heightMm*cssPxPerInch/mmPerInch/height);
 }
 function imageDpi(asset,edit,width,height,doc,size,fit,m){
  if(!asset||![asset.width,asset.height,width,height,doc.width,doc.height,size.widthMm,size.heightMm].every(v=>Number.isFinite(Number(v))&&Number(v)>0))return null;
  let s={};if(typeof edit==='string'&&edit.trim()){try{s=JSON.parse(edit)||{};}catch{return null;}}
  const x=clamp(s.cropX,0,99,0),y=clamp(s.cropY,0,99,0);
  const cw=Number(asset.width)*clamp(s.cropW,1,100-x,100-x)/100;
  const ch=Number(asset.height)*clamp(s.cropH,1,100-y,100-y)/100;
  const cx=width/cw,cy=height/ch,zoom=clamp(s.zoom,1,8,1);
  const scale=fit==='none'?1:fit==='cover'?Math.max(cx,cy):Math.min(cx,cy);
  const sx=zoom*(fit==='fill'?cx:scale),sy=zoom*(fit==='fill'?cy:scale);
  // Exactly the renderer's uniform scale, including letterboxed coordinate spaces.
  const inches=paperScale(size,doc.width,doc.height)/cssPxPerInch;
  const a=m[0]*sx*inches,b=m[1]*sx*inches,c=m[2]*sy*inches,d=m[3]*sy*inches;
  const xx=a*a+b*b,yy=c*c+d*d,xy=a*c+b*d;
  const inchesPerPixel=Math.sqrt((xx+yy+Math.hypot(xx-yy,2*xy))/2);
  return inchesPerPixel>0&&Number.isFinite(inchesPerPixel)?Math.floor(1/inchesPerPixel):null;
 }
 V.graphicsCore.printSampling=Object.freeze({paperScale,imageDpi});
 Object.freeze(V.graphicsCore);
})(window.V13);
