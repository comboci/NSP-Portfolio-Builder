/* Structured Illustrator primitives. This source is embedded in index.html;
   no arbitrary SVG/HTML from a project is inserted into the document. */
(function (root) {
  'use strict';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const finite = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1000000;
  function coordinateSpace(value) {
    if(!value||typeof value!=='object'||Array.isArray(value)||!['width','height'].every(k=>finite(value[k])&&value[k]>=100&&value[k]<=10000))throw Error('ابعاد مبنای طراحی نامعتبر است.');
    return {width:value.width,height:value.height};
  }
  function pageStyle(record,style) {
    const next={...style};
    if(next.coordinateSpace!=null){next.coordinateSpace=coordinateSpace(next.coordinateSpace);return next;}
    // Compatibility for our original ZIP only. Source geometry was never
    // resized in storage: objectList clamped a rendering copy to 842 x 595.
    // Recognize the imported Illustrator objects, not unrelated large designs.
    const objects=record?.visualObjects||record?.objects||[];
    const source=objects.filter(o=>Number.isInteger(o.illustratorSource?.page)&&o.illustratorSource.page>=1&&o.illustratorSource.page<=5&&Number.isInteger(o.illustratorSource.object));
    if(next.paperSize==='A4'&&next.orientation==='landscape'&&source.length>=10&&
       source.some(o=>o.sourceTextLayout)&&source.some(o=>o.x+o.w>842.01||o.y+o.h>595.01))
      next.coordinateSpace={width:1191,height:842};
    return next;
  }
  function canvasSize(style,physical) {
    if(style?.coordinateSpace==null)return physical;
    const space=coordinateSpace(style.coordinateSpace),short=Math.min(space.width,space.height),long=Math.max(space.width,space.height),landscape=style.orientation==='landscape';
    return {...physical,width:landscape?long:short,height:landscape?short:long};
  }
  function path(d) {
    if (typeof d !== 'string' || !d.length || d.length > 200000 || !/^[Mm]/.test(d) || /[^MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]/.test(d)) throw Error('مسیر برداری نامعتبر است.');
    const nums=d.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)||[];
    if(nums.some(n=>!Number.isFinite(Number(n))||Math.abs(Number(n))>1000000))throw Error('مختصات مسیر برداری نامعتبر است.');
    const token=/[MmLlHhVvCcSsQqTtAaZz]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
    if(d.replace(token,'').replace(/[\s,]/g,''))throw Error('دستور مسیر نامعتبر است.');
    const ts=d.match(token),arity={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7,Z:0};
    for(let i=0;i<ts.length;){
      const command=ts[i++];if(!(command.toUpperCase() in arity))throw Error('دستور مسیر نامعتبر است.');
      const n=arity[command.toUpperCase()];let groups=0;
      while(i<ts.length&&!/^[A-Za-z]$/.test(ts[i])){
        if(!n||i+n>ts.length||ts.slice(i,i+n).some(t=>/^[A-Za-z]$/.test(t)))throw Error('تعداد مختصات مسیر نامعتبر است.');
        if(command.toUpperCase()==='A'&&(!['0','1'].includes(ts[i+3])||!['0','1'].includes(ts[i+4])))throw Error('پرچم کمان نامعتبر است.');
        i+=n;groups++;
      }
      if(n&&!groups)throw Error('مختصات مسیر موجود نیست.');
    }
    return d;
  }
  function clips(value) {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > 16) throw Error('ماسک برداری نامعتبر است.');
    value.forEach(c => { if (!c || typeof c !== 'object') throw Error('ماسک برداری نامعتبر است.'); path(c.d); if (!['nonzero','evenodd'].includes(c.rule)) throw Error('قاعدهٔ ماسک نامعتبر است.'); });
    return value;
  }
  function typography(t) {
    if (!t || typeof t !== 'object' || typeof t.text !== 'string' || typeof t.family !== 'string' || !/^NSP-[a-zA-Z0-9-]{1,90}$/.test(t.family) || !finite(t.width) || !finite(t.height) || t.width<=0 || t.height<=0 || !finite(t.fontSize) || t.fontSize<=0 || !Array.isArray(t.matrix) || t.matrix.length!==4 || !t.matrix.every(finite) || !Array.isArray(t.glyphs) || t.glyphs.length>10000) throw Error('متن Illustrator نامعتبر است.');
    if (t.fontData!=null && (typeof t.fontData !== 'string' || t.fontData.length > 1000000 || !/^data:font\/ttf;base64,[A-Za-z0-9+/]+={0,2}$/.test(t.fontData))) throw Error('فونت تعبیه‌شده نامعتبر است.');
    t.glyphs.forEach(g=>{if(!g||typeof g.text!=='string'||g.text.length>8||!finite(g.x)||!finite(g.y))throw Error('جایگاه نویسه نامعتبر است.');if(g.d!=null)path(g.d);if(!t.fontData&&!g.d)throw Error('طرح نویسه موجود نیست.');});
    return t;
  }
  function validate(o) {
    if(o.vectorClipEnabled!=null&&typeof o.vectorClipEnabled!=='boolean')throw Error('وضعیت برش برداری نامعتبر است.');
    if(o.type==='vectorPath') {
      path(o.pathData);
      if(!finite(o.pathWidth)||!finite(o.pathHeight)||o.pathWidth<=0||o.pathHeight<=0)throw Error('ابعاد مسیر نامعتبر است.');
      if(!['nonzero','evenodd'].includes(o.pathRule))throw Error('قاعده مسیر نامعتبر است.');
      for(const k of ['pathFill','pathStroke'])if(typeof o[k]!=='boolean')throw Error('رنگ مسیر نامعتبر است.');
      for(const k of ['pathFillOpacity','pathStrokeOpacity'])if(o[k]!=null&&(!finite(o[k])||o[k]<0||o[k]>1))throw Error('شفافیت مسیر نامعتبر است.');
      if(o.pathDash!=null&&(!Array.isArray(o.pathDash)||o.pathDash.length>64||!o.pathDash.every(n=>finite(n)&&n>=0)))throw Error('خط‌چین نامعتبر است.');
      if(o.pathDashOffset!=null&&!finite(o.pathDashOffset))throw Error('خط‌چین نامعتبر است.');
      if(o.pathCap!=null&&!['butt','round','square'].includes(o.pathCap))throw Error('انتهای مسیر نامعتبر است.');
      if(o.pathJoin!=null&&!['miter','round','bevel'].includes(o.pathJoin))throw Error('اتصال مسیر نامعتبر است.');
    }
    if(o.vectorClips!=null)clips(o.vectorClips);
    if(o.sourceTextLayout!=null)typography(o.sourceTextLayout);
  }
  let serial=0;
  function clipDefs(value,w=1,h=1) {
    const cs=clips(value),prefix='nsp-vector-clip-'+(++serial)+'-';
    return {open:cs.map((c,i)=>'<g clip-path="url(#'+prefix+i+')">').join(''),close:'</g>'.repeat(cs.length),defs:cs.map((c,i)=>'<clipPath id="'+prefix+i+'" clipPathUnits="userSpaceOnUse"><path d="'+esc(c.d)+'" transform="scale('+w+' '+h+')" clip-rule="'+c.rule+'"/></clipPath>').join('')};
  }
  function vectorMarkup(o) {
    validate(o); const c=clipDefs(o.vectorClipEnabled===false?[]:o.vectorClips,o.pathWidth,o.pathHeight);
    const color=(s,other)=>/^#[a-f0-9]{3,8}$/i.test(s||'')?s:other;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+o.pathWidth+' '+o.pathHeight+'" preserveAspectRatio="none" style="display:block;overflow:hidden;pointer-events:none"><defs>'+c.defs+'</defs>'+c.open+'<path d="'+esc(o.pathData)+'" fill="'+(o.pathFill?color(o.background,'#f7931e'):'none')+'" fill-rule="'+o.pathRule+'" fill-opacity="'+(o.pathFillOpacity??1)+'" stroke="'+(o.pathStroke?color(o.strokeColor,'#000000'):'none')+'" stroke-width="'+(Number(o.strokeWidth)||0)+'" stroke-opacity="'+(o.pathStrokeOpacity??1)+'" stroke-linecap="'+(o.pathCap||'butt')+'" stroke-linejoin="'+(o.pathJoin||'miter')+'" stroke-dasharray="'+(o.pathDash||[]).join(' ')+'" stroke-dashoffset="'+(o.pathDashOffset||0)+'"/>'+c.close+'</svg>';
  }
  function textMarkup(o) {
    const t=typography(o.sourceTextLayout);
    // Font data belongs to the object, so copies, backups and reimports retain it.
    const face=t.fontData?'<style>@font-face{font-family:"'+t.family+'";src:url("'+t.fontData+'")} </style>':'<style>@font-face{font-family:"'+t.family+'";src:local("Myriad Pro"),local("Arial")}</style>';
    const original=o.text===t.text && o.fontFamily===t.family && Math.abs(o.fontSize-t.fontSize)<0.0001 && o.direction==='ltr' && o.textAlign==='left' && o.fontWeight==='normal' && o.fontStyle!=='italic';
    if(!original)return {face,content:null};
    const m=t.matrix;
    const glyphs=t.glyphs.map(g=>!g.text.trim()?'':g.d?'<path d="'+esc(g.d)+'" transform="matrix('+m.join(' ')+' '+g.x+' '+g.y+')"/>':'<text xml:space="preserve" x="0" y="0" transform="matrix('+m.join(' ')+' '+g.x+' '+g.y+')">'+esc(g.text)+'</text>').join('');
    return {face,content:'<div class="v13-object-text" style="position:absolute;inset:0;width:100%;height:100%"><svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 '+t.width+' '+t.height+'" preserveAspectRatio="none" style="display:block;overflow:visible;font-family:'+t.family+';font-size:1px;font-weight:400;font-style:normal;fill:currentColor;direction:ltr">'+glyphs+'</svg></div>'};
  }
  root.NSPIllustrator={path,clips,typography,validate,clipDefs,vectorMarkup,textMarkup,coordinateSpace,pageStyle,canvasSize};
})(typeof window!=='undefined'?window:globalThis);
