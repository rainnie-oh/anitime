// Read the same tokens used by CSS so interaction timings cannot drift.
export const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
export function motionTiming(element=document.documentElement) {
 const style=getComputedStyle(element);
 // Production CSS minification rewrites 440ms as .44s, so honour the unit.
 const ms=(name,fallback)=>{const value=style.getPropertyValue('--ani-'+name).trim(),n=parseFloat(value);return Number.isFinite(n)?(/ms$/.test(value)?n:/s$/.test(value)?n*1000:n):fallback;};
 return {feedback:ms('feedback',140),switch:ms('switch',240),reveal:ms('reveal',360),layout:ms('layout',440),exit:ms('exit',180),stagger:ms('stagger',45),easing:style.getPropertyValue('--ani-ease').trim()||'cubic-bezier(.22,1,.36,1)'};
}
