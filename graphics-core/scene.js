/* NSP Graphics Core: ordered page-local scene. Embedded verbatim in index.html. */
(function registerScene(V){
 'use strict';
  const dictionary=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:null;
  function key(object){const o=object||{};return JSON.stringify([String(o.origin||''),String(o.ownerId||''),String(o.id||'')]);}
  const layerKey=key;
  function ownLayers(record,origin){
    const list=(Array.isArray(record?.layers)?record.layers:[]).filter(layer=>dictionary(layer)&&typeof layer.id==='string').map(layer=>Object.assign({},layer));
    if(!list.some(layer=>layer.id==='default'))list.unshift({id:'default',name:'لایهٔ پیش‌فرض',visible:true});
    return list.map(layer=>{const result={id:layer.id,name:typeof layer.name==='string'?layer.name:'لایه',visible:layer.visible!==false,origin,ownerId:record.id};result.key=layerKey(result);return result;});
  }
  function arrange(items,order,identity){
    if(!Array.isArray(order)||!order.length)return items.slice();
    const rank=new Map();order.forEach((token,index)=>{if(typeof token==='string'&&!rank.has(token))rank.set(token,index);});
    return items.map((item,index)=>({item,index,rank:rank.has(identity(item))?rank.get(identity(item)):-1}))
      .sort((a,b)=>a.rank-b.rank||a.index-b.index).map(entry=>entry.item);
  }
  function finishScene(document,layers,objects){
    const result=Object.assign({},document),list=layers.map(layer=>Object.assign({},layer,{key:layerKey(layer)})),byKey=new Map(list.map(layer=>[layer.key,layer]));
    result.objects=objects.map(object=>{
      const wanted={origin:object.layerOrigin||object.origin,ownerId:object.layerOwnerId||object.ownerId,id:object.layerId||'default'};
      let layer=byKey.get(layerKey(wanted));
      if(!layer){
        const fallback={origin:object.origin,ownerId:object.ownerId,id:'default'};layer=byKey.get(layerKey(fallback));
        if(!layer){layer=Object.assign(fallback,{name:'لایهٔ پیش‌فرض',visible:true});layer.key=layerKey(layer);list.push(layer);byKey.set(layer.key,layer);}
      }
      const groupKey=object.groupId?JSON.stringify([object.groupOrigin||object.origin,object.groupOwnerId||object.ownerId,String(object.groupId)]):'';
      return Object.assign({},object,{layerId:layer.id,layerOrigin:layer.origin,layerOwnerId:layer.ownerId,layerKey:layer.key,layerVisible:layer.visible!==false,renderVisible:object.visible!==false&&layer.visible!==false,groupKey});
    });
    const rank=new Map(list.map((layer,index)=>[layer.key,index]));
    result.objects.sort((a,b)=>rank.get(a.layerKey)-rank.get(b.layerKey));result.layers=list;return result;
  }
  function shouldPaint(o,opts={}){
    const opacity=Number(o.opacity??1);
    return o.visible!==false&&o.renderVisible!==false&&o.layerVisible!==false&&(!Number.isFinite(opacity)||opacity>0)&&
      (o.type!=='pageNumber'||opts.showEditablePageNumber===true||Number(opts.pageIndex||1)>1||o.showOnFirstPage===true)&&
      (o.type!=='block'||opts.editor===true);
  }
  V.graphicsCore.scene=Object.freeze({dictionary,key,layerKey,ownLayers,arrange,finishScene,shouldPaint});
})(window.V13);
