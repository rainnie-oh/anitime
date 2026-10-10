import React, {useRef} from 'react';
import {RiLayoutGridLine, RiTimeLine} from '@remixicon/react';
import './segmented-control-tabs.css';

const options = [
  {value: 'overview', label: '總覽', Icon: RiLayoutGridLine},
  {value: 'detail', label: '時間線', Icon: RiTimeLine},
];

export default function SegmentedControlTabs({value, onValueChange}) {
  const buttons = useRef([]);
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
  return <nav className="view-segments" aria-label="檢視模式" role="radiogroup">
    {options.map(({value: option, label, Icon}, index) => <button
      key={option} type="button" role="radio" aria-checked={value === option}
      tabIndex={value === option ? 0 : -1} ref={el => {buttons.current[index] = el;}}
      onClick={() => onValueChange(option)} onKeyDown={event => handleKeyDown(event, index)}>
      <Icon size={16} aria-hidden="true"/><span>{label}</span>
    </button>)}
  </nav>;
}
