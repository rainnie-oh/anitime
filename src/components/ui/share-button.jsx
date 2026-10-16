import React, {useEffect, useRef, useState, useId} from 'react';
import {RiShareLine, RiCheckLine, RiTwitterXLine, RiLink, RiMoreLine} from '@remixicon/react';
import './share-button.css';

export default function ShareButton({systemShare=false}) {
  const [open, setOpen] = useState(false);
  const root = useRef(null), trigger = useRef(null);
  const panelId = useId();
  const [state, setState] = useState('idle');
  const [url, setUrl] = useState('');
  const timer = useRef(null), busy = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    function dismiss(event) {
      if (!busy.current && !root.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
    };
  }, [open]);
  function toggle() {
    const link = new URL(window.location.href);
    link.search = '';
    link.hash = '';
    setUrl(link.href);
    setState('idle');
    setOpen(value => !value);
  }

  async function copy() {
    if (busy.current) return;
    busy.current = true;
    clearTimeout(timer.current);
    const link = new URL(window.location.href);
    link.search = '';
    link.hash = '';
    setUrl(link.href);
    let copied = false;
    try {
      await navigator.clipboard.writeText(link.href);
      copied = true;
    } catch {
      const previous = document.activeElement;
      const input = document.createElement('textarea');
      input.value = link.href;
      input.setAttribute('readonly', '');
      input.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.append(input);
      input.select();
      try { copied = document.execCommand('copy'); } catch { /* Show a selectable link below. */ }
      input.remove();
      previous?.focus({preventScroll:true});
    } finally {
      busy.current = false;
    }
    setState(copied ? 'copied' : 'error');
    if (copied) timer.current = setTimeout(() => setState('idle'), 2400);
  }

  const CopyIcon = state === 'copied' ? RiCheckLine : RiLink;
  const xUrl = `https://x.com/intent/tweet?${new URLSearchParams({text:'ANITIME 番年史 — 探索動畫故事中的歷史年代。', url})}`;
  return <div className="share-control" ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      trigger.current?.focus();
    }
  }}>
    <button ref={trigger} type="button" className="share-button" onClick={toggle}
      aria-label="分享" aria-expanded={open} aria-controls={panelId}>
      <RiShareLine size={16} aria-hidden="true"/><span>分享</span>
    </button>
    <span className="share-announcement" role="status">{state === 'copied' ? '連結已複製' : state === 'error' ? '無法自動複製，請選取下方連結複製。' : ''}</span>
    {open && <div className="share-panel" id={panelId} role="group" aria-label="分享選項">
      <button className="share-option" type="button" onClick={copy} data-copied={state === 'copied'}>
        <CopyIcon size={16} aria-hidden="true"/><span>{state === 'copied' ? '已複製' : '複製連結'}</span>
      </button>
      <a className="share-option" href={xUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
        <RiTwitterXLine size={16} aria-hidden="true"/><span>分享到 X</span>
      </a>
      {systemShare && typeof navigator.share === 'function' && <button className="share-option" type="button" onClick={() => {
        setOpen(false);
        navigator.share({title:'ANITIME 番年史', text:'ANITIME 番年史 — 探索動畫故事中的歷史年代。', url}).catch(() => {});
      }}>
        <RiMoreLine size={16} aria-hidden="true"/><span>更多…</span>
      </button>}
      {state === 'error' && <div className="share-fallback">
        <label htmlFor={`${panelId}-link`}>請手動複製連結</label>
        <input id={`${panelId}-link`} value={url} readOnly autoFocus onFocus={event => event.target.select()}/>
      </div>}
    </div>}
  </div>;
}
