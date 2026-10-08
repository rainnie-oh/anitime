import React, { useEffect, useState } from 'react';
import { App } from './App.jsx';
import { Multitrack } from './Multitrack.jsx';
import staticCatalog from './catalog.json';

export default function Public() {
  const [data, setData] = useState(staticCatalog);

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

  return isSingle ? <App catalog={data} /> : <Multitrack catalog={data} />;
}
