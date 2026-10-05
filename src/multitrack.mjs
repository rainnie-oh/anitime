export const yearLabel = year => year < 0 ? `前${Math.abs(year)}` : String(year);
export function dateSpan(date = {}) {
 const n = Number(date.start);
 if (date.start == null || date.start === '' || !Number.isFinite(n)) return null;
 if (date.type === 'year') return [n,n];
 if (date.type === 'range') return [n,Number(date.end)];
 if (date.type === 'decade') return [n,n+9];
 if (date.type === 'century') { const start=n>0?(n-1)*100+1:n*100; return [start,start+99]; }
 return null;
}
export function makeScale(catalog) {
 const occupied=catalog.regions.flatMap(region=>periodGroups(catalog,region)).filter(g=>!g.undated&&g.works.length);
 const start=occupied.length?Math.min(...occupied.map(g=>g.start)):Math.min(...catalog.periods.map(p=>p.start));
 const values=catalog.periods.flatMap(p=>[p.start,p.end]).filter(year=>year>=start);
 catalog.works.forEach(w=>{const span=dateSpan(w.date);if(span)values.push(...span.filter(year=>year>=start));});
 const boundaries=[...new Set(values.filter(Number.isFinite))].sort((a,b)=>a-b);
 if(!boundaries.length)boundaries.push(1900,2000);
 if(boundaries.length===1)boundaries.push(boundaries[0]+1);
 // Period boundaries set the rhythm; exact work dates interpolate within it.
 const ticks=[...new Set([...catalog.periods.flatMap(p=>[p.start,p.end]).filter(year=>year>=start),boundaries[0],boundaries.at(-1)])].filter(Number.isFinite).sort((a,b)=>a-b);
 const positions=[96];
 for(let i=1;i<ticks.length;i++)positions.push(positions[i-1]+Math.max(72,Math.min(420,(ticks[i]-ticks[i-1])*1.4)));
 // Reserve enough horizontal room to read period collections; every region shares these widths.
 for(const region of catalog.regions){for(const group of periodGroups(catalog,region)){
  if(group.undated||!group.works.length)continue;
  const a=ticks.indexOf(group.start),b=ticks.indexOf(group.end);if(a<0||b<=a)continue;
  const required=Math.min(3,group.works.length)*176+32;
  const missing=required-(positions[b]-positions[a]);
  if(missing>0)for(let i=a+1;i<positions.length;i++)positions[i]+=missing*Math.min(1,(i-a)/(b-a));
 }}
 const x=year=>{let i=0;while(i<ticks.length-2&&year>ticks[i+1])i++;return positions[i]+(year-ticks[i])/(ticks[i+1]-ticks[i])*(positions[i+1]-positions[i]);};
 const yearAt=position=>{let i=0;while(i<positions.length-2&&position>positions[i+1])i++;return Math.round(ticks[i]+(position-positions[i])/(positions[i+1]-positions[i])*(ticks[i+1]-ticks[i]));};
 return {ticks,x,yearAt,end:positions.at(-1),width:positions.at(-1)+640};
}
// Covers are read as collections within a historical period, just as in the single-track view.
// Their captions carry the work date; the period bands, not individual cover edges, map to years.
export function periodGroups(catalog,region) {
 const periods=catalog.periods.filter(p=>p.region===region).sort((a,b)=>a.start-b.start);
 const groups=periods.map(period=>({...period,works:[]}));
 const undated={id:'undated-'+region,name:'年代待定',region,works:[],undated:true};
 for(const work of catalog.works.filter(w=>w.regions.includes(region))) {
  const related=periods.filter(p=>work.periodIds.includes(p.id));
  const span=dateSpan(work.date);
  const item={work,periods:related,span};
  if(work.date?.type==='unknown'||(!span&&!related.length)){undated.works.push(item);continue;}
  const period=related.find(p=>span&&span[0]>=p.start&&span[0]<p.end)||related[0]||periods.find(p=>span&&span[0]>=p.start&&span[0]<p.end);
  if(period)groups.find(g=>g.id===period.id).works.push(item);
  else if(span)groups.push({id:'date-'+work.id,region,name:yearLabel(span[0]),start:span[0],end:Math.max(span[0]+1,span[1]),works:[item]});
 }
 for(const group of groups)group.works.sort((a,b)=>(a.span?.[0]??group.start)-(b.span?.[0]??group.start));
 return [...groups,...(undated.works.length?[undated]:[])];
}

export function arrangeGroups(groups,scale) {
 const ends=[];
 return groups.filter(group=>group.undated||group.end>scale.ticks[0]).map(group=>{
  const left=group.undated?scale.end+40:scale.x(Math.max(group.start,scale.ticks[0]));
  const width=group.undated?560:Math.max(160,scale.x(group.end)-left-24);
  let row=ends.findIndex(end=>end<=left);if(row<0)row=ends.length;
  ends[row]=left+width+16;
  return {...group,left,width,row};
 });
}

export function wheelIntent({deltaX,deltaY,shiftKey,ctrlKey},zone) {
 if(ctrlKey)return 'native';
 if(shiftKey||Math.abs(deltaX)>Math.abs(deltaY))return 'horizontal';
 return zone==='ruler'?'horizontal':'vertical';
}

export function workCollections(groups) {
 const collections=[];
 for(const group of groups.filter(g=>g.works.length).sort((a,b)=>a.left-b.left)) {
  const last=collections.at(-1);
  const items=group.works.map(item=>({...item,group}));
  if(last&&last.left+last.width>group.left){last.width=Math.max(last.left+last.width,group.left+group.width)-last.left;last.works.push(...items);}
  else collections.push({...group,works:items});
 }
 return collections;
}

export function collectionGeometry(group,expanded,scrollX) {
 const columns=expanded?Math.min(3,group.works.length,Math.max(1,Math.floor(group.width/176))):1;
 const width=expanded?Math.min(group.width,columns*160+(columns-1)*16):Math.min(group.width,group.works.length*52-12);
 const left=Math.max(group.left,Math.min(scrollX+96,group.left+group.width-width));
 return {left,width,columns};
}
