import {periodGroups} from './multitrack.mjs';
import {stackSeries} from './series-stacks.mjs';

// Narrow screens and landscape phones read the timeline top to bottom; tablets keep the horizontal desktop view.
export const VERTICAL_QUERY='(max-width: 767px), (max-height: 500px) and (pointer: coarse)';

// Row heights follow the shared type roles: 12px/1.5 captions, 14px/1.5 period labels.
export const V={spine:52,rail:68,lane:28,laneGap:8,gutter:16,inset:8,gap:12,blockGap:24,line:18,title:21,seriesLink:44,minTick:40,maxTick:300,yearFactor:1.1,top:24,undatedGap:64,end:48};

export function verticalMetrics(width) {
 const content=Math.max(160,width-V.spine-V.inset-V.rail-V.gutter);
 return {width,content,columns:2,columnWidth:(content-V.gap)/2,contentLeft:V.spine+V.inset,railLeft:width-V.gutter-V.rail};
}

export function groupItems(group,series) {
 const items=group.works.map(item=>({...item,group}));
 return series?items:stackSeries(items);
}

const aspect=work=>Math.min(1.5,Math.max(.5,(Number(work.height)||3)/(Number(work.width)||2)));
export const artHeight=(work,columnWidth)=>Math.round(columnWidth*aspect(work));
export const stackArtHeight=columnWidth=>Math.round(columnWidth*1.1);
// Edition (optional), a two-line title and the generated date line.
export const captionHeight=work=>6+(work.edition?V.line:0)+3*V.line;
export const stackCaptionHeight=()=>6+3*V.line;

export function itemHeight(item,columnWidth,series) {
 if(item.stackItems)return stackArtHeight(columnWidth)+stackCaptionHeight();
 const work=item.work,link=!series&&work.seriesId?V.seriesLink:0;
 if(work.cardStyle==='chapter')return captionHeight(work)+12+link;
 return artHeight(work,columnWidth)+captionHeight(work)+link;
}

// CJK glyphs are at most one em wide, so this never under-reserves the period description.
export function headingHeight(group,width) {
 const lines=group.description?Math.ceil(group.description.length*12/Math.max(120,width-14)):0;
 return 6+V.title+V.line+lines*V.line+12;
}

export function blockHeight(group,items,metrics,series) {
 let height=headingHeight(group,metrics.content);
 for(let i=0;i<items.length;i+=metrics.columns)height+=Math.max(...items.slice(i,i+metrics.columns).map(item=>itemHeight(item,metrics.columnWidth,series)))+V.gap;
 return height;
}

// Overlapping periods of one region read as one sequence, as in workCollections.
export function verticalCollections(blocks) {
 const result=[];
 for(const block of blocks.filter(b=>!b.group.undated)){
  const last=result.at(-1);
  if(last&&block.group.start<last.end){last.blocks.push(block);last.end=Math.max(last.end,block.group.end);}
  else result.push({start:block.group.start,end:block.group.end,blocks:[block]});
 }
 const undated=blocks.filter(b=>b.group.undated);
 if(undated.length)result.push({undated:true,blocks:undated});
 return result;
}

const interpolate=(value,from,to)=>{let i=0;while(i<from.length-2&&value>from[i+1])i++;const span=from[i+1]-from[i];return span?to[i]+(value-from[i])/span*(to[i+1]-to[i]):to[i];};

