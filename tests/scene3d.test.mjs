import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {makeAxis,sceneLayout,groundTicks,lens,nearestCard} from '../src/scene3d.mjs';

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
