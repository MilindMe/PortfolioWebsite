import React from 'react';
import {categories} from '../../xmb/content';
import {useWheelBox} from '../../useWheelBox';

// The Black Ops II mode each page stands in for, shown under the current one. Games is Zombies, and lights up in the
// Ray Gun's green instead of the menu orange.
const modes={projects:'Campaign',games:'Zombies',memories:'Theater',about:'Combat Record',contact:'Party',settings:'Options'};
const ZOMBIES='games';
const MERIDIANS=[0,1,2,3,4,5];

// A slowly turning wireframe globe inside a sniper scope's reticle (Ballista / DSR mil-dots), like the hologram
// behind the main menu.
function Globe(){
 const ticks=[-36,-28,-20,-12,12,20,28,36];
 return <svg className="bo2-globe" viewBox="-60 -60 120 120" aria-hidden="true">
  <circle r="57" className="bo2-scope"/>
  <path className="bo2-cross" d="M-60 0H-48M48 0H60M0 -60V-48M0 48V60M-40 0H-8M8 0H40M0 -40V-8M0 8V40"/>
  {ticks.map(t=><g key={t} className="bo2-mil"><circle cx={t} r=".9"/><circle cy={t} r=".9"/></g>)}
  <g className="bo2-earth">
   <circle r="36"/>
   {[-24,-12,0,12,24].map(y=><ellipse key={y} cy={y} rx={Math.sqrt(36*36-y*y)} ry={Math.sqrt(36*36-y*y)*.18}/>)}
   {MERIDIANS.map(i=><ellipse key={i} rx="36" ry="36" className="bo2-meridian" style={{'--i':i}}/>)}
  </g>
 </svg>;
}

// Black Ops II's main menu in place of a wheel: the site's pages stacked under "Main Menu", the current one in
// orange between brackets with its Black Ops mode beneath. Clicking a page jumps the PSP there. Above the PSP (a wide,
// short strip) the pages sit in a row. It fades in when it mounts, after delay ms.
export default function MainMenu({state,delay=0,onSelect}){
 const box=useWheelBox(), current=categories[state.cat];
 return <nav className={`bo2-menu${box.width>box.height?' wide':''}${current.id===ZOMBIES?' zombies':''}`} aria-label="Pages"
  style={{width:box.width,height:box.height,'--delay':`${delay}ms`,'--globe':`${Math.min(box.width,box.height)*.86}px`}}>
  <Globe/>
  <div className="bo2-list">
   <h2>Main Menu</h2>
   <ul>
    {categories.map((category,i)=><li key={category.id}>
     <button className={i===state.cat?'active':''} onClick={()=>onSelect(i)} aria-current={i===state.cat?'page':undefined}>{category.label}</button>
     {i===state.cat&&<small aria-hidden="true">{modes[category.id]}</small>}
    </li>)}
   </ul>
  </div>
 </nav>;
}
