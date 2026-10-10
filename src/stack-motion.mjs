const ease='cubic-bezier(.22,1,.36,1)';
export function capturePosters(root,seriesId){return [...root.querySelectorAll('[data-poster]')].map(el=>{const rect=el.getBoundingClientRect(),clip=el.closest('.mt-work-group').getBoundingClientRect();return {key:el.dataset.poster,series:el.dataset.posterSeries,src:el.src,rect,width:el.offsetWidth,height:el.offsetHeight,angle:Math.atan2(new DOMMatrix(getComputedStyle(el).transform).b,new DOMMatrix(getComputedStyle(el).transform).a)*180/Math.PI,visible:rect.right>0&&rect.left<innerWidth&&rect.bottom>clip.top&&rect.top<clip.bottom};}).filter(p=>p.visible&&(!seriesId||p.series===seriesId));}
export function animatePosters(root,from,opening){
 const animations=[],duration=opening?460:380;
 const targets=[...root.querySelectorAll('[data-poster]')];
 const after=capturePosters(root,from[0]?.series);
 function fly(source,target,opacity,el){
  const image=document.createElement('img');image.src=target.src;image.alt='';image.setAttribute('aria-hidden','true');
  const r=target.rect,s=source.rect;
  Object.assign(image.style,{position:'fixed',left:r.left+r.width/2-target.width/2+'px',top:r.top+r.height/2-target.height/2+'px',width:target.width+'px',height:target.height+'px',objectFit:'cover',pointerEvents:'none',zIndex:'30',outline:'1px solid #00000018',boxShadow:'0 3px 10px #00000012'});document.body.append(image);
  if(el)el.style.visibility='hidden';
  const animation=image.animate([{transform:`translate(${s.left+s.width/2-r.left-r.width/2}px,${s.top+s.height/2-r.top-r.height/2}px) rotate(${source.angle}deg) scale(${source.width/target.width},${source.height/target.height})`,opacity:opacity[0]},{transform:`rotate(${target.angle}deg)`,opacity:opacity[1]}],{duration,easing:ease});
  const cleanup=()=>{image.remove();if(el)el.style.visibility='';};animation.onfinish=cleanup;animation.oncancel=cleanup;const cancel=animation.cancel.bind(animation);animation.cancel=()=>{cleanup();cancel();};animations.push(animation);
 }
 for(const target of after){const exact=from.find(p=>p.key===target.key),source=exact||from.find(p=>p.series&&p.series===target.series);if(!source)continue;fly(source,target,[exact?1:0,1],targets.find(el=>el.dataset.poster===target.key));}
 if(!opening)for(const source of from){if(after.some(p=>p.key===source.key))continue;const target=after.find(p=>p.series&&p.series===source.series);if(target)fly(source,{...target,src:source.src},[1,0]);}
 for(const el of root.querySelectorAll('.mt-caption,.mt-stack-hint'))animations.push(el.animate([{opacity:0,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:300,easing:ease}));
 return animations;
}
