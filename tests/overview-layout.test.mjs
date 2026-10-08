import test from 'node:test';
import assert from 'node:assert/strict';
import {makeOverviewLayout} from '../src/overview-layout.mjs';
test('long labels reserve room without breaking shared chronological coordinates',()=>{
 const ticks=[1392,1400,1467,1487,1600];
 const lanes=[[{start:1392,name:'long'},{start:1400,name:'short'},{start:1487,name:'last'}],[{start:1400,name:'long'},{start:1467,name:'long'}]];
 const width=g=>g.name==='long'?180:80;
 const layout=makeOverviewLayout(ticks,lanes,800,width);
 for(const groups of lanes)for(let i=0;i<groups.length-1;i++)assert.ok(layout.x(groups[i+1].start)-layout.x(groups[i].start)>=width(groups[i])+32);
 assert.equal(layout.x(1400),layout.x(lanes[1][0].start));
 assert.ok(layout.x(1401)>layout.x(1400));
 assert.ok(layout.width>800);
});
