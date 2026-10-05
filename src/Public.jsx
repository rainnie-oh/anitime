import React,{useEffect,useState} from 'react';
import {App} from './App.jsx';
import {Multitrack} from './Multitrack.jsx';
export default function Public(){const [data,D]=useState(null),[error,E]=useState('');useEffect(()=>{const load=()=>fetch('/api/public').then(r=>{if(!r.ok)throw Error();return r.json();}).then(D).catch(()=>E('作品数据暂时无法加载，请刷新重试。'));load();window.addEventListener('focus',load);return()=>window.removeEventListener('focus',load);},[]);if(!data)return <p style={{padding:50}}>{error||'正在载入时间线…'}</p>;return location.pathname==='/multitrack'?<Multitrack catalog={data}/>:<App catalog={data}/>;}
