import React, {useState,useRef,useEffect,useLayoutEffect} from 'react';
import './styles.css';
import works from './works.json';
const JP=[
['平安','794—1185',794,1185,'贵族文化与武家兴起','京都成为文化中心，宫廷文学与审美留下长久影响。',['源氏物语千年纪|UNKNOWN','平家物语|12世纪后半']],
['镰仓・南北朝','1185—1392',1185,1392,'从幕府到乱世','武家政权建立，朝廷与幕府之间的权力关系不断变化。',['擅长逃跑的殿下|1333年','犬王|14世纪']],
['战国','1467—1603',1467,1603,'群雄并起的时代','地方势力竞逐，战争与交流改变了日本社会。',['信长协奏曲|1549年起','犬夜叉|UNKNOWN','多罗罗|UNKNOWN']],
['江户','1603—1868',1603,1868,'武家秩序与市井生活','长期的幕府统治之下，城市文化发展；幕末迎来新的转折。',['薄樱鬼|幕末','甲贺忍法帖|1614年']],
['明治','1868—1912',1868,1912,'旧时代的余音，新时代的开端','明治维新后，社会制度与日常生活快速改变。武士、铁路与西洋文化在这里相遇。',['浪客剑心|1878年','黄金神威|日俄战争后']],
['大正','1912—1926',1912,1926,'传统与现代交叠','都市文化与新的生活方式兴起，传统社会仍延续着自己的节奏。',['鬼灭之刃|UNKNOWN','大正处女御伽话|1921年起','起风了|跨大正、昭和']],
['昭和','1926—1989',1926,1989,'战争、日常与重建','从战前都市到战争中的生活，再到战后的社会变化。',['萤火虫之墓|1945年','在这世界的角落|1930—1940年代','代号D机关|1937年起','来自虞美人之坡|1963年','坂道上的阿波罗|1966年起']],
['平成','1989—2019',1989,2019,'熟悉的现代，也成为历史','从1990年代的餐饮文化，到新世纪的都市生活。',['炒翻天|1995年','咒术回战|2018年']]];
const EU=[['维京时代','约793—1066',793,1066,'北海连接的世界','航海、贸易与征服，将北欧与英格兰联系在一起。',['冰海战记|11世纪初']],['中世纪晚期','1337—1487',1337,1487,'王权、教会与战争','百年战争与玫瑰战争，塑造法国和英格兰的权力格局。',['纯洁的玛利亚|百年战争末期','蔷薇王的葬列|15世纪后半']],['文艺复兴','约1400—1600',1400,1600,'画坊里的新世界','艺术、城市与赞助制度交织，佛罗伦萨成为重要文化中心。',['阿尔蒂|16世纪初']],['法国革命前后','1701—1799',1701,1799,'宫廷与街头','旧制度的阶层秩序，在社会变革中遭遇冲击。',['凡尔赛玫瑰|18世纪']],['19世纪','1801—1900',1801,1900,'工业城市中的相遇','英国维多利亚时代与法国城市生活并行发展。',['黑执事|19世纪末','忧国的莫里亚蒂|19世纪末','英国恋物语艾玛|19世纪末','异国迷宫的十字路口|19世纪后半']],['战间期','1918—1939',1918,1939,'两场战争之间','第一次世界大战之后，欧洲的社会与技术继续发生变化。',['红猪|1920年代','GOSICK|1924年']]];
const orientation=name=>works[name].height>works[name].width?'portrait':'landscape';
const Poster=({name})=><div className={"poster "+orientation(name)}><img src={works[name].image} alt={name+'官方宣传图'} loading="lazy" decoding="async"/></div>;
export function App(){
 const [region,R]=useState('日本'),[mode,M]=useState('detail'),[active,A]=useState(4),[progress,P]=useState(0),[selected,S]=useState(null);
 const rail=useRef(null),sections=useRef([]),dialog=useRef(null),anchor=useRef(4),focused=useRef(4),animation=useRef(0),wheelFrame=useRef(0),wheelTarget=useRef(0),tracking=useRef(0);
 const transitionFrom=useRef(null),modeAnimations=useRef([]),transitioning=useRef(false),rememberedScroll=useRef(null);
 const data=region==='日本'?JP:EU;
 const cancel=()=>{cancelAnimationFrame(animation.current);cancelAnimationFrame(wheelFrame.current);wheelFrame.current=0;};
 const closest=()=>{const el=rail.current;let best=0,distance=Infinity;sections.current.slice(0,data.length).forEach((section,i)=>{const d=Math.abs(section.offsetLeft-100-el.scrollLeft);if(d<distance){distance=d;best=i;}});return best;};
 const go=i=>{
  cancel();const el=rail.current;if(!el)return;const j=Math.max(0,Math.min(data.length-1,i));anchor.current=j;
  const target=Math.max(0,Math.min(el.scrollWidth-el.clientWidth,sections.current[j].offsetLeft-100));
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
  cancel();focused.current=anchor.current;A(anchor.current);
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
 },[region,mode]);
 useEffect(()=>()=>{modeAnimations.current.forEach(a=>a.cancel());cancel();cancelAnimationFrame(tracking.current);},[]);
 useEffect(()=>{if(selected){cancel();dialog.current?.showModal();}},[selected]);
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
 function change(r){modeAnimations.current.forEach(a=>a.cancel());transitionFrom.current=null;rememberedScroll.current=null;R(r);anchor.current=4;A(4);P(0);}
 function enter(i){anchor.current=i;A(i);if(mode==='detail')go(i);else {rememberedScroll.current=null;switchMode('detail');}}
 return <main><header><a href="#" className="brand" onClick={e=>{e.preventDefault();switchMode('overview')}}>ANITIME<span>番年史</span></a><nav aria-label="地区">{['日本','欧洲'].map(r=><button key={r} aria-pressed={r===region} onClick={()=>change(r)}>{r}</button>)}</nav><nav aria-label="模式"><button aria-pressed={mode==='overview'} onClick={()=>switchMode('overview')}>OVERVIEW</button><button aria-pressed={mode==='detail'} onClick={()=>switchMode('detail')}>TIMELINE</button></nav></header>
 <><div className={"rail "+(mode==='overview'?'collapsed':'')} ref={rail} onScroll={track}><div className="strip" style={mode==='overview'?{gridTemplateColumns:`repeat(${data.length}, minmax(0,1fr))`}:undefined}>{data.map((x,i)=><section ref={el=>sections.current[i]=el} key={x[0]} className={"period "+(i===active?"is-focused":"")} style={{...(mode==='detail'?{width:400+Math.min(5,x[6].length)*50}:{}),'--art-width':`${400+Math.min(5,x[6].length)*50}px`}}><div className="above"><div className="events"><div className="event"><i/><div><h3>{x[0]}{mode==='detail'&&<> / {x[4]}</>}</h3><p>{x[5]}</p></div></div></div><button className={'year '+(i===active?'active':'')} onClick={()=>enter(i)} aria-current={i===active?'true':undefined}>{x[2]}</button></div><div className="below" inert={mode==='overview'} tabIndex={mode==='overview'?-1:0} aria-label={x[0]+'作品列表'}><div className="connector"/><div className="works">{['portrait','landscape'].map(format=>{const entries=x[6].filter(entry=>orientation(entry.split('|')[0])===format);return entries.length>0&&<div className={'work-group '+format} key={format} style={{gridTemplateColumns:`repeat(${Math.min(format==='portrait'?3:2,entries.length)},minmax(0,1fr))`}}>{entries.map(entry=>{const [name,date]=entry.split('|');return <button className="work" key={name} aria-label={name} onClick={()=>S({name,date,period:x[0],...works[name]})}><div className={'crop '+format}><Poster name={name}/></div><div className="caption"><b>{name}</b></div></button>})}</div>})}</div></div></section>)}</div></div><div className="baseline" aria-hidden="true"/><footer><div className="arrows"><button aria-label="向前浏览" disabled={progress<=.001} onClick={()=>go(closest()-1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg></button><button aria-label="向后浏览" disabled={progress>=.999} onClick={()=>go(closest()+1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg></button></div><div className="progress"><div className="progress-track"><div style={{width:progress*100+'%'}}/></div><input aria-label="时间线进度" onPointerDown={cancel} type="range" min="0" max="1000" value={Math.round(progress*1000)} onChange={e=>{cancel();const el=rail.current;el.scrollTo({left:+e.target.value/1000*(el.scrollWidth-el.clientWidth),behavior:'instant'});}}/></div><div className="current"><span>{data[active]?.[2]}</span><span> — </span><span className={active===data.length-1?'':'future'}>{data.at(-1)[2]}</span></div></footer></>
 {selected&&<dialog ref={dialog} className="detail" onCancel={()=>S(null)} aria-label="作品详情"><button className="close" aria-label="关闭详情" onClick={()=>S(null)} autoFocus><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><div className="modal-grid"><div className="modal-image"><Poster name={selected.name}/></div><article><p className="meta">{region} / {selected.period}</p><h2>{selected.name}</h2><div className="red-rule"/><strong className="detail-year">{selected.date}</strong><p className="description">{selected.description}</p>{selected.date==='UNKNOWN'&&<p className="description">已知历史时期，具体年份 UNKNOWN。</p>}<dl><div><dt>MEDIUM</dt><dd>{selected.medium}</dd></div><div><dt>IMAGE SOURCE</dt><dd><a href={selected.source} target="_blank" rel="noreferrer">官方 / 发行方页面 ↗</a></dd></div></dl></article></div></dialog>}
 </main>;
}
