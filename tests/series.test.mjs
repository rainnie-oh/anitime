import test from 'node:test';
import assert from 'node:assert/strict';
import {filterSeries,seriesFields} from '../src/series.mjs';
const works=[{id:'a',seriesId:'jojo',regions:['日本','歐美'],cardStyle:'poster'},{id:'b',seriesId:'mononoke',regions:['日本'],cardStyle:'chapter'},{id:'c',regions:['中國']}];
const catalog={regions:['日本','歐美','中國'],periods:[{id:'p',start:1603,end:1868}],works};
test('series selection preserves identities, node styles and historical coordinates',()=>{
 assert.equal(filterSeries(catalog,''),catalog);
 const filtered=filterSeries(catalog,'jojo');assert.deepEqual(filtered.regions,['日本','歐美']);assert.equal(filtered.works.length,1);assert.equal(filtered.works[0],works[0]);assert.equal(filtered.periods,catalog.periods);
 assert.equal(filterSeries(catalog,'mononoke').works[0].cardStyle,'chapter');assert.equal(filterSeries(catalog,'missing').works.length,0);
});
test('legacy records remain compatible, chapters require series and edition',()=>{
 assert.equal(seriesFields({}).cardStyle,'poster');
 assert.throws(()=>seriesFields({cardStyle:'chapter'}));assert.throws(()=>seriesFields({seriesId:'jojo'}));assert.throws(()=>seriesFields({seriesId:'../jojo',seriesName:'JOJO'}));
 assert.equal(seriesFields({seriesId:'jojo',seriesName:'JOJO',edition:'第1部',cardStyle:'poster'}).seriesId,'jojo');
});
