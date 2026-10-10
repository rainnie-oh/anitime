import {useLayoutEffect} from 'react';
import {motionTiming,reducedMotion} from './motion.mjs';

// One editorial entrance per mount; ordinary navigation never replays it.
export function useTimelineEntrance(root) {
 useLayoutEffect(()=>{
  const element=root.current;
  if(!element||reducedMotion())return;
  const timing=motionTiming(element),animations=[];
  const play=(target,frames,delay,duration=timing.layout)=>{
   if(target)animations.push(target.animate(frames,{duration,delay,easing:timing.easing,fill:'backwards'}));
  };
  // Reveal the rule and its years without stretching the type or historical coordinates.
  play(element.querySelector('.mt-ruler'),[
   {clipPath:'inset(0 100% 0 0)',opacity:0},
   {clipPath:'inset(0 0% 0 0)',opacity:1},
  ],0,timing.layout+timing.stagger*2);
  element.querySelectorAll('.mt-lane').forEach((lane,index)=>{
   play(lane,[{opacity:0,transform:'translateY(-16px)'},{opacity:1,transform:'translateY(0)'}],timing.feedback+index*timing.stagger*2);
  });
  play(element.querySelector('.mt-footer'),[{opacity:0},{opacity:1}],timing.reveal,timing.switch);
  const preference=matchMedia('(prefers-reduced-motion: reduce)');
  const stop=()=>animations.forEach(animation=>animation.cancel());
  const inputs=['pointerdown','wheel','keydown','touchstart'];
  inputs.forEach(type=>element.addEventListener(type,stop,{capture:true,passive:true}));
  preference.addEventListener('change',stop);
  return()=>{
   stop();
   inputs.forEach(type=>element.removeEventListener(type,stop,true));
   preference.removeEventListener('change',stop);
  };
 },[root]);
}
