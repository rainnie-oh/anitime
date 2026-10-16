import React,{memo,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import ShareButton from '../components/ui/share-button.jsx';
import ProgressiveCover from '../components/ui/progressive-cover.jsx';
import SegmentedControlTabs from '../components/ui/segmented-control-tabs.jsx';
import {stackPreview} from '../series-stacks.mjs';
import {filterSeries} from '../series.mjs';
import {formatDate} from '../date.mjs';
import {periodGroups,yearLabel} from '../multitrack.mjs';
import {resolveAsset} from '../asset.mjs';
import {WorkDetail} from '../WorkDetail.jsx';
import {V,verticalMetrics,makeVerticalScale,railBands,railLabels,railLabelHeight,makeVerticalOverview,artHeight,stackArtHeight,captionHeight,stackCaptionHeight,headingHeight} from '../vertical.mjs';
import '../series.css';
import '../series-stack.css';
import '../swiss-multitrack.css';
import './vertical.css';

const pageWidth=()=>document.documentElement.clientWidth;
const ownState=kind=>history.state?.anitime===kind;
const backIcon=<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>;

// The nearest shown year above the reading line takes the red focus, as on the desktop ruler.
function Spine({ticks,pos,height,viewTop}) {
 let last=-Infinity;
 const shown=ticks.map((tick,i)=>({tick,top:pos[i]})).filter(({top})=>top-last>=20&&(last=top,true));
 const active=viewTop==null?null:shown.reduce((best,t)=>t.top<=viewTop+40?t.tick:best,shown[0]?.tick);
 return <div className="vt-spine" style={{height}} aria-hidden="true">{shown.map(({tick,top})=><span key={tick} className={'vt-tick'+(tick===active?' is-focused':'')} style={{top}}>{yearLabel(tick)}</span>)}</div>;
}

// Cards only change with layout, never with scrolling; keep them out of the per-frame render.
const RegionBlocks=memo(function RegionBlocks({region,blocks,metrics,seriesId,actions}) {
 const width=metrics.columnWidth;
 function card(item,group) {
  if(item.stackItems){
   const items=item.stackItems,work=items[0].work,preview=stackPreview(items),key=region+':'+group.id+':'+work.seriesId;
   const layers=preview.length===2?[preview[1],preview[0]]:[preview[1],preview[2],preview[0]];
   const dates=[...new Set(items.map(i=>formatDate(i.work.date,i.periods)))].join('／');
   return <article key={'stack-'+key} className="vt-card vt-stack">
    <button className="mt-stack-open" data-stack-key={key} aria-expanded="false" aria-label={`展開${work.seriesName}系列，${group.name}，${items.length}部作品`} onClick={e=>actions.current.series(work,region,e.currentTarget)}>
     <span className="mt-stack-art" style={{height:stackArtHeight(width)}}>{layers.map(i=><ProgressiveCover key={i.work.id+':'+i.work.image} sizes={Math.round(width*.66)+'px'} data-poster={region+':'+i.work.id} src={i.work.image} alt=""/>)}</span>
     <span className="vt-caption" style={{height:stackCaptionHeight()}}><b className="mt-stack-title">{work.seriesName}<span className="mt-stack-count">{items.length} 部</span></b><span>{dates}</span><span className="mt-stack-hint">展開系列 ↗</span></span>
    </button>
   </article>;
  }
  const work=item.work,date=formatDate(work.date,item.periods),chapter=work.cardStyle==='chapter';
  return <article key={work.id} className={'vt-card'+(chapter?' chapter':'')}>
   <button className="vt-card-open" data-work={work.id} aria-label={`${work.name}，${date}`} onClick={e=>actions.current.pick(item,group,region,e.currentTarget)}>
    {!chapter&&<span className="vt-art" style={{height:artHeight(work,width)}}><ProgressiveCover key={work.image} sizes={Math.round(width)+'px'} data-poster={region+':'+work.id} src={work.image} alt=""/></span>}
    <span className="vt-caption" style={{height:captionHeight(work)}}>{work.edition&&<small>{work.edition}</small>}<b>{work.name}</b><span>{date}</span></span>
   </button>
   {!seriesId&&work.seriesId&&<a className="series-link" href={'#series-'+work.seriesId} aria-label={`只看${work.seriesName}系列：${work.name}`} onClick={e=>{e.preventDefault();actions.current.series(work,region,e.currentTarget);}}>{work.seriesName}系列 ↗</a>}
  </article>;
 }
 return blocks.map(({group,items,top})=><section key={group.id} className={'vt-period'+(group.works.length?'':' is-empty')} style={{top,left:metrics.contentLeft,width:metrics.content}} data-period={group.id} aria-label={`${region} ${group.name}`}>
  <div className="vt-period-heading" style={{height:headingHeight(group,metrics.content)}}>
   <h3><i/>{group.name}</h3>
   <span>{group.undated?'位置不代表史實年份':group.range||'具體年代未明確'}{group.works.length?'':' · 暫無作品'}</span>
   {group.description&&<p>{group.description}</p>}
  </div>
  {items.length>0&&<div className="vt-grid" style={{gridTemplateColumns:`repeat(${metrics.columns},minmax(0,1fr))`}}>{items.map(item=>card(item,item.group||group))}</div>}
 </section>);
});

export function VerticalTimeline({catalog,position}) {
 const regions=catalog.regions,saved=position?.current;
 const [focus,setFocus]=useState(()=>saved?.focus&&regions.includes(saved.focus)?saved.focus:regions.includes('日本')?'日本':regions[0]);
 const [mode,setMode]=useState(saved?.mode==='overview'?'overview':'detail');
 const [seriesId,setSeriesId]=useState('');
 const [selected,setSelected]=useState(null);
 const [width,setWidth]=useState(pageWidth);
 const [viewTop,setViewTop]=useState(0);
 const root=useRef(null),chrome=useRef(null),body=useRef(null),before=useRef(null),restoreOpener=useRef(null),frame=useRef(0);
 const anchor=useRef({year:saved?.year??1868}),lastYear=useRef(saved?.year??1868),live=useRef({});
 const visible=useMemo(()=>filterSeries(catalog,seriesId),[catalog,seriesId]);
 const metrics=useMemo(()=>verticalMetrics(width),[width]);
 const scale=useMemo(()=>makeVerticalScale(visible,focus,metrics,{series:!!seriesId}),[visible,focus,metrics,seriesId]);
 const others=regions.filter(r=>r!==focus);
 const bands=useMemo(()=>Object.fromEntries(others.map(r=>[r,railBands(periodGroups(visible,r).filter(g=>!seriesId||g.works.length),scale)])),[visible,focus,scale,seriesId]);
 const overview=useMemo(()=>{
  if(mode!=='overview')return null;
  const lanes=regions.map(r=>periodGroups(catalog,r).filter(g=>g.undated||g.end>scale.start));
  const column=(width-V.spine)/regions.length;
  const context=document.createElement('canvas').getContext('2d'),type=getComputedStyle(document.documentElement);
  const label=parseFloat(type.getPropertyValue('--text-label'))||14,caption=parseFloat(type.getPropertyValue('--text-caption'))||12,family=type.getPropertyValue('--font-text').trim()||'sans-serif';
  // Measure name and count together with the rendered type tokens; wrap rather than shrink.
  const labelHeight=g=>{
   let text=g.name.length*label,count=String(g.works.length).length*caption;
   if(context){context.font=`600 ${label}px ${family}`;text=context.measureText(g.name).width;context.font=`400 ${caption}px ${family}`;count=context.measureText(String(g.works.length)).width;}
   const lines=Math.ceil((14+text+6+count+8)/Math.max(40,column-24));
   return Math.max(44,lines*label*1.5+8);
  };
  return {lanes,column,...makeVerticalOverview(lanes,labelHeight)};
 },[mode,catalog,regions,width,scale.start]);

 // Positions are read in timeline coordinates: 0 is the top of the track body, just under the sticky chrome.
 const coordinate=()=>body.current&&chrome.current?chrome.current.getBoundingClientRect().bottom-body.current.getBoundingClientRect().top:0;
 const scrollToCoordinate=value=>{const top=body.current.getBoundingClientRect().top+scrollY-chrome.current.getBoundingClientRect().height;window.scrollTo({top:Math.max(0,top+value),behavior:'instant'});};
 const currentYear=()=>mode==='overview'?lastYear.current:scale.yearAt(coordinate()+8);
 const remember=()=>{anchor.current={year:currentYear()};};

 useLayoutEffect(()=>{
  const target=anchor.current;anchor.current=null;
  if(target&&body.current){
   if('coordinate' in target)scrollToCoordinate(target.coordinate);
   else if(target.period){const block=scale.blocks.find(b=>b.group.id===target.period);scrollToCoordinate(block?block.top-8:0);}
   else if(mode==='detail')scrollToCoordinate(scale.y(target.year)-8);
   else scrollToCoordinate(0);
  }
  setViewTop(coordinate());
 },[scale,mode]);

 useEffect(()=>{
  // The year anchor, not the browser, decides where the page opens after a reload.
  const restoration=history.scrollRestoration;history.scrollRestoration='manual';
  const onScroll=()=>{cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(()=>setViewTop(coordinate()));};
  const onResize=()=>{const next=pageWidth();if(next!==live.current.width){live.current.remember();setWidth(next);}};
  addEventListener('scroll',onScroll,{passive:true});addEventListener('resize',onResize);
  return()=>{history.scrollRestoration=restoration;removeEventListener('scroll',onScroll);removeEventListener('resize',onResize);cancelAnimationFrame(frame.current);};
 },[]);

 const year=mode==='overview'?lastYear.current:scale.yearAt(viewTop+8);
 useEffect(()=>{if(mode==='detail')lastYear.current=year;if(position)position.current={year:lastYear.current,focus,mode};},[year,focus,mode]);

 // Region change keeps the year in view; the layout reserves room for the newly expanded region.
 function choose(region,atYear) {
  if(seriesId&&!visible.regions.includes(region))return;
  if(mode==='detail')anchor.current={year:atYear??currentYear()};
  setFocus(region);
 }
 function switchMode(next) {
  if(next===mode)return;
  if(seriesId){if(before.current)before.current.mode=next;requestReturn();return;}
  if(next==='overview')lastYear.current=currentYear();
  anchor.current={year:lastYear.current};
  setMode(next);
 }
 function enter(region,group){anchor.current={period:group.id};setFocus(region);setMode('detail');}
 function enterSeries(work,region,opener) {
  if(!seriesId){
   before.current={coordinate:coordinate(),focus,mode,opener,openerKey:opener?.dataset.stackKey||opener?.closest('.vt-card')?.querySelector('[data-work]')?.dataset.work||work.id};
   if(ownState('detail'))history.replaceState({anitime:'series'},'');else history.pushState({anitime:'series'},'');
  }else if(ownState('detail'))history.back();
  anchor.current={coordinate:0};
  setSelected(null);setFocus(region);setMode('detail');setSeriesId(work.seriesId);
  requestAnimationFrame(()=>root.current?.querySelector('.vt-series-return')?.focus({preventScroll:true}));
 }
 function clearSeries() {
  const previous=before.current;before.current=null;
  setSeriesId('');
  if(!previous){anchor.current={coordinate:0};return;}
  anchor.current={coordinate:previous.coordinate};restoreOpener.current=previous;
  setFocus(previous.focus);setMode(previous.mode);
 }
 function requestReturn(){if(ownState('series'))history.back();else clearSeries();}
 function pick(item,group,region) {
  const work=item.work;
  setSelected({...work,dateData:work.date,date:formatDate(work.date,item.periods),period:item.periods.map(p=>p.name).join('、')||group.name,region});
  history.pushState({anitime:'detail'},'');
 }
 function closeDetail(){if(ownState('detail'))history.back();else setSelected(null);}

 const actions=useRef({});
 actions.current={pick,series:enterSeries};
 live.current={width,remember,selected,seriesId,clearSeries};

 // System back (Android key, iOS edge swipe) closes the detail first, then leaves series focus.
 useEffect(()=>{
  const pop=()=>{const state=live.current;if(state.selected)setSelected(null);else if(state.seriesId)state.clearSeries();};
  addEventListener('popstate',pop);return()=>removeEventListener('popstate',pop);
 },[]);
 useEffect(()=>{if(!seriesId)return;const escape=e=>{if(e.key==='Escape'&&!live.current.selected){e.preventDefault();requestReturn();}};addEventListener('keydown',escape);return()=>removeEventListener('keydown',escape);},[seriesId]);
 useLayoutEffect(()=>{
  const previous=restoreOpener.current;if(!previous||seriesId)return;restoreOpener.current=null;
  const opener=previous.opener?.isConnected?previous.opener:root.current.querySelector(previous.openerKey?`[data-stack-key="${CSS.escape(previous.openerKey)}"],[data-work="${CSS.escape(previous.openerKey)}"]`:'none');
  opener?.focus({preventScroll:true});
 },[seriesId,mode,scale]);

 // Bottom-sheet detail: page scroll stays put underneath; pulling down from the top closes it.
 useEffect(()=>{
  if(!selected)return;
  document.documentElement.classList.add('vt-locked');
  const dialog=root.current.querySelector('dialog.detail');let start=null;
  const down=e=>{start=dialog.scrollTop<=0?e.touches[0].clientY:null;};
  const up=e=>{if(start!=null&&e.changedTouches[0].clientY-start>90)dialog.querySelector('.close')?.click();start=null;};
  dialog?.addEventListener('touchstart',down,{passive:true});dialog?.addEventListener('touchend',up);
  return()=>{document.documentElement.classList.remove('vt-locked');dialog?.removeEventListener('touchstart',down);dialog?.removeEventListener('touchend',up);};
 },[selected]);

 const seriesName=seriesId&&catalog.works.find(w=>w.seriesId===seriesId)?.seriesName;
 const muted=region=>!!seriesId&&!visible.regions.includes(region);
 const currentPeriod=scale.blocks.find(b=>!b.group.undated&&year>=b.group.start&&year<b.group.end)?.group;

 return <div className="mt-design-workspace vt-workspace"><main ref={root} className={'vt-root'+(mode==='overview'?' vt-overview':'')+(seriesId?' vt-series':'')}>
  <div className="vt-chrome" ref={chrome}>
   <header className="vt-header">
    <a className="brand" href="#" onClick={e=>{e.preventDefault();switchMode('overview');}}><img className="brand-wordmark" src={resolveAsset('/brand/anitime-transparent.svg')} alt="ANITIME" width="166" height="48"/></a>
    <ShareButton systemShare/>
    <div className="vt-controls"><SegmentedControlTabs value={mode} onValueChange={switchMode}/><nav className="region-tabs" aria-label="展開地域">{regions.map(region=><button key={region} aria-pressed={region===focus} disabled={muted(region)} onClick={()=>choose(region)}>{region}</button>)}</nav></div>
   </header>
   {seriesId?<div className="vt-context vt-series-bar"><a className="series-link vt-series-return" href="#timeline" onClick={e=>{e.preventDefault();requestReturn();}}>{backIcon}返回全部作品</a><span>/ {seriesName}系列</span></div>
    :mode==='detail'&&<div className="vt-context" aria-live="off"><span className="vt-year">{yearLabel(year)}</span><span className="vt-current">{currentPeriod?.name||focus}<small>{focus}{currentPeriod?.range?' · '+currentPeriod.range:''}</small></span></div>}
   <div className="vt-columns" aria-hidden="true">{mode==='overview'?regions.map((r,i)=><span key={r} className={r===focus?'is-focus':''} style={{left:V.spine+i*overview.column+16}}>{r}</span>)
    :<><span className="is-focus" style={{left:metrics.contentLeft}}>{focus}</span>{others.map((r,i)=><span key={r} className={muted(r)?'is-muted':''} style={{left:metrics.railLeft+i*(V.lane+V.laneGap)}}>{r}</span>)}</>}</div>
  </div>
  {mode==='overview'?<div className="vt-body" ref={body} style={{height:overview.height}}>
   <Spine ticks={overview.ticks} pos={overview.pos} height={overview.height}/>
   {regions.map((region,i)=><div key={region} className="vt-ov-lane" style={{left:V.spine+i*overview.column,width:overview.column}}>{overview.lanes[i].map(group=>{
    const top=group.undated?overview.undatedTop:overview.y(group.start);
    return <React.Fragment key={group.id}>{!group.undated&&<span className="vt-ov-band" style={{top,height:Math.max(44,overview.y(group.end)-top)}}/>}<button className="vt-ov-period" style={{top}} aria-label={`${region} ${group.name}，${group.works.length}部作品，定位時期`} onClick={()=>enter(region,group)}><h3><i/><span>{group.name}</span><small className="mt-count">{group.works.length}</small></h3></button></React.Fragment>;
   })}</div>)}
  </div>
  :<div className="vt-body" ref={body} style={{height:scale.height}}>
   <Spine ticks={scale.ticks} pos={scale.pos} height={scale.height} viewTop={viewTop}/>
   <RegionBlocks region={focus} blocks={scale.blocks} metrics={metrics} seriesId={seriesId} actions={actions}/>
   <div className="vt-rail" style={{left:metrics.railLeft,width:V.rail}}>{others.map((region,i)=>{
    const lane=bands[region],tops=railLabels(lane,viewTop);
    return <div key={region} className={'vt-lane'+(muted(region)?' is-muted':'')} style={{left:i*(V.lane+V.laneGap),width:V.lane}} inert={muted(region)||undefined}>{lane.map((band,j)=>{
     const current=band.top<=viewTop+120&&band.bottom>=viewTop;
     return <button key={band.group.id} className={'vt-band'+(current?' is-current':'')} style={{top:band.top,height:band.bottom-band.top}} aria-label={`${region} ${band.group.name}，${band.group.works.length}部作品，展開${region}`}
      onClick={()=>choose(region,year>=band.group.start&&year<band.group.end?year:band.group.start)}>
      <span className="vt-band-label" style={{top:tops[j]-band.top,height:railLabelHeight(band.group)}}><span>{band.group.name}</span><small>{band.group.works.length}</small></span>
     </button>;})}</div>;
   })}</div>
  </div>}
  <div className="vt-credit mt-credit">Made by <a href="https://github.com/rainnie-oh" target="_blank" rel="noopener noreferrer" aria-label="Rainnie 的 GitHub（在新分頁開啟）">Rainnie</a> with <span aria-label="愛">❤️</span></div>
  {selected&&<WorkDetail selected={selected} region={selected.region} onClose={closeDetail} activeSeries={seriesId} onFilter={seriesId?undefined:work=>enterSeries(work,selected.region,null)}/>}
 </main></div>;
}
