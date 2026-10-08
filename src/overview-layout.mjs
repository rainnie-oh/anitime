// One coordinate map for every region; reserve the whole label and count together.
export function makeOverviewLayout(ticks,lanes,viewport,labelWidth){
 const positions=ticks.map((_,i)=>200+i*Math.max(32,(viewport-360)/Math.max(1,ticks.length-1)));
 for(const groups of lanes){for(let i=0;i<groups.length-1;i++){
  const group=groups[i],next=groups[i+1];if(group.undated||next.undated)continue;
  const a=ticks.indexOf(group.start),b=ticks.indexOf(next.start);if(a<0||b<=a)continue;
  const missing=labelWidth(group)+32-(positions[b]-positions[a]);
  if(missing>0)for(let j=b;j<positions.length;j++)positions[j]+=missing;
 }}
 const x=year=>{let i=0;while(i<ticks.length-2&&year>ticks[i+1])i++;return positions[i]+(year-ticks[i])/(ticks[i+1]-ticks[i])*(positions[i+1]-positions[i]);};
 const lastWidth=Math.max(160,...lanes.map(groups=>groups.length?labelWidth(groups.at(-1))+32:0));
 return {x,width:Math.max(viewport,positions.at(-1)+lastWidth)};
}
