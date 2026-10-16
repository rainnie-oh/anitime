import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {periodGroups} from '../src/multitrack.mjs';
import {filterSeries} from '../src/series.mjs';
import {formatDate} from '../src/date.mjs';
import {verticalMetrics,makeVerticalScale,railBands,railLabels,makeVerticalOverview,itemHeight,V} from '../src/vertical.mjs';

const catalog=JSON.parse(await readFile(new URL('../src/catalog.json',import.meta.url),'utf8'));
const metrics=verticalMetrics(390);

test('vertical scale is monotonic and round-trips years',()=>{
 for(const region of catalog.regions){
  const scale=makeVerticalScale(catalog,region,metrics);
  for(let i=1;i<scale.pos.length;i++)assert.ok(scale.pos[i]>scale.pos[i-1]);
  for(const tick of scale.ticks)assert.equal(scale.yearAt(scale.y(tick)),tick);
 }
});

test('regions share year boundaries; switching region keeps the same tick order',()=>{
 const jp=makeVerticalScale(catalog,'日本',metrics),cn=makeVerticalScale(catalog,'中國',metrics);
 assert.deepEqual(jp.ticks,cn.ticks);
 assert.equal(jp.ticks[0],cn.ticks[0]);
});

test('focused blocks never overlap and start at their period year',()=>{
 for(const width of [320,360,390,430])for(const region of catalog.regions){
  const scale=makeVerticalScale(catalog,region,verticalMetrics(width));
  const dated=scale.blocks.filter(b=>!b.group.undated);
  for(let i=1;i<dated.length;i++)assert.ok(dated[i].top>=dated[i-1].top+dated[i-1].height,`${region} ${dated[i].group.name} overlaps at ${width}`);
  // Content reserves time, so a period without an overlapping predecessor begins exactly at its year.
  for(let i=1;i<dated.length;i++)if(dated[i].group.start>=dated[i-1].group.end)assert.ok(Math.abs(dated[i].top-scale.y(dated[i].group.start))<1,`${dated[i].group.name} drifted`);
  assert.ok(scale.height>=Math.max(...scale.blocks.map(b=>b.top+b.height)));
 }
});

test('series focus compresses unused years and keeps every series work',()=>{
 const full=makeVerticalScale(catalog,'日本',metrics);
 const visible=filterSeries(catalog,'jojo');
 const series=makeVerticalScale(visible,'日本',metrics,{series:true});
 assert.ok(series.height<full.height/2);
 assert.equal(series.blocks.reduce((n,b)=>n+b.items.length,0),visible.works.filter(w=>w.regions.includes('日本')).length);
 assert.ok(series.blocks.every(b=>b.group.works.length));
});

test('cards keep the series link outside series focus only',()=>{
 const work={id:'x',width:2,height:3,seriesId:'s',seriesName:'S'};
 assert.equal(itemHeight({work},150,false)-itemHeight({work},150,true),V.seriesLink);
});

test('undated works sit after the last year and never receive a year label',()=>{
 const data={regions:['日本'],periods:[{id:'p',region:'日本',name:'明治',start:1868,end:1912}],works:[{id:'a',regions:['日本'],periodIds:['p'],date:{type:'year',start:1880}},{id:'b',regions:['日本'],periodIds:[],date:{type:'unknown'}}]};
 const scale=makeVerticalScale(data,'日本',metrics);
 const undated=scale.blocks.find(b=>b.group.undated);
 assert.ok(undated.top>scale.pos.at(-1));
 assert.equal(formatDate(undated.items[0].work.date,[]),'UNKNOWN');
});

test('rail labels stay inside their band while it is in view and never overlap',()=>{
 const scale=makeVerticalScale(catalog,'日本',metrics);
 const bands=railBands(periodGroups(catalog,'歐美'),scale);
 assert.ok(bands.every(b=>b.bottom-b.top>=44));
 for(const viewTop of [0,1000,3000,5000]){
  const tops=railLabels(bands,viewTop);
  for(let i=1;i<tops.length;i++)assert.ok(tops[i]>=tops[i-1]+bands[i-1].group.name.length*12+30);
  tops.forEach((top,i)=>assert.ok(top>=bands[i].top));
 }
});

test('overview keeps shared coordinates and whole labels per region column',()=>{
 const lanes=catalog.regions.map(r=>periodGroups(catalog,r));
 const layout=makeVerticalOverview(lanes,()=>44);
 for(const groups of lanes){
  const tops=groups.filter(g=>!g.undated).map(g=>layout.y(g.start));
  for(let i=1;i<tops.length;i++)assert.ok(tops[i]>=tops[i-1]+44);
 }
 const shared=lanes.flat().filter(g=>!g.undated);
 for(const a of shared)for(const b of shared)if(a.start===b.start)assert.equal(layout.y(a.start),layout.y(b.start));
});
