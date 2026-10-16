import {useEffect,useState} from 'react';
import {VERTICAL_QUERY} from '../vertical.mjs';

// Layout follows the viewport, not the user agent, and updates on rotation or resize.
export function useVerticalLayout() {
 const [vertical,setVertical]=useState(()=>matchMedia(VERTICAL_QUERY).matches);
 useEffect(()=>{
  const query=matchMedia(VERTICAL_QUERY),update=()=>setVertical(query.matches);
  update();query.addEventListener('change',update);
  return()=>query.removeEventListener('change',update);
 },[]);
 return vertical;
}
