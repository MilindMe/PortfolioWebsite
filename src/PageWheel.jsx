import React, {useEffect, useState} from 'react';
import {categories} from './xmb/content';
import {currentItem} from './xmb/state';
import {stageInsets} from './layout';
import {themeColors} from './xmb/themes';

function readBox(){
 const {left,top}=stageInsets(innerWidth,innerHeight);
 return left?{width:left,height:innerHeight}:{width:innerWidth,height:top};
}

// The strip of the page that stageInsets reserves for the wheel.
function useWheelBox(){
 const [box,setBox]=useState(readBox);
 useEffect(()=>{
  const update=()=>setBox(readBox());
  addEventListener('resize',update);
  return ()=>removeEventListener('resize',update);
 },[]);
 return box;
}

const views={menu:'Browsing',detail:'Reading',photo:'Viewing'};
// A Persona 5–style half wheel of the XMB's pages, pinned to the left edge. It spins the current page to the
// pointer and pops it; the tag underneath follows the focused item. Clicking a page jumps the PSP there.
export default function PageWheel({state,onSelect}){
 const box=useWheelBox(), radius=.92*Math.min(box.height*.4,box.width*.8), item=currentItem(state);
 const style={width:box.width,height:box.height,'--r':`${radius}px`,'--font':`${Math.round(radius*.19)}px`,'--active':state.cat,'--accent':themeColors(state.theme)[0]};
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
