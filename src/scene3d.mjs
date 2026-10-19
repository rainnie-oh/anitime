// Pure layout for the 3D timeline: the ground is a shared year axis, works stand on one rail per region.
import {periodGroups, yearLabel} from './multitrack.mjs';

// Year axis whose intervals grow with elapsed time (capped) and with the works standing inside them.
export function makeAxis(catalog,{spacing=34,pad=24,yearWidth=1.2,minGap=40,maxGap=220}={}) {
 const groups=catalog.regions.flatMap(region=>periodGroups(catalog,region)).filter(g=>!g.undated&&g.works.length);
 const first=groups.length?Math.min(...groups.map(g=>g.start)):Math.min(...catalog.periods.map(p=>p.start));
 const last=groups.length?Math.max(...groups.map(g=>g.end)):Math.max(...catalog.periods.map(p=>p.end));
 const ticks=[...new Set(catalog.periods.flatMap(p=>[p.start,p.end]).concat(first,last))].filter(y=>Number.isFinite(y)&&y>=first&&y<=last).sort((a,b)=>a-b);
 const widths=ticks.slice(1).map((end,i)=>{
  const start=ticks[i],years=end-start;
  const crowd=groups.filter(g=>g.start<=start&&g.end>=end).map(g=>(g.works.length*spacing+pad)*years/(g.end-g.start));
  return Math.max(minGap,Math.min(maxGap,years*yearWidth),...crowd);
 });
 const positions=[0];widths.forEach(w=>positions.push(positions.at(-1)+w));
 const x=year=>{const y=Math.max(ticks[0],Math.min(ticks.at(-1),year));let i=0;while(i<ticks.length-2&&y>ticks[i+1])i++;return positions[i]+(y-ticks[i])/(ticks[i+1]-ticks[i])*(positions[i+1]-positions[i]);};
 return {ticks,x,length:positions.at(-1)};
}

// Rails, period bands and card positions. Cards keep story order and spread evenly within their period.
export function sceneLayout(catalog,options={}) {
 const axis=makeAxis(catalog,options);
 const {pad=24}=options;
 const rails=catalog.regions.map(region=>{
  const groups=periodGroups(catalog,region).filter(g=>!g.undated&&g.end>axis.ticks[0]);
  const bands=groups.map(g=>({id:g.id,name:g.name,start:g.start,end:g.end,x0:axis.x(g.start),x1:axis.x(g.end),count:g.works.length}));
  const cards=groups.flatMap(g=>{
   const x0=axis.x(g.start)+pad/2,x1=axis.x(g.end)-pad/2,step=(x1-x0)/g.works.length;
   return g.works.map((item,i)=>({key:region+'/'+item.work.id,region,group:g,item,x:x0+step*(i+.5)}));
  });
  return {region,bands,cards};
 });
 return {axis,rails};
}

// Year labels lying on the ground, thinned so neighbours never overlap at the current zoom.
export function groundTicks(axis,minDistance=56,map=x=>x) {
 const out=[];
 for(const year of axis.ticks){const x=map(axis.x(year));if(out.length&&x-out.at(-1).x<minDistance&&year!==axis.ticks.at(-1))continue;if(out.length&&x-out.at(-1).x<minDistance)out.pop();out.push({year,x,label:yearLabel(year)});}
 return out;
}

// Accordion lens around the cursor: sparse in the middle, compressed (by `far`) towards both sides so the
// scrolling range reads at a glance. Monotonic, so story order and cross-region alignment survive; rise peaks at the cursor.
export function lens(x,cursor,{spread=0,width=140,far=1}={}) {
 if(!spread)return {x,rise:0};
 const d=(x-cursor)/width;
 return {x:cursor+(x-cursor)*far+spread*Math.tanh(d),rise:Math.exp(-d*d)};
}

export function nearestCard(cards,cursor) {
 let best=null;
 for(const card of cards)if(!best||Math.abs(card.x-cursor)<Math.abs(best.x-cursor))best=card;
 return best;
}
