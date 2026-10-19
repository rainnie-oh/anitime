import React,{useEffect,useMemo,useRef,useState} from 'react';
import SegmentedControlTabs from '../components/ui/segmented-control-tabs.jsx';
import ShareButton from '../components/ui/share-button.jsx';
import ProgressiveCover from '../components/ui/progressive-cover.jsx';
import {Detail3D} from './Detail3D.jsx';
import {resolveAsset} from '../asset.mjs';
import coverImages from '../cover-images.json';
import {formatDate} from '../date.mjs';
import {yearLabel} from '../multitrack.mjs';
import {reducedMotion} from '../motion.mjs';
import {sceneLayout,groundTicks,lens,nearestCard} from '../scene3d.mjs';
import './scene3d.css';

// Ground units: x runs along time, y is depth between rails, z rises off the ground.
// Every work is a portrait BD case: poster ratio 1:√2 (as 鬼滅之刃 / 20世紀電氣目錄), with a frosted plastic shell.
// LINE: the rail's time line runs just in front of the cases' footprint.
const LINE=52,RAIL_GAP=210,CARD_H=128,CARD_W=Math.round(CARD_H*.707),CASE_DEPTH=3,TILT=60,TURN=-50;
// Cards never rotate: nearness to the time cursor lifts them along Z, highest = selected.
const FOCUS={zoom:1.6,spread:340,width:110,far:.4,lift:64};

function toSelected(card){const {work,periods}=card.item;return {...work,dateData:work.date,date:formatDate(work.date,periods),period:periods.map(p=>p.name).join('、')||card.group.name,region:card.region};}