// The horizontal makeScale rotated: period boundaries set the rhythm, the focused region's
// collections reserve room, and every other region maps through the same y(year).
export function makeVerticalScale(catalog,region,metrics,{series=false}={}) {
 const all=catalog.regions.flatMap(r=>periodGroups(catalog,r));
 const occupied=all.filter(g=>!g.undated&&g.works.length);
 const start=occupied.length?Math.min(...occupied.map(g=>g.start)):Math.min(...catalog.periods.map(p=>p.start),1900);
 const bounds=series?occupied.flatMap(g=>[g.start,g.end]):[start,...catalog.periods.flatMap(p=>[p.start,p.end]),...all.filter(g=>!g.undated).flatMap(g=>[g.start,g.end])];
 const ticks=[...new Set(bounds.filter(y=>Number.isFinite(y)&&y>=start))].sort((a,b)=>a-b);
 if(ticks.length<2)ticks.push(ticks[0]+1);
 const pos=[V.top];
 for(let i=1;i<ticks.length;i++)pos.push(pos[i-1]+(series?V.minTick:Math.max(V.minTick,Math.min(V.maxTick,(ticks[i]-ticks[i-1])*V.yearFactor))));
 const groups=periodGroups(catalog,region).filter(g=>(g.undated||g.end>start)&&(!series||g.works.length));
 const blocks=groups.map(group=>{const items=groupItems(group,series);return {group,items,height:blockHeight(group,items,metrics,series)};});
 const collections=verticalCollections(blocks);
 for(const c of collections){
  if(c.undated)continue;
  const a=ticks.indexOf(Math.max(c.start,start)),b=ticks.indexOf(c.end);
  if(a<0||b<=a)continue;
  const missing=c.blocks.reduce((sum,block)=>sum+block.height+V.blockGap,0)-(pos[b]-pos[a]);
  if(missing>0)for(let i=a+1;i<pos.length;i++)pos[i]+=missing*Math.min(1,(i-a)/(b-a));
 }
 const y=year=>interpolate(Math.min(Math.max(year,ticks[0]),ticks.at(-1)),ticks,pos);
 const yearAt=position=>Math.round(interpolate(Math.min(Math.max(position,pos[0]),pos.at(-1)),pos,ticks));
 const undatedTop=pos.at(-1)+V.undatedGap;
 let bottom=-Infinity;
 for(const c of collections){
  let top=c.undated?Math.max(undatedTop,bottom+V.blockGap):Math.max(y(c.start),bottom+V.blockGap);
  for(const block of c.blocks){block.top=top;top+=block.height+V.blockGap;}
  bottom=Math.max(bottom,top-V.blockGap);
 }
 return {ticks,pos,start,y,yearAt,blocks,height:Math.max(bottom,pos.at(-1))+V.end};
}

// Reference rail: other regions' periods on the same y(year), at least one touch target tall.
export function railBands(groups,scale,minHeight=44) {
 return groups.filter(g=>!g.undated&&g.end>scale.start).map(group=>{
  const top=scale.y(Math.max(group.start,scale.start));
  return {group,top,bottom:Math.max(top+minHeight,scale.y(group.end))};
 });
}
export const railLabelHeight=group=>group.name.length*12+30;
// Labels stay readable inside their band while it is in view, and never overlap within a lane.
export function railLabels(bands,viewTop,heightOf=b=>railLabelHeight(b.group)) {
 let previous=-Infinity;
 return bands.map(band=>{
  const height=heightOf(band);
  const top=Math.max(previous+4,band.top,Math.min(viewTop,band.bottom-height));
  previous=top+height;
  return top;
 });
}

// Overview: one column per region; each start year moves down only enough to keep every label whole.
export function makeVerticalOverview(lanes,labelHeight,{top=16,minStep=14,gap=8}={}) {
 const dated=lanes.map(groups=>groups.filter(g=>!g.undated));
 const ticks=[...new Set(dated.flat().flatMap(g=>[g.start,g.end]))].sort((a,b)=>a-b);
 const pos=[],bottom=lanes.map(()=>-Infinity);
 ticks.forEach((tick,i)=>{
  let y=i?pos[i-1]+minStep:top;
  dated.forEach((groups,lane)=>{if(groups.some(g=>g.start===tick))y=Math.max(y,bottom[lane]+gap);});
  pos.push(y);
  dated.forEach((groups,lane)=>{for(const g of groups)if(g.start===tick)bottom[lane]=Math.max(bottom[lane],y)+labelHeight(g);});
 });
 const y=year=>ticks.length?interpolate(Math.min(Math.max(year,ticks[0]),ticks.at(-1)),ticks,pos):top;
 const undatedTop=Math.max(pos.at(-1)??top,...bottom)+V.undatedGap;
 const undated=lanes.map(groups=>groups.find(g=>g.undated));
 const height=Math.max(undatedTop+(undated.some(Boolean)?Math.max(...undated.filter(Boolean).map(labelHeight)):0),0)+V.end;
 return {ticks,pos,y,undatedTop,height};
}
