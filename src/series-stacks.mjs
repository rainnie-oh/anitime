// A period collection can contain overlapping periods; never stack across those boundaries.
export function stackSeries(items) {
 const groups=new Map(),result=[];
 for(const item of items){
  const key=item.work.seriesId&&`${item.group?.id||item.periods.map(p=>p.id).join(',')}:${item.work.seriesId}`;
  if(!key){result.push(item);continue;}
  if(!groups.has(key)){const group={...item,stackItems:[]};groups.set(key,group);result.push(group);}
  groups.get(key).stackItems.push(item);
 }
 return result.map(item=>item.stackItems?.length===1?item.stackItems[0]:item);
}
export function stackPreview(items){return items.length<=3?items:[items[0],items[Math.floor(items.length/2)],items.at(-1)];}
