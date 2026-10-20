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

// Ruler marks between the axis ticks. Each segment picks the finest year step whose marks stay at least
// `minSpacing` apart once compressed by `squeeze` (the lens's far factor), so the set never changes while scrolling.
// Decades get a stronger mark when the step is finer than ten years.
export function rulerMarks(axis,{minSpacing=6,squeeze=1}={}) {
 const steps=[1,2,5,10,25,50,100,200,500];
 const out=[];
 for(let i=0;i<axis.ticks.length-1;i++){
  const start=axis.ticks[i],end=axis.ticks[i+1],perYear=(axis.x(end)-axis.x(start))/(end-start);
  const step=steps.find(s=>perYear*s*squeeze>=minSpacing)??steps.at(-1);
  for(let year=Math.ceil((start+1)/step)*step;year<end;year+=step)out.push({year,x:axis.x(year),level:step<10&&year%10===0?'decade':'minor'});
 }
 return out;
}

// Works per stretch of axis, as a smooth profile sampled every `step` units (0–1, shared max across rails).
// Dated works count at their first year; period-only works spread evenly over their period.
export function densityProfiles(layout,{step=6,sigma=14}={}) {
 const {axis,rails}=layout,n=Math.ceil(axis.length/step)+1;
 const profiles=rails.map(rail=>{
  const values=new Float64Array(n);
  const add=(x,weight)=>{const lo=Math.max(0,Math.floor((x-3*sigma)/step)),hi=Math.min(n-1,Math.ceil((x+3*sigma)/step));for(let i=lo;i<=hi;i++){const d=(i*step-x)/sigma;values[i]+=weight*Math.exp(-d*d/2);}};
  for(const card of rail.cards){
   const span=card.item.span;
   if(span)add(axis.x(span[0]),1);
   else{const x0=axis.x(card.group.start),x1=axis.x(card.group.end),k=9;for(let j=0;j<k;j++)add(x0+(x1-x0)*(j+.5)/k,1/k);}
  }
  return values;
 });
 const max=Math.max(1e-9,...profiles.flatMap(v=>[...v]));
 return rails.map((rail,r)=>({region:rail.region,step,values:[...profiles[r]].map(v=>v/max)}));
}

// Which period names fit on a rail without colliding: each label runs from its band's start for about
// (characters + marker) × em. Busier periods claim space first; the rest keep only their square marker.
export function fitLabels(bands,em,{gap=.6}={}) {
 const placed=[],shown=new Set();
 const order=[...bands].sort((a,b)=>b.count-a.count||(b.x1-b.x0)-(a.x1-a.x0));
 for(const band of order){
  const start=band.x0,end=start+([...band.name].length+1.4)*em;
  if(placed.some(p=>start<p.end+gap*em&&end+gap*em>p.start))continue;
  placed.push({start,end});shown.add(band.id);
 }
 return shown;
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
