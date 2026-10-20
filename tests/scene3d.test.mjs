import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeAxis,sceneLayout,groundTicks,lens,nearestCard,rulerMarks,densityProfiles,fitLabels} from '../src/scene3d.mjs';

const catalog=JSON.parse(await readFile(new URL('../src/catalog.json',import.meta.url),'utf8'));

test('axis is monotonic and starts at the earliest period with works',()=>{
 const axis=makeAxis(catalog);
 assert.equal(axis.x(axis.ticks[0]),0);
 for(let i=1;i<axis.ticks.length;i++)assert.ok(axis.x(axis.ticks[i])>axis.x(axis.ticks[i-1]));
 assert.equal(axis.x(axis.ticks.at(-1)),axis.length);
});

test('every dated work stands once, inside its period band, in story order',()=>{
 const {rails}=sceneLayout(catalog);
 for(const rail of rails){
  for(const card of rail.cards){const band=rail.bands.find(b=>b.id===card.group.id);assert.ok(card.x>band.x0&&card.x<band.x1,card.key);}
  for(const band of rail.bands){const xs=rail.cards.filter(c=>c.group.id===band.id).map(c=>c.x);assert.deepEqual(xs,[...xs].sort((a,b)=>a-b));}
 }
 const keys=rails.flatMap(r=>r.cards.map(c=>c.key));
 assert.equal(new Set(keys).size,keys.length);
});

test('crowded periods reserve room for their cards',()=>{
 const {rails}=sceneLayout(catalog,{spacing:34});
 for(const rail of rails)for(const band of rail.bands)if(band.count)assert.ok(band.x1-band.x0>=band.count*34-1,band.name);
});

test('ground ticks never crowd and keep the final year',()=>{
 const axis=makeAxis(catalog),ticks=groundTicks(axis,56);
 for(let i=1;i<ticks.length;i++)assert.ok(ticks[i].x-ticks[i-1].x>=56);
 assert.equal(ticks.at(-1).year,axis.ticks.at(-1));
});

test('ruler marks stay apart, inside their segments, and mark decades only on fine steps',()=>{
 const axis=makeAxis(catalog),marks=rulerMarks(axis,{minSpacing:6,squeeze:.4});
 assert.ok(marks.length>20);
 for(let i=1;i<marks.length;i++)assert.ok(marks[i].x>marks[i-1].x);
 for(const m of marks)assert.ok(!axis.ticks.includes(m.year),'boundaries belong to the major ticks: '+m.year);
 for(let i=0;i<axis.ticks.length-1;i++){
  const inside=marks.filter(m=>m.year>axis.ticks[i]&&m.year<axis.ticks[i+1]);
  for(let j=1;j<inside.length;j++)assert.ok((inside[j].x-inside[j-1].x)*.4>=6-1e-9);
 }
 assert.ok(marks.some(m=>m.level==='decade'));
});

test('density profiles are normalised and peak where works cluster',()=>{
 const layout=sceneLayout(catalog),profiles=densityProfiles(layout);
 assert.equal(profiles.length,layout.rails.length);
 const all=profiles.flatMap(p=>p.values);
 assert.equal(Math.max(...all),1);assert.ok(Math.min(...all)>=0);
 for(const p of profiles)assert.equal(p.values.length,Math.ceil(layout.axis.length/p.step)+1);
});

test('period labels never collide and busier periods win',()=>{
 const bands=[{id:'a',name:'平安',x0:0,x1:30,count:1},{id:'b',name:'鎌倉・南北朝',x0:30,x1:60,count:5},{id:'c',name:'戰國',x0:200,x1:260,count:0}];
 assert.deepEqual([...fitLabels(bands,10)].sort(),['b','c']);
 assert.deepEqual([...fitLabels(bands,1)].sort(),['a','b','c']);
 const {rails}=sceneLayout(catalog);
 for(const rail of rails){
  const shown=rail.bands.filter(b=>fitLabels(rail.bands,40).has(b.id)).sort((a,b)=>a.x0-b.x0);
  for(let i=1;i<shown.length;i++)assert.ok(shown[i].x0>=shown[i-1].x0+([...shown[i-1].name].length+1.4)*40,shown[i].name);
 }
});

test('lens keeps order, lifts the nearest cards most, and is identity without spread',()=>{
 assert.deepEqual(lens(120,0),{x:120,rise:0});
 const xs=[-400,-100,-10,0,10,100,400].map(x=>lens(x,0,{spread:200,width:140}));
 for(let i=1;i<xs.length;i++)assert.ok(xs[i].x>xs[i-1].x);
 assert.equal(xs[3].rise,1);assert.ok(xs[0].rise<.01);
 const dense=[0,30,60,600,630].map(x=>lens(x,0,{spread:340,width:110,far:.4}).x);
 assert.ok(dense[1]-dense[0]>2.5*(dense[4]-dense[3]),'centre spacing should clearly exceed edge spacing');
 assert.ok(dense[4]-dense[3]<30,'edges are compressed');
 assert.equal(nearestCard([{x:0},{x:90},{x:200}],120).x,90);
});
