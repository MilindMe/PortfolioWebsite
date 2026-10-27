import React from 'react';
import {categories} from './xmb/content';
import {currentItem} from './xmb/state';
import {themeColors} from './xmb/themes';
import {useWheelBox} from './useWheelBox';

export const views={menu:'Browsing',folder:'Browsing',detail:'Reading',photo:'Viewing'};
// A Persona 5–style half wheel of the XMB's pages, pinned to the left edge. It spins the current page to the
// pointer and pops it; the tag underneath follows the focused item. Clicking a page jumps the PSP there.
// It swings in from the left edge when it mounts, after delay ms.
export default function PageWheel({state,delay=0,onSelect}){
 const box=useWheelBox(), radius=.8*Math.min(box.height*.4,box.width*.8), item=currentItem(state);
 const style={width:box.width,height:box.height,'--r':`${radius}px`,'--font':`${Math.round(radius*.19)}px`,'--active':state.cat,'--accent':themeColors(state.theme)[0],'--delay':`${delay}ms`};
 return <nav className="page-wheel" aria-label="Pages" style={style}>
  <div className="wheel-disc" aria-hidden="true"/>
  <div className="wheel-marker" key={`marker-${state.cat}`} aria-hidden="true"><i/></div>
  <div className="wheel-spin">
   {categories.map((category,i)=>{
    const distance=Math.abs(i-state.cat);
    return <button key={category.id} className={`wheel-label${distance===0?' active':''}${distance>2?' far':''}`} style={{'--i':i,'--d':distance}}
     onClick={()=>onSelect(i)} aria-current={distance===0?'page':undefined} tabIndex={distance>2?-1:0}>
     <span>{category.label}</span>
    </button>;
   })}
  </div>
  <div className="wheel-tag" key={`tag-${state.cat}-${state.item[state.cat]}-${state.view}`} aria-hidden="true"><b>{views[state.view]}</b>{item.label}</div>
 </nav>;
}