export function Scene3D({catalog,position}) {
 const layout=useMemo(()=>sceneLayout(catalog),[catalog]);
 const saved=position?.current;
 const regions=catalog.regions;
 const [focus,setFocus]=useState(()=>saved?.focus&&regions.includes(saved.focus)?saved.focus:regions.includes('日本')?'日本':regions[0]);
 const [mode,setMode]=useState(saved?.mode==='overview'?'overview':'detail');
 const [cursor,setCursor]=useState(()=>layout.axis.x(saved?.year??1868));
 const [detail,setDetail]=useState(null);
 const selected=detail?.selected;
 const [viewport,setViewport]=useState({w:1280,h:800});
 const stage=useRef(null),scrollTimer=useRef(0);
 const [scrolling,setScrolling]=useState(false);
 const rail=layout.rails.find(r=>r.region===focus);
 const active=mode==='detail'?nearestCard(rail.cards,cursor):null;
 const activeBand=active?.group??rail.bands.find(b=>cursor>=b.x0&&cursor<b.x1);

 useEffect(()=>{const el=stage.current;const observer=new ResizeObserver(()=>setViewport({w:el.clientWidth,h:el.clientHeight}));observer.observe(el);return()=>observer.disconnect();},[]);
 useEffect(()=>{if(position)position.current={year:active?Number(active.item.span?.[0]??active.group.start):activeBand?.start,focus,mode};},[active,activeBand,focus,mode]);

 // Focused region stands in front; the others recede behind it on the same years.
 const order=[...regions.filter(r=>r!==focus),focus];
 const railY=region=>order.indexOf(region)*RAIL_GAP;
 const depth=(regions.length-1)*RAIL_GAP;
 const lensOptions=mode==='detail'?FOCUS:{spread:0};
 const warp=x=>lens(x,cursor,lensOptions).x;

 // Orthographic camera: the projected axis length decides the overview zoom.
 const projected=Math.hypot(Math.cos(TURN*Math.PI/180),Math.cos(TILT*Math.PI/180)*Math.sin(TURN*Math.PI/180));
 const fit=Math.min(viewport.w*.86/(layout.axis.length*projected+120),1);
 const zoom=mode==='detail'?FOCUS.zoom:fit;
 const center=mode==='detail'?{x:warp(cursor),y:depth}:{x:layout.axis.length/2,y:depth/2};
 const camera=`scale(${zoom}) rotateX(${TILT}deg) rotateZ(${TURN}deg) translate(${-center.x}px,${-center.y}px)`;
 const ticks=groundTicks(layout.axis,90/zoom,warp);

 function move(delta){setCursor(c=>Math.max(0,Math.min(layout.axis.length,c+delta)));}
 function step(direction){const cards=rail.cards;const index=active?cards.indexOf(active):-1;const next=cards[Math.max(0,Math.min(cards.length-1,index+direction))];if(next)setCursor(next.x);}
 function enterBand(region,band){setFocus(region);setCursor(band.x0+(band.x1-band.x0)/2);setMode('detail');}
 function pick(card){if(mode==='overview'){setFocus(card.region);setCursor(card.x);setMode('detail');return;}if(card.region!==focus){setFocus(card.region);setCursor(card.x);return;}if(active?.key===card.key)openDetail(card);else setCursor(card.x);}
 function openDetail(card){setDetail({key:card.key,selected:toSelected(card)});}
 // Screen transform of a card's front face (camera · slot · stand-up · face), ending with a scale so a w×h box lands on it.
 function frontFace(card,w,h){
  const rect=stage.current.getBoundingClientRect(),l=lens(card.x,cursor,lensOptions),rise=mode==='detail'?l.rise:0;
  return `translate(${rect.left+rect.width/2}px,${rect.top+rect.height*.56}px) ${camera} translate3d(${l.x}px,${railY(card.region)}px,0px) translateZ(${FOCUS.lift*rise}px) rotateZ(90deg) rotateX(-90deg) translate3d(${-CARD_W/2}px,${-CARD_H}px,${CASE_DEPTH/2}px) scale(${CARD_W/w},${CARD_H/h})`;
 }

 useEffect(()=>{
  const el=stage.current;
  const wheel=e=>{if(mode!=='detail')return;e.preventDefault();setScrolling(true);clearTimeout(scrollTimer.current);scrollTimer.current=setTimeout(()=>setScrolling(false),180);move((Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)/zoom);};
  el.addEventListener('wheel',wheel,{passive:false});
  return()=>el.removeEventListener('wheel',wheel);
 },[mode,zoom,layout]);
 useEffect(()=>{
  const key=e=>{if(selected||e.target.closest?.('input,textarea,[role=tablist],[role=radiogroup],.share-control'))return;
   if(mode==='detail'&&e.key==='ArrowRight'){e.preventDefault();step(1);}
   if(mode==='detail'&&e.key==='ArrowLeft'){e.preventDefault();step(-1);}
   if(mode==='detail'&&e.key==='Escape'){e.preventDefault();setMode('overview');}};
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[mode,active,rail,selected]);

 const readoutYear=active?formatDate(active.item.work.date,active.item.periods):`${yearLabel(layout.axis.ticks[0])} — ${yearLabel(layout.axis.ticks.at(-1))}`;
 return <div className={'s3d s3d-'+mode+(detail?' s3d-reading':'')+(scrolling?' s3d-scrolling':'')+(reducedMotion()?' s3d-still':'')}>
  <header className="s3d-header">
   <img className="brand-wordmark" src={resolveAsset('/brand/anitime-transparent.svg')} alt="ANITIME" width="166" height="48"/>
   <div className="s3d-nav">
    <SegmentedControlTabs value={mode} onValueChange={setMode}/>
    <ShareButton/>
   </div>
  </header>
  <div className="s3d-readout" aria-live="polite">
   <span className="s3d-readout-period">{mode==='detail'?`${focus} · ${activeBand?.name??''}`:'總覽'}</span>
   <strong className="s3d-readout-year">{readoutYear}</strong>
   {active&&<div className="s3d-caption"><strong>{active.item.work.name}</strong><span>{active.item.work.medium}</span><button onClick={()=>openDetail(active)}>查看詳情</button></div>}
  </div>
  <div className="s3d-stage" ref={stage}>
   <div className="s3d-camera" style={{transform:camera,'--s3d-zoom':zoom}}>
    {ticks.map(t=><div key={t.year} className={'s3d-tick'+(mode==='detail'&&activeBand&&t.year>=activeBand.start&&t.year<activeBand.end?' is-current':'')} style={{transform:`translate3d(${t.x}px,${depth+LINE}px,0)`}}><i/><span>{t.label}</span></div>)}
    {layout.rails.map(r=>{
     const y=railY(r.region),front=r.region===focus;
     return <div key={r.region} className={'s3d-rail'+(front?' front':'')}>
      <div className="s3d-axis" style={{width:warp(layout.axis.length)-warp(0),transform:`translate3d(${warp(0)}px,${y+LINE}px,0)`}}/>
      <button className="s3d-rail-name" style={{transform:`translate3d(${warp(0)-60}px,${y+LINE}px,0)`}} onClick={()=>setFocus(r.region)}>{r.region}</button>
      {r.bands.map(b=>{const x0=warp(b.x0),x1=warp(b.x1);return <button key={b.id} className={'s3d-band'+(front&&activeBand?.id===b.id?' is-current':'')} disabled={!b.count} style={{width:Math.max(2,x1-x0-4),transform:`translate3d(${x0}px,${y+LINE}px,0)`}} onClick={()=>enterBand(r.region,b)}><span>{b.name}</span></button>;})}
      {r.cards.map(card=>{
       const l=front?lens(card.x,cursor,lensOptions):{x:warp(card.x),rise:0};
       const isActive=active?.key===card.key;
       const rise=front&&mode==='detail'?l.rise:0,lift=FOCUS.lift*rise;
       return <div key={card.key} className="s3d-slot" style={{transform:`translate3d(${l.x}px,${y}px,0)`}}>
        <div className="s3d-shadow" style={{height:CARD_W,top:-CARD_W/2,opacity:1-rise*.55,transform:`scale(${1+rise*.6},${1+rise*.12})`}}/>
        <button className={'s3d-card'+(isActive?' active':'')+(detail?.key===card.key?' is-open':'')} aria-current={isActive||undefined} style={{width:CARD_W,height:CARD_H,left:-CARD_W/2,top:-CARD_H,'--case-depth':CASE_DEPTH+'px','--cover':`url("${coverImages[card.item.work.image]?.preview??resolveAsset(card.item.work.image)}")`,transform:`translateZ(calc(${lift}px + var(--hover-lift,0px))) rotateZ(90deg) rotateX(-90deg)`}}
         tabIndex={front?0:-1} aria-label={`${card.item.work.name}，${formatDate(card.item.work.date,card.item.periods)}`} onClick={()=>pick(card)} onFocus={()=>front&&mode==='detail'&&setCursor(card.x)}>
         <span className="s3d-face s3d-front"><ProgressiveCover src={card.item.work.image} eager alt="" draggable="false"/></span>
         <span className="s3d-face s3d-back"/>
         <span className="s3d-edge s3d-edge-spine"/><span className="s3d-edge s3d-edge-open"/><span className="s3d-edge s3d-edge-top"/><span className="s3d-edge s3d-edge-bottom"/>
        </button>
       </div>;
      })}
     </div>;
    })}
   </div>
  </div>
  <aside className="s3d-corner">
   <div className="s3d-filters">
    <div className="s3d-index" role="group" aria-label={focus+'時期'}>
     {rail.bands.filter(b=>b.count).map(b=><button key={b.id} className={activeBand?.id===b.id&&mode==='detail'?'is-current':''} aria-current={activeBand?.id===b.id&&mode==='detail'||undefined} onClick={()=>enterBand(focus,b)}><span>{b.name}</span><sup>{b.count}</sup></button>)}
    </div>
    <SegmentedControlTabs label="地區" orientation="vertical" value={focus} onValueChange={setFocus} options={regions.map(r=>({value:r,label:r}))}/>
   </div>
  </aside>
  {detail&&(()=>{const card=rail.cards.find(c=>c.key===detail.key);return <Detail3D selected={detail.selected} from={(w,h)=>frontFace(card,w,h)} onClose={()=>setDetail(null)}/>;})()}
 </div>;
}
