import React from 'react';

// The XMB's ribbon, drawn once as SVG bands like the PSP screen's waves (XmbRenderer's waves): each is a soft
// translucent band whose top edge carries a thin brighter line. A band is two periods wide and slides one period
// across, so its loop is seamless. [height, amplitude, thickness, opacity, seconds per loop (negative runs the other way)].
const PERIOD=1200, BANDS=[[140,34,56,.05,38],[148,26,30,.08,26],[158,18,16,.1,-20],[166,11,6,.15,15]];

function band([y,amp,thick],i){
 const top=[], bottom=[];
 for(let x=0;x<=PERIOD*2;x+=20){
  const a=x/PERIOD*Math.PI*2+i;
  const edge=y+Math.sin(a)*amp+Math.sin(a*2-i*2)*amp*.35;
  top.push([x,edge]);bottom.push([x,edge+thick*(.6+.4*Math.sin(a+i*1.7))]);
 }
 const line=points=>points.map(([x,y],j)=>`${j?'L':'M'}${x} ${y.toFixed(1)}`).join('');
 return {edge:line(top),fill:`${line(top)}${line(bottom.reverse()).replace('M','L')}Z`};
}
const ribbon=BANDS.map(band);

// A PSP-style boot screen: a plain dark backdrop with the XMB wave across the middle, and "Loading" beneath it.
export default function LoadingScreen({progress}) {
 const amount=Math.round(Math.min(1,Math.max(0,progress))*100);
 return <div className="loading-screen" role="progressbar" aria-label="Loading the PSP scene" aria-valuemin={0} aria-valuemax={100} aria-valuenow={amount}>
  <div className="loading-ribbon" aria-hidden="true">
   {ribbon.map(({edge,fill},i)=><svg key={i} viewBox={`0 0 ${PERIOD*2} 300`} preserveAspectRatio="none" style={{'--loop':`${Math.abs(BANDS[i][4])}s`,'--dir':BANDS[i][4]<0?'reverse':'normal'}}>
    <path className="band" d={fill} style={{opacity:BANDS[i][3]}}/>
    <path className="edge" d={edge} style={{opacity:BANDS[i][3]*2.2}}/>
   </svg>)}
  </div>
  <div className="loading-body">
   <p className="loading-title">Loading<span className="loading-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p>
   <p className="loading-note">Desktop is recommended for a better experience!</p>
  </div>
 </div>;
}
