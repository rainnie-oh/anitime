import ProgressiveCover from './components/ui/progressive-cover.jsx';
import {resolveAsset} from './asset.mjs';
import React,{useLayoutEffect,useRef} from 'react';
import {motionTiming,reducedMotion} from './motion.mjs';
import './work-detail.css';
export function WorkDetail({selected,region,onClose,onFilter,activeSeries}) {
 const dialog=useRef(null),opener=useRef(document.activeElement),animations=useRef([]),closing=useRef(false);
 useLayoutEffect(()=>{
  const node=dialog.current;node.showModal();
  if(!reducedMotion()){
   const t=motionTiming(node);
   animations.current=[node.animate([{opacity:0},{opacity:1}],{duration:t.switch,easing:t.easing}),
    ...[node.querySelector('.modal-image'),...node.querySelector('article').children].map((el,i)=>el.animate(
     [{opacity:0,transform:`translateY(${i===0?12:8}px)`},{opacity:1,transform:'translateY(0)'}],
     {duration:t.reveal,delay:Math.min(i,3)*t.stagger,easing:t.easing,fill:'backwards'}))];
  }
  return()=>{animations.current.forEach(a=>a.cancel());node.close();if(opener.current?.isConnected)opener.current.focus({preventScroll:true});};
 },[]);
 function close(){
  if(closing.current)return;
  closing.current=true;
  if(reducedMotion()){onClose();return;}
  const node=dialog.current,t=motionTiming(node),opacity=getComputedStyle(node).opacity;
  animations.current.forEach(a=>a.cancel());
  const exit=node.animate([{opacity},{opacity:0}],{duration:t.exit,easing:t.easing,fill:'forwards'});
  animations.current=[exit];exit.onfinish=onClose;
 }
 const portrait=selected.height>selected.width;
 return <dialog ref={dialog} className="detail" onCancel={event=>{event.preventDefault();close();}} aria-label="作品詳情"><button className="close" aria-label="關閉詳情" onClick={close} autoFocus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><div className="modal-grid"><div className="modal-image"><div className={'poster '+(portrait?'portrait':'landscape')}><ProgressiveCover key={selected.image} src={selected.image} original alt={selected.name+'官方宣傳圖'}/></div></div><article><p className="meta">{region} / {selected.period}</p><h2>{selected.name}</h2><div className="red-rule"/><strong className="detail-year">{selected.date}</strong>{selected.edition&&<p className="detail-edition">{selected.edition}</p>}{selected.seriesId&&onFilter&&<button className="series-link" onClick={()=>onFilter(selected)}>{activeSeries===selected.seriesId?'返回':selected.seriesName+'系列 ↗'}</button>}<p className="description">{selected.description}</p>{selected.date==='UNKNOWN'&&<p className="description">具體年份 UNKNOWN。</p>}<p className="detail-medium">{selected.medium}</p>{selected.source&&<a className="official-cta" href={selected.source} target="_blank" rel="noreferrer"><span className="official-cta-labels"><span className="official-cta-label official-cta-label-out">訪問官網</span><span className="official-cta-label official-cta-label-in" aria-hidden="true">訪問官網</span></span><span className="official-cta-icon" aria-hidden="true"><svg viewBox="0 0 38 20">{[0,9,18,27].flatMap((offset,i)=>[[-6,3],[-2,6],[2,10],[-2,14],[-6,17]].map(([x,y],j)=><circle key={i+'-'+j} className={'arrow-dot arrow-dot-'+i} style={{'--dot-delay':((3-i)*35+Math.abs(2-j)*20)+'ms'}} cx={offset+x-1} cy={y} r=".85"/>))}</svg></span></a>}</article></div></dialog>;
}
