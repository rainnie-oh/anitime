import React,{useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import SegmentedControlTabs from '../components/ui/segmented-control-tabs.jsx';
import ShareButton from '../components/ui/share-button.jsx';
import ProgressiveCover from '../components/ui/progressive-cover.jsx';
import {Detail3D} from './Detail3D.jsx';
import {resolveAsset} from '../asset.mjs';
import coverImages from '../cover-images.json';
import releaseYears from './release-years.json';
import {formatDate} from '../date.mjs';
import {yearLabel} from '../multitrack.mjs';
import {reducedMotion} from '../motion.mjs';
import {sceneLayout,groundTicks,lens,nearestCard,rulerMarks,densityProfiles,fitLabels} from '../scene3d.mjs';
import './scene3d.css';

// Ground units: x runs along time, y is depth between rails, z rises off the ground.
// LINE: the rail's time line runs just in front of the cases' footprint.
// Overview packs the rails together; Timeline spaces them a little wider, close enough to glimpse neighbouring
// regions and keep a region change a short hop across the floor.
// A long, gentle perspective so far rails and years converge naturally (orthographic read as diverging).
// ?flat restores the pure isometric camera for comparison.
const PERSPECTIVE=new URLSearchParams(location.search).has('flat')?0:2600;
// Camera aim point within the stage: nudged right and down from centre to leave breathing room for the top-left readout.
const CAM_X=.53,CAM_Y=.6;
// Overview spreads the rails further and shrinks the cases so no rail's cases hide the period names behind them.
const LINE=52,RAIL_GAP=280,RAIL_GAP_FAR=300,OVERVIEW_SCALE=.7,CARD_H=128,CARD_MAX_W=150,TILT=60,TURN=-50;
// Cards never rotate: nearness to the time cursor lifts them along Z, highest = selected.
// scale: the focused region's cases grow in place (others keep their size); the lens widens to match.
const FOCUS={zoom:1.6,spread:390,width:125,far:.4,lift:72,scale:1.15};

// Each case keeps its poster's own ratio, fitted inside a 150×128 box (portrait 1:√2 → 90×128, OGP landscape → 150×79).
function posterRatio(work){return work.width&&work.height?work.width/work.height:.707;}
function caseSize(work){const r=posterRatio(work);return r*CARD_H>CARD_MAX_W?{w:CARD_MAX_W,h:Math.round(CARD_MAX_W/r)}:{w:Math.round(CARD_H*r),h:CARD_H};}
// The case follows the format the work first came out on: VHS before 2000, Blu-ray after (unknown years count as BD).
const CARRIERS={vhs:{depth:9},bd:{depth:5}};
// Rounded corners: the four side strips stop short of each corner and a 45° facet closes the gap.
const CORNERS=['tl','tr','br','bl'];
function carrier(work){return (releaseYears[work.id]??2000)<2000?'vhs':'bd';}
// The time "line" is drawn only as ruler marks over a works-density silhouette (no continuous stroke).
const WAVE_H=64;
// A case's faces never change while scrolling; memoised so the wheel only re-renders positions.
const CaseFaces=React.memo(function CaseFaces({image}){
 return <>
  <span className="s3d-face s3d-front"><ProgressiveCover src={image} eager alt="" draggable="false"/></span>
  <span className="s3d-face s3d-back"/>
  <span className="s3d-edge s3d-edge-spine"/><span className="s3d-edge s3d-edge-open"/><span className="s3d-edge s3d-edge-top"/><span className="s3d-edge s3d-edge-bottom"/>
  {CORNERS.map(c=><span key={c} className={"s3d-edge s3d-bevel s3d-bevel-"+c}/>)}
 </>;
});
const LABEL_PX=14; // --text-label
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
 const gap=mode==='detail'?RAIL_GAP_FAR:RAIL_GAP;
 const railY=region=>regions.indexOf(region)*gap;
 const depth=(regions.length-1)*gap;
 const lensOptions=mode==='detail'?FOCUS:{spread:0};
 const warp=x=>lens(x,cursor,lensOptions).x;

 // Overview framing: zoom to fit the floor (all years × all rails, padded for names and cases), then aim the camera
 // so the floor's projected outline is centred in the free area. The camera's scale() is 2D — it shrinks x/y but
 // not depth — so the near (early-years, front-rail) corner looms large under perspective; re-aiming uses the
 // room that leaves on the far side instead of spilling off the bottom-left.
 const overview=useMemo(()=>{
  const t=TURN*Math.PI/180,a=TILT*Math.PI/180,L=layout.axis.length,D=(regions.length-1)*RAIL_GAP,pad=120;
  const box={left:-viewport.w*CAM_X+48,right:viewport.w*(1-CAM_X)-48,top:-(viewport.h*CAM_Y-190),bottom:viewport.h*(1-CAM_Y)-24};
  // region names (left of each rail) and period names (in front) keep their screen size, so their floor footprint grows as z shrinks
  const corners=z=>{const left=60+3*28/z,front=LINE+3*14/z;return [[-left,-pad],[L+pad,-pad],[-left,D+front],[L+pad,D+front]];};
  const project=(z,c)=>corners(z).map(([x,y])=>{
   const dx=x-c.x,dy=y-c.y,rx=dx*Math.cos(t)-dy*Math.sin(t),ry=dx*Math.sin(t)+dy*Math.cos(t);
   const s=PERSPECTIVE?PERSPECTIVE/Math.max(1,PERSPECTIVE-ry*Math.sin(a)):1;
   return [z*rx*s,z*ry*Math.cos(a)*s];
  });
  const bounds=pts=>({l:Math.min(...pts.map(p=>p[0])),r:Math.max(...pts.map(p=>p[0])),t:Math.min(...pts.map(p=>p[1])),b:Math.max(...pts.map(p=>p[1]))});
  let zoom=1,center={x:L/2,y:D/2};
  for(let i=0;i<6;i++){
   const b=bounds(project(zoom,center));
   zoom=Math.min(1,zoom*Math.min((box.right-box.left)/(b.r-b.l),(box.bottom-box.top)/(b.b-b.t)));
   const c=bounds(project(zoom,center)),sx=((c.l+c.r)-(box.left+box.right))/2/zoom,sy=((c.t+c.b)-(box.top+box.bottom))/2/(zoom*Math.cos(a));
   center={x:center.x+sx*Math.cos(t)+sy*Math.sin(t),y:center.y-sx*Math.sin(t)+sy*Math.cos(t)};
  }
  return {zoom,center};
 },[layout,regions.length,viewport.w,viewport.h]);
 const fit=overview.zoom;
 const zoom=mode==='detail'?FOCUS.zoom:fit;
 const center=mode==='detail'?{x:warp(cursor),y:railY(focus)}:overview.center;
 const camera=`scale(${zoom}) rotateX(${TILT}deg) rotateZ(${TURN}deg) translate(${-center.x}px,${-center.y}px)`;
 // Years and ruler marks only in Timeline; Overview reads as rails, silhouettes and period names.
 const ticks=mode==='detail'?groundTicks(layout.axis,90/zoom,warp):[];
 const caseScale=region=>mode==='overview'?OVERVIEW_SCALE:region===focus?FOCUS.scale:1;
 // ticks and marks float half a pixel above the floor so the silhouette never paints over them
 const tickY=(mode==='detail'?railY(focus):depth)+LINE;
 const squeeze=mode==='detail'?FOCUS.far:1;
 const marks=useMemo(()=>mode==='detail'?rulerMarks(layout.axis,{minSpacing:8/zoom,squeeze}):[],[layout,zoom,squeeze,mode]);
 const densities=useMemo(()=>densityProfiles(layout,{step:12}),[layout]);
 // Mirrored silhouette around the time line, sampled in axis units and bent by the same lens as the cases
 // (a gentle power curve so small clusters still register next to the busiest era).
 function wavePath(values,step){
  const top=[],bottom=[];
  values.forEach((v,i)=>{const x=warp(i*step).toFixed(1),h=(v**.6*WAVE_H+.6).toFixed(1);top.push(x+','+(-h));bottom.unshift(x+','+h);});
  return 'M'+top.join('L')+'L'+bottom.join('L')+'Z';
 }

 function move(delta){setCursor(c=>Math.max(0,Math.min(layout.axis.length,c+delta)));}
 function step(direction){const cards=rail.cards;const index=active?cards.indexOf(active):-1;const next=cards[Math.max(0,Math.min(cards.length-1,index+direction))];if(next)setCursor(next.x);}
 // Region change in Timeline: remember where the camera was, then fly (see the layout effect below).
 const [flight,setFlight]=useState(null);
 const cameraRef=useRef(null);
 function switchRegion(region){if(region===focus)return;if(mode==='detail'&&!reducedMotion())setFlight({camera,center});setFocus(region);}
 useLayoutEffect(()=>{
  if(!flight)return;
  const mid={x:(flight.center.x+center.x)/2,y:(flight.center.y+center.y)/2};
  // lift off (zoom out, look further down, bank a little), cross over, settle on the new rail
  const hops=Math.max(1,Math.round(Math.abs(center.y-flight.center.y)/RAIL_GAP_FAR));
  const hop=`scale(${zoom*(.86-.06*hops)}) rotateX(${TILT-4-2*hops}deg) rotateZ(${TURN+4+2*hops}deg) translate(${-mid.x}px,${-mid.y}px)`;
  const animation=cameraRef.current.animate([{transform:flight.camera},{transform:hop,offset:.5},{transform:camera}],{duration:620+180*hops,easing:'cubic-bezier(.65,0,.35,1)'});
  animation.onfinish=animation.oncancel=()=>setFlight(null);
  return()=>animation.cancel();
 },[flight]);
 function enterBand(region,band){setFocus(region);setCursor(band.x0+(band.x1-band.x0)/2);setMode('detail');}
 function pick(card){if(mode==='overview'){setFocus(card.region);setCursor(card.x);setMode('detail');return;}if(card.region!==focus){switchRegion(card.region);setCursor(card.x);return;}if(active?.key===card.key)openDetail(card);else setCursor(card.x);}
 function openDetail(card){setDetail({key:card.key,selected:toSelected(card)});}
 // Screen transform of a card's front face (camera · slot · stand-up · face), ending with a scale so a w×h box lands on it.
 function frontFace(card,w,h){
  const size=caseSize(card.item.work),rect=stage.current.getBoundingClientRect(),l=lens(card.x,cursor,lensOptions),rise=mode==='detail'?l.rise:0;
  return `translate(${rect.left+rect.width*CAM_X}px,${rect.top+rect.height*CAM_Y}px) ${PERSPECTIVE?`perspective(${PERSPECTIVE}px) `:''}${camera} translate3d(${l.x}px,${railY(card.region)}px,0px) translateZ(${FOCUS.lift*rise}px) rotateZ(90deg) rotateX(-90deg) scale(${caseScale(card.region)}) translate3d(${-size.w/2}px,${-size.h}px,${CARRIERS[carrier(card.item.work)].depth/2}px) scale(${size.w/w},${size.h/h})`;
 }

 // Wheel input is gathered and applied once per frame. No snapping when it settles: with a notched mouse wheel
 // every pause snapped back to a case and scrolling felt stepped.
 const pendingWheel=useRef(0),wheelFrame=useRef(0);
 useEffect(()=>{
  const el=stage.current;
  const wheel=e=>{
   if(mode!=='detail')return;e.preventDefault();setScrolling(true);
   pendingWheel.current+=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)/zoom;
   if(!wheelFrame.current)wheelFrame.current=requestAnimationFrame(()=>{wheelFrame.current=0;const delta=pendingWheel.current;pendingWheel.current=0;move(delta);});
   clearTimeout(scrollTimer.current);
   scrollTimer.current=setTimeout(()=>setScrolling(false),180);
  };
  el.addEventListener('wheel',wheel,{passive:false});
  return()=>{el.removeEventListener('wheel',wheel);cancelAnimationFrame(wheelFrame.current);wheelFrame.current=0;pendingWheel.current=0;clearTimeout(scrollTimer.current);};
 },[mode,zoom,layout]);
 useEffect(()=>{
  const key=e=>{if(selected||e.target.closest?.('input,textarea,[role=tablist],[role=radiogroup],.share-control'))return;
   if(mode==='detail'&&e.key==='ArrowRight'){e.preventDefault();step(1);}
   if(mode==='detail'&&e.key==='ArrowLeft'){e.preventDefault();step(-1);}
   if(mode==='detail'&&e.key==='Escape'){e.preventDefault();setMode('overview');}};
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[mode,active,rail,selected]);

 const readoutYear=active?formatDate(active.item.work.date,active.item.periods):`${yearLabel(layout.axis.ticks[0])} — ${yearLabel(layout.axis.ticks.at(-1))}`;
 return <div className={'s3d s3d-'+mode+(flight?' s3d-flying':'')+(detail?' s3d-reading':'')+(scrolling?' s3d-scrolling':'')+(reducedMotion()?' s3d-still':'')}>
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
  <div className="s3d-scrim" aria-hidden="true"/>
  <div className="s3d-stage" ref={stage} style={{perspective:PERSPECTIVE?PERSPECTIVE+'px':undefined,perspectiveOrigin:`${CAM_X*100}% ${CAM_Y*100}%`}}>
   <div className="s3d-camera" ref={cameraRef} style={{left:CAM_X*100+'%',top:CAM_Y*100+'%',transform:camera,'--s3d-zoom':zoom}}>
    {marks.map(m=><i key={m.year} className={'s3d-mark '+m.level+(mode==='detail'&&activeBand&&m.year>activeBand.start&&m.year<activeBand.end?' is-current':'')} style={{transform:`translate3d(${warp(m.x)}px,${tickY}px,.5px)`}}/>)}
    {ticks.map(t=><div key={t.year} className={'s3d-tick'+(mode==='detail'&&activeBand&&t.year>=activeBand.start&&t.year<activeBand.end?' is-current':'')} style={{transform:`translate3d(${t.x}px,${tickY}px,.5px)`}}><i/><span>{t.label}</span></div>)}
    {layout.rails.map(r=>{
     const y=railY(r.region),front=r.region===focus;
     return <div key={r.region} className={'s3d-rail'+(front?' front':'')+(regions.indexOf(r.region)>regions.indexOf(focus)?' ahead':'')}>
      <svg className="s3d-wave" style={{transform:`translate3d(0px,${y+LINE}px,0)`}} aria-hidden="true">{(()=>{const p=densities.find(d=>d.region===r.region),d=wavePath(p.values,p.step);return <path d={d} style={{d:`path("${d}")`}}/>;})()}</svg>      <button className="s3d-rail-name" style={{transform:`translate3d(${warp(0)-60}px,${y+LINE}px,0)`}} onClick={()=>switchRegion(r.region)}>{r.region}</button>
      {(()=>{
       // names that would collide keep just their square marker (the full name stays in aria-label)
       const warped=r.bands.map(b=>({...b,x0:warp(b.x0),x1:warp(b.x1)})),named=fitLabels(warped,LABEL_PX/zoom);
       return warped.map(b=><button key={b.id} className={'s3d-band'+(front&&mode==='detail'&&activeBand?.id===b.id?' is-current':'')} disabled={!b.count} aria-label={b.name} style={{width:Math.max(2,b.x1-b.x0-4),transform:`translate3d(${b.x0}px,${y+LINE}px,0)`}} onClick={()=>enterBand(r.region,b)}><span>{named.has(b.id)?b.name:''}</span></button>);
      })()}
      {r.cards.map(card=>{
       const l=front?lens(card.x,cursor,lensOptions):{x:warp(card.x),rise:0};
       const isActive=active?.key===card.key;
       const kind=carrier(card.item.work),size=caseSize(card.item.work),rise=front&&mode==='detail'?l.rise:0,lift=FOCUS.lift*rise,grow=caseScale(r.region);
       return <div key={card.key} className="s3d-slot" style={{transform:`translate3d(${l.x}px,${y}px,0)`}}>
        <div className="s3d-shadow" style={{height:size.w,top:-size.w/2,opacity:1-rise*.55,transform:`scale(${(1+rise*.6)*grow},${(1+rise*.12)*grow})`}}/>
        <button className={'s3d-card s3d-'+kind+(isActive?' active':'')+(detail?.key===card.key&&detail.hidden?' is-open':'')} aria-current={isActive||undefined} style={{width:size.w,height:size.h,left:-size.w/2,top:-size.h,'--case-depth':CARRIERS[kind].depth+'px','--cover':`url("${coverImages[card.item.work.image]?.preview??resolveAsset(card.item.work.image)}")`,transform:`translateZ(calc(${lift}px + var(--hover-lift,0px))) rotateZ(90deg) rotateX(-90deg) scale(${grow})`}}
         tabIndex={front?0:-1} aria-label={`${card.item.work.name}，${formatDate(card.item.work.date,card.item.periods)}`} onClick={()=>pick(card)} onFocus={()=>front&&mode==='detail'&&setCursor(card.x)}>
         <CaseFaces image={card.item.work.image}/>
        </button>
       </div>;
      })}
     </div>;
    })}
   </div>
  </div>
  <div className="s3d-credit mt-credit">Made by <a href="https://github.com/rainnie-oh" target="_blank" rel="noopener noreferrer" aria-label="Rainnie 的 GitHub（在新分頁開啟）">Rainnie</a> with <span aria-label="愛">❤️</span></div>
  <aside className="s3d-corner">
   <div className="s3d-filters">
    <div className="s3d-index" role="group" aria-label={focus+'時期'}>
     {rail.bands.filter(b=>b.count).map(b=><button key={b.id} className={activeBand?.id===b.id&&mode==='detail'?'is-current':''} aria-current={activeBand?.id===b.id&&mode==='detail'||undefined} onClick={()=>enterBand(focus,b)}><span>{b.name}</span><sup>{b.count}</sup></button>)}
    </div>
    <SegmentedControlTabs label="地區" orientation="vertical" value={focus} onValueChange={switchRegion} options={regions.map(r=>({value:r,label:r}))}/>
   </div>
  </aside>
  {detail&&(()=>{const card=rail.cards.find(c=>c.key===detail.key);return <Detail3D selected={detail.selected} from={(w,h)=>frontFace(card,w,h)} onCase={visible=>setDetail(d=>d&&{...d,hidden:!visible})} onClose={()=>setDetail(null)}/>;})()}
 </div>;
}
