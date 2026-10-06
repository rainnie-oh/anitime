import React,{useMemo,useState,useRef,useEffect,useLayoutEffect} from 'react';
import {filterSeries} from './series.mjs';
import {formatDate} from './date.mjs';
import {makeScale,periodGroups,arrangeGroups,yearLabel,wheelIntent,workCollections,collectionGeometry,makeSeriesScale} from './multitrack.mjs';
import {WorkDetail} from './WorkDetail.jsx';
import './multitrack.css';
import './series.css';
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function WorkCollection({style,children,collectionId}) {
 const content=useRef(null),[more,setMore]=useState(false);
 const measure=()=>{const el=content.current;if(el)setMore(el.scrollHeight-el.clientHeight-el.scrollTop>2);};
 useLayoutEffect(()=>{measure();const observer=new ResizeObserver(measure);observer.observe(content.current);for(const child of content.current.children)observer.observe(child);return()=>observer.disconnect();},[children]);
 return <div className={'mt-collection '+(more?'has-more':'')} style={style}><div className="mt-work-group" data-collection={collectionId} ref={content} onScroll={measure} style={{gridTemplateColumns:style.gridTemplateColumns}}>{children}</div></div>;
}

export function Multitrack({catalog}) {
 const [seriesId,setSeriesId]=useState('');
 const visibleCatalog=useMemo(()=>filterSeries(catalog,seriesId),[catalog,seriesId]);
 const beforeSeries=useRef(null),restoreSeries=useRef(null);
 const regions=catalog.regions;
 const [focus,setFocus]=useState(()=>regions.includes('日本')?'日本':regions.find(r=>catalog.works.some(w=>w.regions.includes(r)))||regions[0]);
 const [mode,setMode]=useState('detail'),[year,setYear]=useState(1868),[scrollX,setScrollX]=useState(0),[progress,setProgress]=useState(0),[selected,setSelected]=useState(null),[viewport,setViewport]=useState(1000);
 const scale=useMemo(()=>seriesId?makeSeriesScale(visibleCatalog,viewport):makeScale(catalog),[catalog,visibleCatalog,seriesId,viewport]);
 const ruler=useRef(null),tracks=useRef(null),lanes=useRef({}),root=useRef(null),remembered=useRef(null),pending=useRef(null),transitionFrom=useRef(null),modeAnimations=useRef([]);
 const allGroups=useMemo(()=>Object.fromEntries(regions.map(region=>[region,arrangeGroups(periodGroups(seriesId&&!visibleCatalog.regions.includes(region)?catalog:visibleCatalog,region).filter(g=>!seriesId||g.works.length),scale)])),[visibleCatalog,regions,scale,seriesId]);
 function filterBySeries(work,region) {
  if(seriesId===work.seriesId){setSelected(null);clearSeries();return;}
  captureTransition();
  if(!seriesId)beforeSeries.current={left:ruler.current.scrollLeft,top:tracks.current.scrollTop,focus,mode,remembered:remembered.current,opener:document.activeElement,collections:[...root.current.querySelectorAll('.mt-work-group')].map(el=>[el.dataset.collection,el.scrollTop])};
  setSelected(null);setFocus(region);setSeriesId(work.seriesId);
  requestAnimationFrame(()=>root.current.querySelector('.series-return')?.focus({preventScroll:true}));
 }
 function clearSeries(){captureTransition();restoreSeries.current=beforeSeries.current;beforeSeries.current=null;setSeriesId('');if(restoreSeries.current){setFocus(restoreSeries.current.focus);setMode(restoreSeries.current.mode);remembered.current=restoreSeries.current.remembered;}}
 function track(){if(mode==='overview'){setScrollX(ruler.current?.scrollLeft||0);return;}const el=ruler.current;if(!el)return;const left=el.scrollLeft;remembered.current=left;setScrollX(left);setProgress(left/Math.max(1,el.scrollWidth-el.clientWidth));setYear(Math.max(scale.ticks[0],Math.min(scale.ticks.at(-1),scale.yearAt(left+96))));}
 function moveTo(left,smooth=false){ruler.current?.scrollTo({left,behavior:smooth&&!reduced()?'smooth':'instant'});}
 useLayoutEffect(()=>{if(mode==='detail'){moveTo(seriesId?0:pending.current??remembered.current??Math.max(0,scale.x(1868)-96));pending.current=null;if(seriesId)tracks.current.scrollTop=0;track();}else{moveTo(0);setScrollX(0);}},[mode,scale]);
 useLayoutEffect(()=>{const previous=restoreSeries.current;if(!previous)return;restoreSeries.current=null;moveTo(previous.left);tracks.current.scrollTop=previous.top;previous.collections.forEach(([id,top])=>{const el=root.current.querySelector(`[data-collection="${CSS.escape(id)}"]`);if(el)el.scrollTop=top;});if(previous.opener?.isConnected)previous.opener.focus({preventScroll:true});track();},[seriesId,mode]);
 useEffect(()=>{const element=root.current;const observer=new ResizeObserver(()=>{setViewport(element.clientWidth);if(ruler.current)track();});observer.observe(element);return()=>observer.disconnect();},[scale]);
 useEffect(()=>{
  const el=root.current;
  const wheel=event=>{
   if(event.target.closest('dialog')||!event.target.closest('.mt-ruler,.mt-tracks'))return;
   const collection=event.target.closest('.expanded .mt-work-group');
   const intent=wheelIntent(event,collection?'content':'ruler');if(intent==='native')return;
   const unit=event.deltaMode===1?16:event.deltaMode===2?tracks.current.clientHeight:1;
   event.preventDefault();
   if(intent==='horizontal'){const delta=event.shiftKey?(event.deltaY||event.deltaX):Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;moveTo(ruler.current.scrollLeft+delta*unit);}
   else {collection.scrollTop+=event.deltaY*unit;}
  };
  let touch=null;
  const touchStart=e=>{if(e.touches.length===1)touch={x:e.touches[0].clientX,y:e.touches[0].clientY,last:e.touches[0].clientX};};
  const touchMove=e=>{if(!touch||e.touches.length!==1||e.target.closest('dialog'))return;const point=e.touches[0];if(Math.abs(point.clientX-touch.x)>Math.abs(point.clientY-touch.y)){e.preventDefault();moveTo(ruler.current.scrollLeft+touch.last-point.clientX);}touch.last=point.clientX;};
  el.addEventListener('wheel',wheel,{passive:false});el.addEventListener('touchstart',touchStart,{passive:true});el.addEventListener('touchmove',touchMove,{passive:false});
  return()=>{el.removeEventListener('wheel',wheel);el.removeEventListener('touchstart',touchStart);el.removeEventListener('touchmove',touchMove);};
 },[mode]);
 function choose(region,item){
  setFocus(region);
  // Region selection changes emphasis only; it never changes the time position or scrolls vertically.
  if(item){const left=Math.max(0,item.group.left-96);moveTo(left);requestAnimationFrame(()=>lanes.current[region]?.querySelector(`[data-work="${CSS.escape(item.work.id)}"]`)?.focus({preventScroll:true}));}
 }
 function captureTransition(){transitionFrom.current=new Map([...root.current.querySelectorAll('[data-motion]')].map(el=>[el.dataset.motion,el.getBoundingClientRect()]));modeAnimations.current.forEach(a=>a.cancel());}
 function switchMode(next){if(next===mode)return;if(seriesId){if(beforeSeries.current)beforeSeries.current.mode=next;clearSeries();return;}captureTransition();if(mode==='detail')remembered.current=ruler.current.scrollLeft;setMode(next);}
 useLayoutEffect(()=>{const from=transitionFrom.current;transitionFrom.current=null;if(!from||reduced())return;modeAnimations.current=[...root.current.querySelectorAll('[data-motion]')].flatMap(el=>{const old=from.get(el.dataset.motion);if(!old)return [];const now=el.getBoundingClientRect();return [el.animate([{transform:`translate(${old.left-now.left}px,${old.top-now.top}px)`},{transform:'translate(0,0)'}],{duration:620,easing:'cubic-bezier(.22,1,.36,1)'})];});},[mode,seriesId]);
 useEffect(()=>()=>modeAnimations.current.forEach(a=>a.cancel()),[]);
 function enter(region,group){setFocus(region);const left=Math.max(0,group.left-96);if(mode==='overview'){captureTransition();pending.current=left;setMode('detail');}else moveTo(left,true);}
 function pick(region,item,group){if(region!==focus){choose(region,{...item,group});return;}setSelected({...item.work,date:formatDate(item.work.date,item.periods),period:item.periods.map(p=>p.name).join('、')||group.name,region});}
 function jump(direction){const current=ruler.current.scrollLeft+96,positions=scale.ticks.map(scale.x);const target=direction>0?positions.find(x=>x>current+2):positions.findLast(x=>x<current-2);moveTo(Math.max(0,(target??(direction>0?scale.width:96))-96),true);}
 function card(region,item,group){
  const work=item.work,portrait=work.height>work.width,chapter=work.cardStyle==='chapter',open=region===focus;
  return <article key={work.id} className={'mt-work '+(chapter?'chapter':portrait?'portrait':'landscape')} data-motion={'work-'+work.id} data-node-style={chapter?'chapter':'poster'}>
   <button className="mt-work-open" data-work={work.id} aria-label={`${work.name}，${formatDate(work.date,item.periods)}${open?'':'，展开'+region}`} title={work.name} onFocus={e=>{const rect=e.currentTarget.getBoundingClientRect(),bounds=tracks.current.getBoundingClientRect();if(rect.right<bounds.left||rect.left>bounds.right)moveTo(Math.max(0,group.left-96));}} onClick={()=>pick(region,item,group)}>
    {!chapter&&<span className="mt-art"><img src={work.image} alt="" loading="eager" decoding="async"/></span>}
    {(open||chapter)&&<span className="mt-caption">{work.edition&&<small>{work.edition}</small>}<b>{work.name}</b><span>{formatDate(work.date,item.periods)}</span></span>}
   </button>
   {open&&!seriesId&&work.seriesId&&<a className="series-link" href={seriesId===work.seriesId?'#timeline':'#series-'+work.seriesId} aria-label={seriesId===work.seriesId?`返回全部作品：${work.name}`:`只看${work.seriesName}系列：${work.name}`} onClick={e=>{e.preventDefault();filterBySeries(work,region);}}>{seriesId===work.seriesId?'返回':`${work.seriesName}系列 ↗`}</a>}
  </article>;
 }
 const overviewWidth=Math.max(viewport,1200);
 const overviewX=value=>{let i=0;while(i<scale.ticks.length-2&&value>scale.ticks[i+1])i++;return 200+(i+(value-scale.ticks[i])/(scale.ticks[i+1]-scale.ticks[i]))*(overviewWidth-360)/(scale.ticks.length-1);};
 const focusedTick=scale.ticks.reduce((best,t)=>Math.abs(scale.x(t)-scrollX-96)<Math.abs(scale.x(best)-scrollX-96)?t:best,scale.ticks[0]);
 const displayWidth=mode==='overview'?overviewWidth:scale.width;
 const displayGroups=region=>mode==='overview'?allGroups[region].map((g,i,list)=>{const left=g.undated?overviewWidth-120:overviewX(g.start);const next=list[i+1];const right=next?(next.undated?overviewWidth-120:overviewX(next.start)):overviewWidth;return {...g,left,width:Math.max(48,Math.min(140,right-left-12)),row:0};}):allGroups[region];
 return <main className={'multitrack '+(mode==='overview'?'mt-overview-mode':'')+(seriesId?' has-series-filter':'')} ref={root}>
  <header className="mt-header"><a className="brand" href="#" onClick={e=>{e.preventDefault();switchMode('overview');}}><img className="brand-wordmark" src="/brand/anitime-white.svg" alt="ANITIME" width="166" height="48" /></a><nav aria-label="展开地域">{regions.map(region=><button key={region} aria-pressed={region===focus} disabled={!!seriesId&&!visibleCatalog.regions.includes(region)} onClick={()=>choose(region)}>{region}</button>)}</nav><nav aria-label="模式"><button aria-pressed={mode==='overview'} onClick={()=>switchMode('overview')}>OVERVIEW</button><button aria-pressed={mode==='detail'} onClick={()=>switchMode('detail')}>TIMELINE</button></nav></header>
  <div className="mt-context" aria-hidden="true" />
  <>
   <div className="mt-ruler" ref={ruler} onScroll={track} tabIndex={0} aria-label="共享年份尺"><div style={{width:displayWidth}}>{scale.ticks.map((t,i)=><span className={mode==='detail'&&t===focusedTick?'is-focused':''} aria-current={mode==='detail'&&t===focusedTick?'true':undefined} data-motion={'tick-'+t} key={t} style={{left:mode==='overview'?overviewX(t):scale.x(t),visibility:mode==='overview'&&i%4!==0&&i!==scale.ticks.length-1?'hidden':undefined}}>{yearLabel(t)}</span>)}</div></div>
   <div className="mt-tracks" style={{'--region-count':regions.length}} ref={tracks} tabIndex={0} aria-label="地域轨道列表">{regions.map(region=>{const open=region===focus,groups=displayGroups(region),withWorks=workCollections(allGroups[region]);return <section ref={el=>lanes.current[region]=el} key={region} className={'mt-lane '+(open?'expanded':'compact')+(!withWorks.length?' empty':'')+(seriesId&&!visibleCatalog.regions.includes(region)?' series-muted':'')} aria-label={region+'轨道'}><div className="mt-lane-heading" data-motion={'region-'+region}><button className="mt-region-button" aria-expanded={open} onClick={()=>choose(region)}>{region}</button>{seriesId&&open&&<><span className="mt-series-name">/ {catalog.works.find(w=>w.seriesId===seriesId)?.seriesName}系列</span><a className="series-link series-return" href="#timeline" onClick={e=>{e.preventDefault();clearSeries();}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>返回全部作品</a></>}</div><div className="mt-period-viewport"><div className="mt-period-strip" style={{width:displayWidth,left:-scrollX,height:open?Math.max(1,...groups.filter(g=>g.left+g.width>scrollX&&g.left<scrollX+viewport).map(g=>g.row+1))*80:24}}>{groups.map(group=><button className={'mt-period-heading '+(group.name.length>4?'long-name':'')} data-motion={'period-'+region+'-'+group.id} key={group.id} style={{left:mode==='overview'||!open?group.left:Math.max(group.left,Math.min(scrollX+96,group.left+group.width-160)),width:mode==='overview'?group.width:!open?Math.min(group.width,120):Math.min(group.width,Math.max(160,group.left+group.width-scrollX-96)),top:open?group.row*80:0}} aria-label={`${region} ${group.name}，定位时期`} title={group.name+' '+(group.range||'')} onFocus={e=>{const rect=e.currentTarget.getBoundingClientRect(),bounds=tracks.current.getBoundingClientRect();if(rect.right<bounds.left||rect.left>bounds.right)moveTo(Math.max(0,group.left-96));}} onClick={()=>enter(region,allGroups[region].find(g=>g.id===group.id))}><h3><i/><span>{group.name}</span>{mode==='overview'&&<small className="mt-count" aria-label={group.works.length+' 部作品'}>{group.works.length}</small>}</h3>{open&&mode==='detail'&&<><span>{group.range||'具体年代未明确'}</span><p>{group.description}</p></>}</button>)}</div></div>{withWorks.length?<div className="mt-work-viewport" inert={mode==='overview'} tabIndex={mode==='overview'?-1:0} aria-label={region+'作品区'}><div className="mt-work-strip" style={{width:scale.width,left:-scrollX,height:'100%'}}>{withWorks.map(group=>{const box=seriesId&&visibleCatalog.regions.includes(region)&&open?{left:group.left,width:group.width,columns:group.works.length}:collectionGeometry(group,open,scrollX);return <WorkCollection collectionId={region+'-'+group.id} key={group.id} style={{left:box.left,width:box.width,top:0,...(open?{gridTemplateColumns:`repeat(${box.columns},minmax(0,${seriesId?140:160}px))`}:{})}}>{group.works.map(item=>card(region,item,item.group||group))}</WorkCollection>;})}</div></div>:<p className="mt-empty">此地域暂无已发布作品</p>}</section>;})}</div>
  </>
  <footer className="mt-footer">{mode==='detail'?<><div className="arrows"><button aria-label="前一个时期" disabled={progress<=.001} onClick={()=>jump(-1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><button aria-label="后一个时期" disabled={progress>=.999} onClick={()=>jump(1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button></div><div className="progress"><div className="progress-track"><div style={{width:progress*100+'%'}}/></div><input type="range" min="0" max="1000" value={Math.round(progress*1000)} aria-label="时间线进度" onChange={e=>moveTo(Number(e.target.value)/1000*(ruler.current.scrollWidth-ruler.current.clientWidth))}/></div><div className="current">{yearLabel(year)} — {yearLabel(scale.ticks.at(-1))}</div></>:<p>选择一个时期，进入对应地域的时间线</p>}</footer>
  {selected&&<WorkDetail selected={selected} region={selected.region} onClose={()=>setSelected(null)} activeSeries={seriesId} onFilter={seriesId?undefined:work=>filterBySeries(work,selected.region)}/>}
 </main>;
}
