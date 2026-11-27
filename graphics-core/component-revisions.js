/* NSP Graphics Core: bounded component-definition history and variant metadata. */
(function registerComponentRevisions(V){
 'use strict';
 const core=V.graphicsCore;
 const MAX_REVISIONS=12,MAX_HISTORY_BYTES=1048576,MAX_SNAPSHOT_BYTES=262144,MAX_OBJECTS=200;
 const kinds=new Set(['hotelText','hotelView','hotelGrid']);
 const safeId=v=>typeof v==='string'&&v.length>0&&v.length<=150&&!/[\u0000-\u001f\u007f]/.test(v)&&v===v.trim();
 const utf8=new TextEncoder();
 const size=s=>utf8.encode(s).length;
 const version=v=>Number.isSafeInteger(v)&&v>0;
 function snapshot(d){
  if(!d||!safeId(d.id)||!kinds.has(d.nspBase)||!version(d.nspVersion)||
    !Number.isFinite(d.width)||d.width<1||!Number.isFinite(d.height)||d.height<1||
    !Array.isArray(d.objects)||d.objects.length>MAX_OBJECTS||d.objects.some(o=>!o||typeof o!=='object'||Array.isArray(o)))
   throw Error('Invalid component revision snapshot.');
  // The caller validates each primitive and its references through the existing
  // definition normalizer first. Never persist nested definition history.
  const data={id:d.id,nspBase:d.nspBase,nspVersion:d.nspVersion,width:d.width,height:d.height,objects:d.objects};
  if(typeof d.name==='string')data.name=d.name.slice(0,100);
  const raw=JSON.stringify(data);
  if(size(raw)>MAX_SNAPSHOT_BYTES)throw Error('Component revision snapshot exceeds its size limit.');
  return JSON.parse(raw);
 }
 function variant(group,label){
  if(group==null||group===''){
   if(label!=null&&label!=='')throw Error('A variant label requires a variant group.');
   return {};
  }
  if(!safeId(group))throw Error('Invalid component variant group.');
  if(label!=null&&typeof label!=='string')throw Error('Invalid component variant label.');
  const clean=String(label??'').trim();
  if(clean.length>80||/[\u0000-\u001f\u007f]/.test(clean))throw Error('Invalid component variant label.');
  return clean?{nspVariantGroup:group,nspVariantLabel:clean}:{nspVariantGroup:group};
 }
 function normalizeHistory(history,owner){
  if(history==null)return [];
  if(!owner||!version(owner.nspVersion)||!Array.isArray(history)||history.length>MAX_REVISIONS)
   throw Error('Invalid component revision history.');
  const clean=[];let prior=owner.nspVersion;
  for(const item of history){
   if(!item||item.nspRevisions!==undefined||item.id!==owner.id||item.nspBase!==owner.nspBase||
     !version(item.nspVersion)||item.nspVersion>=prior)
    throw Error('Invalid component revision lineage.');
   clean.push(snapshot(item));prior=item.nspVersion;
  }
  if(size(JSON.stringify(clean))>MAX_HISTORY_BYTES)throw Error('Component revision history exceeds its byte limit.');
  return clean;
 }
 function withRevision(next,previous){
  snapshot(next); // Also validate bounded shape of the new active revision.
  const result={...next};
  delete result.nspRevisions;delete result.nspVariantGroup;delete result.nspVariantLabel;
  const hasVariant=Object.hasOwn(next,'nspVariantGroup')||Object.hasOwn(next,'nspVariantLabel');
  if(hasVariant)Object.assign(result,variant(next.nspVariantGroup,next.nspVariantLabel));
  else if(previous&&previous.id===next.id)Object.assign(result,variant(previous.nspVariantGroup,previous.nspVariantLabel));
  if(!previous)return result;
  if(next.id!==previous.id||next.nspBase!==previous.nspBase||next.nspVersion!==previous.nspVersion+1)
   throw Error('Component revision must advance the same definition by one.');
  const history=[snapshot(previous),...normalizeHistory(previous.nspRevisions,previous)];
  if(history.length>MAX_REVISIONS||size(JSON.stringify(history))>MAX_HISTORY_BYTES)
   throw Error('سقف آرشیو این تعریف تکمیل شده است؛ برای حفظ نسخه‌ها با نام جدید ذخیره کنید.');
  result.nspRevisions=history;
  return result;
 }
 const geometry=new Set(['x','y','w','h','rotation','flipH','flipV','transformPivot','aspectRatioLocked']);
 const transient=new Set(['id','origin','ownerId','layerKey','renderVisible','layerVisible','groupKey']);
 function ordered(value){
  if(Array.isArray(value))return value.map(ordered);
  if(!value||typeof value!=='object')return value;
  return Object.fromEntries(Object.keys(value).sort().map(k=>[k,ordered(value[k])]));
 }
 const same=(a,b)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b));
 function compare(before,after){
  const a=snapshot(before),b=snapshot(after),right=new Map(b.objects.map((o,i)=>[o?.id,i])),used=new Set();
  const roleCounts=list=>list.reduce((m,o)=>{const role=o?.nspField;if(role)m.set(role,(m.get(role)||0)+1);return m;},new Map());
  const ar=roleCounts(a.objects),br=roleCounts(b.objects);
  const available=b.objects.map((o,i)=>({o,i})); const matches=[];
  // IDs win globally. Unique roles are a fallback only after direct pairs
  // have been reserved so they cannot steal another object's exact identity.
  a.objects.forEach((o,i)=>{const j=right.get(o?.id);if(safeId(o?.id)&&j!==undefined&&!used.has(j)){matches[i]=j;used.add(j);}});
  a.objects.forEach((o,i)=>{const r=o?.nspField;if(matches[i]!==undefined||!r||ar.get(r)!==1||br.get(r)!==1)return;
   const found=available.find(p=>!used.has(p.i)&&p.o?.nspField===r);
   if(found){matches[i]=found.i;used.add(found.i);}
  });
  const stamp=o=>({id:o?.id??null,role:o?.nspField??null,type:o?.type??null});
  const added=available.filter(p=>!used.has(p.i)).map(p=>stamp(p.o));
  const removed=[],changed=[];
  a.objects.forEach((o,i)=>{const j=matches[i];if(j===undefined){removed.push(stamp(o));return;}
   const n=b.objects[j],fields=Array.from(new Set([...Object.keys(o),...Object.keys(n)])).sort().filter(k=>!transient.has(k)&&!same(o[k],n[k]));
   if(fields.length||i!==j||o.id!==n.id)changed.push({before:stamp(o),after:stamp(n),geometry:fields.filter(k=>geometry.has(k)),fields:fields.filter(k=>!geometry.has(k)),orderChanged:i!==j});
  });
  return {sameDefinition:a.id===b.id&&a.nspBase===b.nspBase,beforeVersion:a.nspVersion,afterVersion:b.nspVersion,
   frame:['width','height','name'].filter(k=>a[k]!==b[k]),added,removed,changed};
 }
 function siblings(definitions,d){
  if(!Array.isArray(definitions)||!d||!safeId(d.id))return [];
  const family=d.nspVariantGroup||d.id;
  return definitions.filter(o=>o&&safeId(o.id)&&o.id!==d.id&&o.nspBase===d.nspBase&&(o.nspVariantGroup||o.id)===family);
 }
 core.componentRevisions=Object.freeze({MAX_REVISIONS,MAX_HISTORY_BYTES,MAX_SNAPSHOT_BYTES,snapshot,normalizeHistory,withRevision,compare,variant,siblings});
})(window.V13);
