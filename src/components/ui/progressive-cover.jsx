import React, {useEffect, useRef, useState} from 'react';
import images from '../../cover-images.json';
import {resolveAsset} from '../../asset.mjs';
import './progressive-cover.css';

export default function ProgressiveCover({src, compact=false, original=false, eager=false, sizes, alt='', ...props}) {
  const image = useRef(null);
  const [nearby, setNearby] = useState(original || eager);
  const [loaded, setLoaded] = useState(false);
  const [fallback, setFallback] = useState(false);
  const asset = images[src];
  const [displayWidth, setDisplayWidth] = useState(compact ? 40 : 164);
  useEffect(() => {
    const element = image.current;
    const measure = () => {
      const width = Math.ceil(element.getBoundingClientRect().width);
      if (width > 0) setDisplayWidth(width);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (nearby) return;
    if (!('IntersectionObserver' in window)) {setNearby(true);return;}
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setNearby(true);
        observer.disconnect();
      }
    }, {rootMargin:'200px 400px'});
    observer.observe(image.current);
    return () => observer.disconnect();
  }, [nearby]);
  const fullSize = original || fallback || !asset;
  const highResolution = asset?.variants.filter(v => v.width >= 328);
  const variants = compact ? asset?.variants : highResolution?.length ? highResolution : asset?.variants.slice(-1);
  const target = fullSize ? resolveAsset(src) : resolveAsset(asset.variants.at(-1).src);
  return <img {...props} ref={image} alt={alt}
    className={'progressive-cover '+(loaded?'is-loaded':'is-loading')}
    src={nearby ? target : asset?.preview}
    srcSet={nearby && !fullSize ? variants.map(v => `${resolveAsset(v.src)} ${v.width}w`).join(', ') : undefined}
    sizes={fullSize ? undefined : sizes || `${displayWidth}px`}
    style={{backgroundImage:asset ? `url("${asset.preview}")` : undefined}}
    decoding="async"
    onLoad={event => {if (nearby && !event.currentTarget.currentSrc.startsWith('data:')) setLoaded(true);}}
    onError={() => {if (nearby && !fullSize) setFallback(true);}}
  />;
}
