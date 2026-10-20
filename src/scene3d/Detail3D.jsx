import React,{useLayoutEffect,useRef} from 'react';
import ProgressiveCover from '../components/ui/progressive-cover.jsx';
import {DetailArticle} from '../WorkDetail.jsx';
import {motionTiming,reducedMotion} from '../motion.mjs';

// Poster box in the left half at the poster's own ratio; the reading column takes the right half.
export function detailLayout(width,height,ratio=.707) {
 let h=Math.min(height-200,680),w=h*ratio;
 if(w>width*.42){w=width*.42;h=w/ratio;}
 return {w,h,x:Math.max(48,width*.27-w/2),y:(height-h)/2+12};
}

// The selected case leaves the timeline, turns its front to the screen and grows into the detail poster.
// `from(w,h)` returns the CSS transform that places a w×h box exactly on the card's front face.
// Opening swaps the case for the flat poster at once (the slow veil makes it read as 3D turning 2D).
// Closing cross-fades: near the card the poster dissolves into the real glass case (`onCase(visible)`),
// so it lands already as glass.
const HANDOFF=.4;
export function Detail3D({selected,from,onCase,onClose}) {
 const dialog=useRef(null),opener=useRef(document.activeElement),closeButton=useRef(null),poster=useRef(null),veil=useRef(null),article=useRef(null),animations=useRef([]),closing=useRef(false),handoff=useRef(0);
 const box=detailLayout(innerWidth,innerHeight,selected.width&&selected.height?selected.width/selected.height:.707);
 const to=`translate(${box.x}px,${box.y}px)`;
 useLayoutEffect(()=>{
  const node=dialog.current;node.showModal();closeButton.current.focus({preventScroll:true});
  if(!reducedMotion()){
   const t=motionTiming(node),fly=t.layout*1.6;
   animations.current=[
    veil.current.animate([{opacity:0},{opacity:1}],{duration:fly*.7,easing:t.easing}),
    poster.current.animate([{transform:from(box.w,box.h),borderRadius:'3px'},{transform:to,borderRadius:'6px'}],{duration:fly,easing:t.easing}),
    ...[...article.current.querySelector('article').children].map((el,i)=>el.animate(
     [{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],
     {duration:t.reveal,delay:fly*.55+Math.min(i,4)*t.stagger,easing:t.easing,fill:'backwards'}))];
  }
  onCase(false);
  return()=>{clearTimeout(handoff.current);animations.current.forEach(a=>a.cancel());node.close();if(opener.current?.isConnected)opener.current.focus({preventScroll:true});};
 },[]);
 function close(){
  if(closing.current)return;
  closing.current=true;
  if(reducedMotion()){onClose();return;}
  const t=motionTiming(dialog.current),back=t.layout*1.2-30; // 30ms brisker than a plain 1.2× layout (user-tuned)
  animations.current.forEach(a=>a.cancel());clearTimeout(handoff.current);
  const exit=poster.current.animate([{transform:to,borderRadius:'6px'},{transform:from(box.w,box.h),borderRadius:'3px'}],{duration:back,easing:t.easing,fill:'forwards'});
  // the veil clears first so the case reappears sharp, not behind the blur; then the poster dissolves into it
  handoff.current=setTimeout(()=>onCase(true),back*(1-HANDOFF));
  animations.current=[exit,
   poster.current.animate([{opacity:1,offset:0},{opacity:1,offset:1-HANDOFF},{opacity:0,offset:1}],{duration:back,easing:'linear',fill:'forwards'}),
   veil.current.animate([{opacity:1},{opacity:0}],{duration:back*(1-HANDOFF),easing:t.easing,fill:'forwards'}),
   article.current.animate([{opacity:1},{opacity:0}],{duration:t.exit,easing:t.easing,fill:'forwards'})];
  exit.onfinish=onClose;
 }
 return <dialog ref={dialog} className="detail s3d-detail" aria-label="作品詳情" onCancel={e=>{e.preventDefault();close();}}>
  <div className="s3d-detail-veil" ref={veil} onClick={close}/>
  <button className="close" aria-label="關閉詳情" onClick={close} ref={closeButton}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
  <div className="s3d-detail-poster" ref={poster} style={{width:box.w,height:box.h,transform:to}}>
   <ProgressiveCover key={selected.image} src={selected.image} original alt={selected.name+'官方宣傳圖'}/>
  </div>
  <div className="s3d-detail-info" ref={article} style={{left:Math.max(box.x+box.w+56,innerWidth*.5)}}>
   <DetailArticle selected={selected} region={selected.region}/>
  </div>
 </dialog>;
}
