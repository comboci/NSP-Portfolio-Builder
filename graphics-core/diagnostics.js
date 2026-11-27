/* NSP Graphics Core: read-only typed diagnostic reports for editor/preflight. */
(function registerDiagnostics(V){
 'use strict';
 const MAX_ISSUES=5000;
 const categories=Object.freeze(['geometry','text','images','components','structure']);
 const severities=Object.freeze(['error','warning','info']);
 const cleanId=(value,max)=>typeof value==='string'&&value.length<=max&&!/[\u0000-\u001f\u007f]/.test(value)?value:'';
 function classify(type){
  const root=String(type||'').split(':',1)[0];
  if(/^(pageBounds|sourceBounds|safeMargin|bleed|outside|geometry|invalidSize|regionBounds)/i.test(root))return 'geometry';
  if(/^(text|font|paragraph|glyph|lineBreak)/i.test(root))return 'text';
  if(/^(missingImage|brokenImage|image|unknownImageDpi|invalidTile|missingTileImage|gradient)/i.test(root))return 'images';
  if(/^(nsp|component|unresolvedHotelSystem|hotel|missingDefinition|dataBinding)/i.test(root))return 'components';
  return 'structure';
 }
 function normalizeIssue(issue){
  if(!issue||typeof issue!=='object'||Array.isArray(issue)||!Object.hasOwn(issue,'type')||
    !Object.hasOwn(issue,'message')||!Object.hasOwn(issue,'severity'))return null;
  const get=k=>Object.hasOwn(issue,k)?issue[k]:undefined;
  const severity=get('severity'),type=cleanId(get('type'),240),message=get('message');
  if(!severities.includes(severity)||!type||typeof message!=='string'||!message.trim()||message.length>8000)return null;
  const provided=get('pageNumber'),index=get('index');
  const pageNumber=Number.isSafeInteger(provided)&&provided>0?provided:
   Number.isSafeInteger(index)&&index>=0&&index<Number.MAX_SAFE_INTEGER?index+1:null;
  return {severity,type,pageId:cleanId(get('pageId'),200),objectId:cleanId(get('objectId'),200),
   objectToken:cleanId(get('objectToken'),1200),pageNumber,category:classify(type),message};
 }
 const key=i=>JSON.stringify([i.severity,i.type,i.pageId,i.objectToken||i.objectId,i.pageNumber]);
 function report(input){
  const list=Array.isArray(input)?input:[],issues=[],ids=new Set();
  let invalid=0,duplicates=0;
  for(const item of list.slice(0,MAX_ISSUES)){
   const n=normalizeIssue(item);
   if(!n){invalid++;continue;}
   const id=key(n);if(ids.has(id)){duplicates++;continue;}
   ids.add(id);issues.push(n);
  }
  return {issues,totalInput:list.length,invalid,duplicates,truncated:Math.max(0,list.length-MAX_ISSUES)};
 }
 function filter(issues,query={}){
  const scope=query&&typeof query==='object'?query:{},search=typeof scope.search==='string'?scope.search.trim().slice(0,200).toLocaleLowerCase():'';
  return (Array.isArray(issues)?issues:[]).slice(0,MAX_ISSUES).filter(i=>i&&
   (!scope.severity||scope.severity===i.severity)&&(!scope.category||scope.category===i.category)&&
   (!scope.pageId||scope.pageId===i.pageId)&&(!scope.objectToken||scope.objectToken===i.objectToken)&&
   (!search||[i.message,i.type,i.objectId].some(s=>typeof s==='string'&&s.toLocaleLowerCase().includes(search))));
 }
 function summarize(issues){
  const totals={total:0,error:0,warning:0,info:0,geometry:0,text:0,images:0,components:0,structure:0};
  for(const i of (Array.isArray(issues)?issues:[]).slice(0,MAX_ISSUES)){
   if(!i||!severities.includes(i.severity)||!categories.includes(i.category))continue;
   totals.total++;totals[i.severity]++;totals[i.category]++;
  }
  return totals;
 }
 V.graphicsCore.diagnostics=Object.freeze({MAX_ISSUES,categories,severities,classify,normalizeIssue,key,report,filter,summarize});
})(window.V13);
