import React, {useState,useRef,useEffect,useLayoutEffect} from 'react';
import './styles.css';
import './series.css';
import {filterSeries} from './series.mjs';
import {WorkDetail} from './WorkDetail.jsx';
import {formatDate,dateOrder} from './date.mjs';
import {resolveAsset} from './asset.mjs';
const orientation=(name,works)=>works[name].height>works[name].width?'portrait':'landscape';
const Poster=({name,works})=><div className={"poster "+orientation(name,works)}><img src={resolveAsset(works[name].image)} alt={name+'官方宣傳圖'} loading="lazy" decoding="async"/></div>;
export function App({catalog:fullCatalog}){
 const [seriesId,setSeriesId]=useState('');
 const catalog=filterSeries(fullCatalog,seriesId),beforeSeries=useRef(null),restoreSeries=useRef(null),filterOpener=useRef(null);
 const seriesName=fullCatalog.works.find(w=>w.seriesId===seriesId)?.seriesName;

 const works=Object.fromEntries(catalog.works.map(w=>[w.name,w]));
 const available=catalog.regions.filter(r=>catalog.works.some(w=>w.regions.includes(r)));
 const [region,R]=useState('日本'),[mode,M]=useState('detail'),[active,A]=useState(4),[progress,P]=useState(0),[selected,S]=useState(null);
 const rail=useRef(null),sections=useRef([]),anchor=useRef(4),focused=useRef(4),animation=useRef(0),wheelFrame=useRef(0),wheelTarget=useRef(0),tracking=useRef(0);
 const transitionFrom=useRef(null),modeAnimations=useRef([]),transitioning=useRef(false),rememberedScroll=useRef(null);
 const data=catalog.periods.filter(p=>p.region===region&&catalog.works.some(w=>w.periodIds.includes(p.id))).sort((a,b)=>a.start-b.start).map(p=>[p.name,p.range,p.start,p.end,p.title,p.description,catalog.works.filter(w=>w.periodIds.includes(p.id)).sort((a,b)=>dateOrder(a,p)-dateOrder(b,p)).map(w=>w.name+'|'+formatDate(w.date,catalog.periods.filter(p=>w.periodIds.includes(p.id))))]);
 function filterBySeries(work){
  if(seriesId===work.seriesId){S(null);clearSeries();return;}
  cancel();transitionFrom.current=null;
  if(!seriesId)beforeSeries.current={left:rail.current.scrollLeft,region,mode,active,opener:document.activeElement};
  const period=catalog.periods.find(p=>work.periodIds.includes(p.id)&&p.region===region);
  const nextPeriods=catalog.periods.filter(p=>p.region===region&&fullCatalog.works.some(w=>w.seriesId===work.seriesId&&w.periodIds.includes(p.id))).sort((a,b)=>a.start-b.start);
  anchor.current=Math.max(0,nextPeriods.findIndex(p=>p.id===period?.id));rememberedScroll.current=null;S(null);setSeriesId(work.seriesId);
  requestAnimationFrame(()=>filterOpener.current?.focus({preventScroll:true}));
 }
 function clearSeries(){const previous=beforeSeries.current;restoreSeries.current=previous;beforeSeries.current=null;setSeriesId('');if(previous){R(previous.region);M(previous.mode);anchor.current=previous.active;rememberedScroll.current=previous.left;}}
 const cancel=()=>{cancelAnimationFrame(animation.current);cancelAnimationFrame(wheelFrame.current);wheelFrame.current=0;};
 const closest=()=>{const el=rail.current;let best=0,distance=Infinity;sections.current.slice(0,data.length).forEach((section,i)=>{const d=Math.abs(section.offsetLeft-100-el.scrollLeft);if(d<distance){distance=d;best=i;}});return best;};
 const go=i=>{
  cancel();const el=rail.current;if(!el)return;const j=Math.max(0,Math.min(data.length-1,i));anchor.current=j;
  const target=Math.max(0,Math.min(el.scrollWidth-el.clientWidth,sections.current[j]?.offsetLeft-100));
  const from=el.scrollLeft;if(matchMedia('(prefers-reduced-motion: reduce)').matches){el.scrollLeft=target;return;}
  const start=performance.now();const step=now=>{const t=Math.min(1,(now-start)/320);el.scrollLeft=from+(target-from)*(1-Math.pow(1-t,3));if(t<1)animation.current=requestAnimationFrame(step);};animation.current=requestAnimationFrame(step);
 };
 function switchMode(next){
  if(next===mode)return;
  cancel();cancelAnimationFrame(tracking.current);
  transitionFrom.current=sections.current.slice(0,data.length).map(el=>({left:el.getBoundingClientRect().left,opacity:getComputedStyle(el.querySelector('.below')).opacity}));
  if(mode==='detail'&&!transitioning.current){rememberedScroll.current=rail.current.scrollLeft;anchor.current=focused.current;}
  modeAnimations.current.forEach(a=>a.cancel());transitioning.current=true;M(next);
 }
 useLayoutEffect(()=>{
  if(!rail.current)return;
  cancel();anchor.current=Math.min(anchor.current,Math.max(0,data.length-1));focused.current=anchor.current;A(anchor.current);
  rail.current.scrollLeft=mode==='detail'?(rememberedScroll.current??Math.max(0,(sections.current[anchor.current]?.offsetLeft||100)-100)):0;
  const from=transitionFrom.current;transitionFrom.current=null;
  if(!from||matchMedia('(prefers-reduced-motion: reduce)').matches){transitioning.current=false;return;}
  const opening=mode==='detail';
  modeAnimations.current=sections.current.slice(0,data.length).flatMap((el,i)=>{
   const dx=from[i].left-el.getBoundingClientRect().left;
   const move=el.animate([{transform:`translateX(${dx}px)`},{transform:'translateX(0)'}],{duration:620,delay:opening?0:150,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'});
   const fade=el.querySelector('.below').animate([{opacity:from[i].opacity,transform:opening?'translateY(8px)':'translateY(0)'},{opacity:opening?1:0,transform:opening?'translateY(0)':'translateY(-8px)'}],{duration:opening?360:150,delay:opening?160:0,easing:'ease-out',fill:'backwards'});
   return [move,fade];
  });
  const running=modeAnimations.current;
  Promise.allSettled(running.map(a=>a.finished)).then(()=>{if(modeAnimations.current===running){transitioning.current=false;}});
 },[region,mode,seriesId]);
 useLayoutEffect(()=>{if(restoreSeries.current){const previous=restoreSeries.current;restoreSeries.current=null;rail.current.scrollLeft=previous.left;if(previous.opener?.isConnected)previous.opener.focus({preventScroll:true});}},[seriesId]);
 useEffect(()=>()=>{modeAnimations.current.forEach(a=>a.cancel());cancel();cancelAnimationFrame(tracking.current);},[]);
 useEffect(()=>{if(selected)cancel();},[selected]);
 useEffect(()=>{
  const el=rail.current;if(!el||mode==='overview')return;
  const wheel=e=>{
   if(transitioning.current){e.preventDefault();return;}
   if(e.ctrlKey)return;
   const horizontal=Math.abs(e.deltaX)>Math.abs(e.deltaY)||e.shiftKey;
   const above=e.clientY<=el.getBoundingClientRect().top+347;
   if(horizontal){cancel();return;}
   if(!above)return;
   e.preventDefault();cancelAnimationFrame(animation.current);
   const unit=e.deltaMode===1?16:e.deltaMode===2?el.clientWidth:1;
   const delta=Math.max(-90,Math.min(90,e.deltaY*unit*.65));
   if(!wheelFrame.current)wheelTarget.current=el.scrollLeft;
   wheelTarget.current=Math.max(0,Math.min(el.scrollWidth-el.clientWidth,Math.max(el.scrollLeft-180,Math.min(el.scrollLeft+180,wheelTarget.current+delta))));
   if(matchMedia('(prefers-reduced-motion: reduce)').matches){el.scrollLeft=wheelTarget.current;return;}
   if(wheelFrame.current)return;
   let previous=performance.now();
   const glide=now=>{const dt=Math.min(40,now-previous);previous=now;const distance=wheelTarget.current-el.scrollLeft;
    if(Math.abs(distance)<.75){el.scrollLeft=wheelTarget.current;wheelFrame.current=0;return;}
    el.scrollLeft+=distance*(1-Math.exp(-dt/55));wheelFrame.current=requestAnimationFrame(glide);
   };wheelFrame.current=requestAnimationFrame(glide);
  };
  const pointer=()=>cancel();
  el.addEventListener('wheel',wheel,{passive:false});el.addEventListener('pointerdown',pointer);
  return()=>{el.removeEventListener('wheel',wheel);el.removeEventListener('pointerdown',pointer);cancel();};
 },[region,mode]);
 function track(){if(mode==='overview'||transitioning.current)return;cancelAnimationFrame(tracking.current);tracking.current=requestAnimationFrame(()=>{
  const el=rail.current;P(el.scrollLeft/Math.max(1,el.scrollWidth-el.clientWidth));const focusLine=el.scrollLeft+el.clientWidth*.4;
  let next=0;sections.current.slice(0,data.length).forEach((section,i)=>{if(section.offsetLeft<=focusLine)next=i;});
  const previous=focused.current;
  if(next!==previous){focused.current=next;A(next);}
 });}
 function change(r){modeAnimations.current.forEach(a=>a.cancel());transitionFrom.current=null;rememberedScroll.current=null;R(r);anchor.current=0;A(0);P(0);}
 function enter(i){anchor.current=i;A(i);if(mode==='detail')go(i);else {rememberedScroll.current=null;switchMode('detail');}}
 if(!data.length)return <main><div style={{padding:50}}><h1>ANITIME 番年史</h1><p>此地域暫無已發佈作品。</p>{available.map(r=><button key={r} onClick={()=>change(r)}>{r}　</button>)}</div></main>;
 return <main><header><a href="#" className="brand" onClick={e=>{e.preventDefault();switchMode('overview')}}><img className="brand-wordmark" src={resolveAsset('/brand/anitime-black.svg')} alt="ANITIME" width="166" height="48" /></a><nav aria-label="地區">{available.map(r=><button key={r} aria-pressed={r===region} onClick={()=>change(r)}>{r}</button>)}</nav><nav aria-label="模式"><button aria-pressed={mode==='overview'} onClick={()=>switchMode('overview')}>OVERVIEW</button><button aria-pressed={mode==='detail'} onClick={()=>switchMode('detail')}>TIMELINE</button></nav></header>
 <><div className={"rail "+(mode==='overview'?'collapsed':'')} ref={rail} onScroll={track}><div className="strip" style={mode==='overview'?{gridTemplateColumns:`repeat(${data.length}, minmax(0,1fr))`}:undefined}>{data.map((x,i)=><section ref={el=>sections.current[i]=el} key={x[0]} className={"period "+(i===active?"is-focused":"")} style={{...(mode==='detail'?{width:400+Math.min(5,x[6].length)*50}:{}),'--art-width':`${400+Math.min(5,x[6].length)*50}px`}}><div className="above"><div className="events"><div className="event"><i/><div><h3>{x[0]}{mode==='detail'&&<> / {x[4]}</>}</h3><p>{x[5]}</p></div></div></div><button className={'year '+(i===active?'active':'')} onClick={()=>enter(i)} aria-current={i===active?'true':undefined}>{x[2]}</button></div><div className="below" inert={mode==='overview'} tabIndex={mode==='overview'?-1:0} aria-label={x[0]+'作品列表'}><div className="connector"/><div className="works">{['portrait','landscape'].map(format=>{const entries=x[6].filter(entry=>orientation(entry.split('|')[0],works)===format);return entries.length>0&&<div className={'work-group '+format} key={format} style={{gridTemplateColumns:`repeat(${Math.min(format==='portrait'?3:2,entries.length)},minmax(0,1fr))`}}>{entries.map(entry=>{const [name,date]=entry.split('|');const work=works[name];return <article className={'work '+(work.cardStyle==='chapter'?'chapter':'')} key={name}><button className="single-work-open" aria-label={name} onClick={()=>S({...work,name,date,period:x[0]})}>{work.cardStyle!=='chapter'&&<div className={'crop '+format}><Poster name={name} works={works}/></div>}<div className="caption">{work.edition&&<small>{work.edition}</small>}<b>{name}</b><span>{date}</span></div></button>{work.seriesId&&<button className="series-link" aria-label={seriesId===work.seriesId?`返回全部作品：${work.name}`:`只看${work.seriesName}系列：${work.name}`} aria-pressed={seriesId===work.seriesId} onClick={()=>filterBySeries(work)}>{seriesId===work.seriesId?'返回':work.seriesName+'系列 ↗'}</button>}</article>})}</div>})}</div></div></section>)}</div></div><div className="baseline" aria-hidden="true"/><footer><div className="arrows"><button aria-label="向前瀏覽" disabled={progress<=.001} onClick={()=>go(closest()-1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><button aria-label="向後瀏覽" disabled={progress>=.999} onClick={()=>go(closest()+1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button></div><div className="progress"><div className="progress-track"><div style={{width:progress*100+'%'}}/></div><input aria-label="時間線進度" onPointerDown={cancel} type="range" min="0" max="1000" value={Math.round(progress*1000)} onChange={e=>{cancel();const el=rail.current;el.scrollTo({left:+e.target.value/1000*(el.scrollWidth-el.clientWidth),behavior:'instant'});}}/></div><div className="current"><span>{data[active]?.[2]}</span><span> — </span><span className={active===data.length-1?'':'future'}>{data.at(-1)?.[2]}</span></div></footer></>
 {selected&&<WorkDetail selected={selected} region={region} onClose={()=>S(null)} activeSeries={seriesId} onFilter={filterBySeries}/>}
 </main>;
}
