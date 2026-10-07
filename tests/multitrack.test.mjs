import test from 'node:test';
import assert from 'node:assert/strict';
import {dateSpan,makeScale,periodGroups,arrangeGroups,workCollections,wheelIntent,collectionGeometry} from '../src/multitrack.mjs';
const work=(id,date={type:'year',start:1880},regions=['日本'])=>({id,name:id,regions,periodIds:['jp','eu'],date});
const catalog={regions:['日本','欧洲','中国'],periods:[{id:'jp',region:'日本',name:'明治',start:1801,end:1900},{id:'eu',region:'欧洲',name:'19世纪',start:1801,end:1912}],works:[work('a',undefined,['日本','欧洲']),work('b',{type:'period'}),work('c',{type:'unknown'})]};
test('all regions use the same year mapping regardless of cover density',()=>{const scale=makeScale(catalog);assert.equal(scale.yearAt(scale.x(1881)),1881);const jp=arrangeGroups(periodGroups(catalog,'日本'),scale),eu=arrangeGroups(periodGroups(catalog,'欧洲'),scale);assert.equal(jp[0].left,eu[0].left);const busy={...catalog,works:Array.from({length:30},(_,i)=>work(String(i)))};const groups=workCollections(arrangeGroups(periodGroups(busy,'日本'),makeScale(busy)));assert.equal(groups.length,1);assert.equal(groups[0].works.length,30);});
test('period collections retain original dates and cross-region work identity',()=>{const jp=periodGroups(catalog,'日本'),eu=periodGroups(catalog,'欧洲');assert.equal(jp[0].works[0].work.id,'b');assert.equal(jp[0].works[2].work.id,eu[0].works[0].work.id);assert.equal(jp.length,1);assert.equal(jp[0].works[1].work.id,'c');assert.equal(jp[0].works[1].work.date.type,'unknown');const missing={...catalog,works:[{...work('d',{type:'unknown'}),periodIds:[]}]};assert.equal(periodGroups(missing,'日本').at(-1).undated,true);assert.equal(periodGroups(catalog,'中国').length,0);});
test('date intervals include BCE centuries and preserve period-only uncertainty',()=>{assert.deepEqual(dateSpan({type:'century',start:19}),[1801,1900]);assert.deepEqual(dateSpan({type:'century',start:-2}),[-200,-101]);assert.deepEqual(dateSpan({type:'decade',start:1920}),[1920,1929]);assert.equal(dateSpan({type:'period'}),null);assert.deepEqual(dateSpan({type:'range',start:1914,end:1918}),[1914,1918]);});
test('overlapping historical periods share a readable collection without losing works',()=>{const groups=[{id:'a',left:100,width:300,works:[{work:{id:'1'}}]},{id:'b',left:200,width:300,works:[{work:{id:'2'}}]},{id:'c',left:600,width:200,works:[{work:{id:'3'}}]}];const result=workCollections(groups);assert.equal(result.length,2);assert.equal(result[0].width,400);assert.deepEqual(result[0].works.map(i=>i.work.id),['1','2']);assert.equal(result[0].works[1].group.id,'b');});
test('wheel input chooses one axis and preserves browser zoom',()=>{assert.equal(wheelIntent({deltaX:10,deltaY:100},'content'),'vertical');assert.equal(wheelIntent({deltaX:10,deltaY:100},'ruler'),'horizontal');assert.equal(wheelIntent({deltaX:100,deltaY:10},'content'),'horizontal');assert.equal(wheelIntent({deltaX:0,deltaY:100,shiftKey:true},'content'),'horizontal');assert.equal(wheelIntent({deltaX:0,deltaY:100,ctrlKey:true},'ruler'),'native');});

test('dense collections stay within their period and cap horizontal columns',()=>{const group={left:100,width:900,works:Array.from({length:30},()=>({}))};for(const scrollX of [0,300,900,2000]){const box=collectionGeometry(group,true,scrollX);assert.equal(box.columns,3);assert.ok(box.left>=group.left);assert.ok(box.left+box.width<=group.left+group.width);}});

test('shared timeline omits empty periods before the first published work',()=>{const data={...catalog,periods:[{id:'empty',region:'中国',start:-453,end:-221},...catalog.periods]};const scale=makeScale(data);assert.equal(scale.ticks[0],1801);assert.equal(arrangeGroups(periodGroups(data,'中国'),scale).length,0);});

test('series scale fits its cards and keeps chronological coordinates',async()=>{
 const {makeSeriesScale}=await import('../src/multitrack.mjs');
 const catalog={regions:['日本'],periods:[{id:'edo',region:'日本',start:1603,end:1868},{id:'modern',region:'日本',start:1912,end:1926}],works:[...Array.from({length:4},(_,i)=>({id:String(i),regions:['日本'],periodIds:['edo'],date:{type:'period'}})),{id:'later',regions:['日本'],periodIds:['modern'],date:{type:'period'}}]};
 const scale=makeSeriesScale(catalog,1280);
 assert.equal(scale.width,1280);
 assert.ok(scale.x(1868)-scale.x(1603)>=4*156);
 assert.ok(scale.x(1912)-scale.x(1868)>=80);
 assert.ok(scale.x(1926)>scale.x(1912));
});

test('approved typography reserves close year labels and keeps custom cards inside periods',()=>{
 const data={...catalog,periods:[...catalog.periods,{id:'short',region:'中国',start:1899,end:1900}]};
 const scale=makeScale(data,{minTickGap:132,cardWidth:164,cardGap:12});
 assert.ok(scale.x(1900)-scale.x(1899)>=132);
 assert.equal(scale.yearAt(scale.x(1899)),1899);
 const group={left:100,width:510,works:Array.from({length:20},()=>({}))};
 for(const scrollX of [0,300,900]){const box=collectionGeometry(group,true,scrollX,{cardWidth:164,cardGap:12});assert.ok(box.left>=100);assert.ok(box.left+box.width<=610);}
});
