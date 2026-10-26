import React from 'react';
import {ChevronLeft, ChevronRight, Code, Gamepad2, Globe, Image, Settings, User} from 'lucide-react';
import {categories} from '../../xmb/content';
import {currentItem} from '../../xmb/state';
import {useWheelBox} from '../../useWheelBox';
import {views} from '../../PageWheel';

// Lucide components for the category icon names in content.js.
const icons={code:Code,game:Gamepad2,photo:Image,user:User,network:Globe,settings:Settings};
const GAP=1.4, INNER=.56;

// Paths on a 200×200 view box; angles are degrees, 0 = up, clockwise.
const OUTER=96, point=(angle,radius)=>{const a=(angle-90)*Math.PI/180;return `${100+Math.cos(a)*radius} ${100+Math.sin(a)*radius}`;};
const arc=(from,to,radius)=>`M${point(from,radius)}A${radius} ${radius} 0 ${to-from>180?1:0} 1 ${point(to,radius)}`;
function sector(from,to){
 const inner=OUTER*INNER;
 return `${arc(from,to,OUTER)}L${point(to,inner)}A${inner} ${inner} 0 ${to-from>180?1:0} 0 ${point(from,inner)}Z`;
}

// A GTA-style weapon wheel of the XMB's pages, in the strip beside the PSP. Each page is a segment with its icon,
// the current one is lit, and the hub shows its name, its place and the focused item. Clicking a segment or an
// arrow jumps the PSP there. It pops in when it mounts, after delay ms.
export default function WeaponWheel({state,delay=0,onSelect}){
 const box=useWheelBox(), size=Math.min(box.width,box.height)*.88, step=360/categories.length, item=currentItem(state);
 const go=offset=>onSelect((state.cat+offset+categories.length)%categories.length);
 return <nav className="weapon-wheel" aria-label="Pages" style={{width:box.width,height:box.height,'--size':`${size}px`,'--delay':`${delay}ms`}}>
  <div className="weapon-ring">
   <svg viewBox="0 0 200 200" aria-hidden="true">
    <circle cx="100" cy="100" r="98" className="weapon-rim"/>
    {categories.map((category,i)=>{
     const from=i*step-step/2+GAP/2, to=(i+1)*step-step/2-GAP/2;
     return <g key={category.id} className={`weapon-sector${i===state.cat?' active':''}`}>
      <path d={sector(from,to)}/>
      {i===state.cat&&<path className="weapon-arc" d={arc(from,to,OUTER-1.5)}/>}
     </g>;
    })}
   </svg>
   {categories.map((category,i)=>{
    const Icon=icons[category.icon]??Settings, angle=(i*step-90)*Math.PI/180, radius=(1+INNER)/2*48;
    return <button key={category.id} className={`weapon-slot${i===state.cat?' active':''}`} onClick={()=>onSelect(i)} aria-current={i===state.cat?'page':undefined}
     style={{left:`${50+Math.cos(angle)*radius}%`,top:`${50+Math.sin(angle)*radius}%`}}>
     <Icon aria-hidden="true" strokeWidth={1.6}/><span>{category.label}</span>
    </button>;
   })}
   <div className="weapon-hub" key={`${state.cat}-${state.item[state.cat]}-${state.view}`}>
    <b>{categories[state.cat].label}</b>
    <span className="weapon-count">
     <button onClick={()=>go(-1)} aria-label="Previous page"><ChevronLeft strokeWidth={3}/></button>
     {state.cat+1} / {categories.length}
     <button onClick={()=>go(1)} aria-label="Next page"><ChevronRight strokeWidth={3}/></button>
    </span>
    <small aria-hidden="true">{views[state.view]??'Browsing'} · {item.label}</small>
   </div>
  </div>
 </nav>;
}
