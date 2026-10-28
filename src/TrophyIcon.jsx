import React, {useId} from 'react';
import {ARMS, CUP, CUP_SYMBOLS, HANDLES, METALS, ORB, ORB_SYMBOLS, STAND} from './trophyArt';

// A trophy in its grade's metal, as SVG: the same art the XMB's Trophies folder draws (see trophyArt.js).
export default function TrophyIcon({grade,locked=false,className}){
 const id=`trophy${useId().replace(/[^\w-]/g,'')}`, metal=METALS[locked?'locked':grade]??METALS.bronze, platinum=grade==='platinum';
 const stops=list=>list.map((color,i)=><stop key={i} offset={i/(list.length-1)} stopColor={color}/>);
 return <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
  <defs>
   <linearGradient id={`${id}m`} x1="0" y1="6" x2="0" y2="58" gradientUnits="userSpaceOnUse">{stops(metal.stops)}</linearGradient>
   {platinum&&<radialGradient id={`${id}o`} cx={ORB.cx} cy={ORB.cy} r={ORB.r} fx={ORB.cx-5} fy={ORB.cy-6} gradientUnits="userSpaceOnUse">{stops(metal.orb)}</radialGradient>}
  </defs>
  {platinum?<>
   {STAND.map(d=><path key={d} d={d} fill={`url(#${id}m)`}/>)}
   <circle cx={ORB.cx} cy={ORB.cy} r={ORB.r} fill={`url(#${id}o)`} style={locked?undefined:{filter:'drop-shadow(0 0 4px #5ccbf6)'}}/>
   {ARMS.map(d=><path key={d} d={d} fill={`url(#${id}m)`}/>)}
   <path d={ORB_SYMBOLS} fill="none" stroke={locked?metal.cut:'#ffffffe0'} strokeWidth="1.6"/>
  </>:<>
   <path d={HANDLES} fill="none" stroke={`url(#${id}m)`} strokeWidth="4" strokeLinecap="round"/>
   {CUP.map(d=><path key={d} d={d} fill={`url(#${id}m)`}/>)}
   <path d={CUP_SYMBOLS} fill="none" stroke={metal.cut} strokeWidth="1.6"/>
  </>}
 </svg>;
}
