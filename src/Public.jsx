import React, { useEffect, useRef, useState } from 'react';
import { App } from './App.jsx';
import { Multitrack } from './Multitrack.jsx';
import { Scene3D } from './scene3d/Scene3D.jsx';
import { VerticalTimeline } from './vertical/VerticalTimeline.jsx';
import { useVerticalLayout } from './vertical/use-vertical-layout.js';
import staticCatalog from './catalog.json';

export default function Public() {
  const [data, setData] = useState(staticCatalog);
  // Shared browsing position (year, region, mode) handed over when the layout orientation changes.
  const position = useRef(null);
  const vertical = useVerticalLayout();

  useEffect(() => {
    const load = () => {
      fetch('/api/public')
        .then((r) => {
          if (!r.ok) throw Error();
          return r.json();
        })
        .then(setData)
        .catch(() => {
          // Fall back gracefully to static catalog if /api/public is not available (e.g. static GitHub Pages)
          setData(staticCatalog);
        });
    };
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, []);

  if (!data) return <p style={{ padding: 50 }}>正在載入時間線…</p>;

  const search = new URLSearchParams(location.search);
  const isSingle = search.get('view') === 'single' || location.pathname.endsWith('/single');

  if (isSingle) return <App catalog={data} />;
  if (vertical) return <VerticalTimeline catalog={data} position={position} />;
  // 2.0: the 3D scene is the desktop default; ?view=2d keeps the 1.x multitrack for comparison.
  return search.get('view') === '2d' ? <Multitrack catalog={data} position={position} /> : <Scene3D catalog={data} position={position} />;
}
