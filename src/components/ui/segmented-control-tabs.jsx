import React, {useRef,useLayoutEffect} from 'react';
import {RiLayoutGridLine, RiTimeLine} from '@remixicon/react';
import './segmented-control-tabs.css';

const viewOptions = [
  {value: 'overview', label: '總覽', Icon: RiLayoutGridLine},
  {value: 'detail', label: '時間線', Icon: RiTimeLine},
];

// Default options are the Overview / Timeline switch; other groups (e.g. regions) pass their own, icons optional.
export default function SegmentedControlTabs({value, onValueChange, options = viewOptions, label = '檢視模式', orientation = 'horizontal'}) {
  const vertical = orientation === 'vertical';
  const buttons = useRef([]),indicator=useRef(null),ready=useRef(false);
  useLayoutEffect(()=>{
    const update=(animate=false)=>{
      const button=buttons.current[options.findIndex(option=>option.value===value)];
      if(!button)return;
      indicator.current.style.transition=animate?'':'none';
      indicator.current.style.width=button.offsetWidth+'px';
      if(vertical)indicator.current.style.height=button.offsetHeight+'px';
      indicator.current.style.transform=vertical?`translate(${button.offsetLeft}px,${button.offsetTop}px)`:`translateX(${button.offsetLeft}px)`;
    };
    update(ready.current);ready.current=true;
    let initial=true;
    const observer=new ResizeObserver(()=>{if(initial){initial=false;return;}update(false);});
    buttons.current.forEach(button=>observer.observe(button));
    return()=>observer.disconnect();
  },[value]);
  function handleKeyDown(event, index) {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % options.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + options.length - 1) % options.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = options.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    buttons.current[next]?.focus();
    onValueChange(options[next].value);
  }
  return <nav className={"view-segments"+(vertical?" vertical":"")} aria-label={label} aria-orientation={orientation} role="radiogroup">
    <span ref={indicator} className="view-segment-indicator" aria-hidden="true"/>
    {options.map(({value: option, label: text, Icon}, index) => <button
      key={option} type="button" role="radio" aria-checked={value === option}
      tabIndex={value === option ? 0 : -1} ref={el => {buttons.current[index] = el;}}
      onClick={() => onValueChange(option)} onKeyDown={event => handleKeyDown(event, index)}>
      {Icon && <Icon size={16} aria-hidden="true"/>}<span>{text}</span>
    </button>)}
  </nav>;
}
