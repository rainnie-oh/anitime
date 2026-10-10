import test from 'node:test';
import assert from 'node:assert/strict';
import {stackSeries,stackPreview} from '../src/series-stacks.mjs';
const item=(id,seriesId,period)=>({work:{id,seriesId},group:{id:period}});
test('stacks only matching series in the same period, retaining unrelated chronology',()=>{
 const a=item('a','fate','heisei'),b=item('b',null,'heisei'),c=item('c','fate','heisei'),d=item('d','fate','reiwa');
 const result=stackSeries([a,b,c,d]);assert.equal(result.length,3);assert.deepEqual(result[0].stackItems,[a,c]);assert.equal(result[1],b);assert.equal(result[2],d);
});
test('preview includes earliest work and at most three distinct posters',()=>{
 const items=Array.from({length:7},(_,i)=>item(String(i),'fate','heisei'));
 assert.deepEqual(stackPreview(items),[items[0],items[3],items[6]]);assert.deepEqual(stackPreview(items.slice(0,2)),items.slice(0,2));
});
