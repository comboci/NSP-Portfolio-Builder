/* NSP Graphics Core: bounded declarative inline text formatting, UTF-16 indices. */
(function registerRichText(V){
 'use strict';
 const MAX_RUNS=2000,MAX_TEXT=300000,MAX_PARTS=8192;
 const keys=['bold','italic','color','dir'];
 const arabic=/\p{Script_Extensions=Arabic}/u,mark=/\p{Mark}/u,latin=/\p{Script=Latin}/u;
 const joiner=c=>c==='\u200c'||c==='\u200d';
 const modifier=c=>!!c&&(mark.test(c)||joiner(c)||/[\u{1f3fb}-\u{1f3ff}]/u.test(c));
 const before=(s,i)=>{const last=s.charCodeAt(i-1),n=last>=0xdc00&&last<=0xdfff?2:1;return i>0?s.slice(Math.max(0,i-n),i):'';};
 const after=(s,i)=>i<s.length?String.fromCodePoint(s.codePointAt(i)):'';
 const ar=c=>!!c&&(arabic.test(c)||joiner(c));
 function textCheck(text){if(typeof text!=='string'||text.length>MAX_TEXT)throw Error('Invalid rich text length.');}
 function safe(text,i){
  if(i<=0||i>=text.length)return true;
  const l=text.charCodeAt(i-1),r=text.charCodeAt(i);
  if(l>=0xd800&&l<=0xdbff&&r>=0xdc00&&r<=0xdfff)return false;
  const a=before(text,i),b=after(text,i);
  return !modifier(b)&&!joiner(a)&&!(ar(a)&&ar(b));
 }
 function boundary(text,i,step){while(!safe(text,i))i+=step;return i;}
 function style(input,patch=false){
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Invalid inline style.');
  for(const k of Object.keys(input))if(!keys.includes(k))throw Error('Unsupported inline style.');
  const out={};
  for(const k of keys){
   if(!Object.hasOwn(input,k))continue;
   const v=input[k];
   if(patch&&v===null){out[k]=null;continue;}
   if((k==='bold'||k==='italic')&&typeof v==='boolean')out[k]=v;
   else if(k==='color'&&typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v))out[k]=v.toLowerCase();
   else if(k==='dir'&&(v==='ltr'||v==='rtl'))out[k]=v;
   else throw Error('Invalid inline style value.');
  }
  return out;
 }
 const same=(a,b)=>keys.every(k=>a[k]===b[k]);
 function append(out,start,end,st){
  if(start>=end||!Object.keys(st).length)return;
  const last=out.at(-1);
  if(last&&last.end===start&&same(last.style,st))last.end=end;
  else out.push({start,end,style:st});
 }
 function normalizeRuns(text,runs=[]){
  textCheck(text);
  if(!Array.isArray(runs)||runs.length>MAX_RUNS)throw Error('Too many inline runs.');
  const out=[];let end=0;
  for(const r of runs){
   if(!r||Object.keys(r).some(k=>!['start','end','style'].includes(k))||
     !Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<end||r.end<=r.start||r.end>text.length||
     !safe(text,r.start)||!safe(text,r.end))throw Error('Invalid or overlapping inline run.');
   append(out,r.start,r.end,style(r.style));end=r.end;
  }
  return out;
 }
 function applyFormat(text,runs,start,end,patch){
  const list=normalizeRuns(text,runs),change=style(patch,true);
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end>text.length||end<start)throw Error('Invalid inline selection.');
  if(start===end)return list;
  start=boundary(text,start,-1);end=boundary(text,end,1);
  const stops=[...new Set([0,text.length,start,end,...list.flatMap(r=>[r.start,r.end])])].sort((a,b)=>a-b);
  const out=[];let ri=0;
  for(let i=0;i<stops.length-1;i++){
   const a=stops[i],b=stops[i+1];while(list[ri]?.end<=a)ri++;
   const next={...(list[ri]?.start<=a?list[ri].style:{})};
   if(a>=start&&b<=end)for(const [k,v] of Object.entries(change))if(v===null)delete next[k];else next[k]=v;
   append(out,a,b,style(next));
  }
  return normalizeRuns(text,out);
 }
 function rebase(oldText,newText,runs){
  const list=normalizeRuns(oldText,runs);textCheck(newText);
  if(oldText===newText)return list;
  let pre=0,tail=0;
  while(pre<oldText.length&&pre<newText.length&&oldText[pre]===newText[pre])pre++;
  while(tail<oldText.length-pre&&tail<newText.length-pre&&
    oldText[oldText.length-tail-1]===newText[newText.length-tail-1])tail++;
  const oldEnd=oldText.length-tail,newEnd=newText.length-tail,delta=newText.length-oldText.length;
  const out=[];
  function keep(a,b,st){
   a=boundary(newText,a,1);b=boundary(newText,b,-1);
   append(out,a,b,st);
  }
  for(const r of list){
   if(r.start<pre)keep(r.start,Math.min(r.end,pre),r.style);
   // Typed/replaced text inherits only when surrounded by ONE original style,
   // so a replacement crossing distinct styles cannot guess which to apply.
   if(r.start<pre&&r.end>oldEnd&&newEnd>pre)keep(pre,newEnd,r.style);
   if(r.end>oldEnd)keep(Math.max(r.start,oldEnd)+delta,r.end+delta,r.style);
  }
  // When an edit joins one Arabic/combining sequence, retain a uniform style
  // across it only if a single original run covered both sides.
  const encompassing=list.find(r=>r.start<pre&&r.end>oldEnd);
  if(encompassing&&(!safe(newText,pre)||!safe(newText,newEnd))){
   const left=boundary(newText,pre,-1),right=boundary(newText,newEnd,1);
   if(left>=encompassing.start&&right<=encompassing.end+delta)
    return applyFormat(newText,out,left,right,encompassing.style);
  }
  return normalizeRuns(newText,out);
 }
 function sliceRuns(runs,start,end){
  if(!Array.isArray(runs)||runs.length>MAX_RUNS||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start)
   throw Error('Invalid inline slice.');
  const out=[];
  for(const r of runs)if(r.end>start&&r.start<end)append(out,Math.max(start,r.start)-start,Math.min(end,r.end)-start,style(r.style));
  return out;
 }
 function parts(text,runs=[],latinTracking=0){
  const list=normalizeRuns(text,runs),out=[],tracking=typeof latinTracking==='number'&&Number.isFinite(latinTracking)?Math.max(-2,Math.min(12,latinTracking)):0;
  let from=0;
  function part(start,end,st){
   if(end<=start)return;
   if(!tracking){out.push({text:text.slice(start,end),style:st,tracking:0});return;}
   let a=start,prev=null;
   for(let i=start;i<end;){
    const c=after(text,i),latinLetter=latin.test(c)&&!arabic.test(c);
    const track=latinLetter||mark.test(c)&&!arabic.test(c)&&prev===true;
    if(prev!==null&&prev!==track){
     if(out.length>=MAX_PARTS)return false;
     out.push({text:text.slice(a,i),style:st,tracking:prev?tracking:0});a=i;
    }
    prev=track;i+=c.length;
   }
   out.push({text:text.slice(a,end),style:st,tracking:prev?tracking:0});
  }
  for(const r of list){
   if(part(from,r.start,{})===false||part(r.start,r.end,r.style)===false)return parts(text,list,0);
   from=r.end;
  }
  if(part(from,text.length,{})===false)return parts(text,list,0);
  return out;
 }
 V.graphicsCore.richText=Object.freeze({normalizeRuns,applyFormat,rebase,sliceRuns,parts,isSafeBoundary:safe,MAX_RUNS,MAX_TEXT});
})(window.V13);
