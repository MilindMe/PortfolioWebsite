import React from 'react';

// A PSP-style boot screen: the XMB's flowing wave over a dark backdrop, with a thin progress line under "Loading".
export default function LoadingScreen({progress}) {
 const amount=Math.round(Math.min(1,Math.max(0,progress))*100);
 return <div className="loading-screen" role="progressbar" aria-label="Loading the PSP scene" aria-valuemin={0} aria-valuemax={100} aria-valuenow={amount}>
  <svg className="loading-wave" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
   <path d="M0 170 C200 110 400 230 600 165 S1000 105 1200 160"/>
   <path d="M0 185 C220 140 380 250 620 180 S980 130 1200 185"/>
   <path d="M0 150 C180 210 420 120 640 175 S1020 215 1200 140"/>
  </svg>
  <div className="loading-body">
   <p className="loading-title">Loading<span className="loading-dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span></p>
   <div className="loading-bar" aria-hidden="true"><span style={{width:`${amount}%`}}/></div>
   <p className="loading-note">Desktop is recommended for a better experience.</p>
  </div>
 </div>;
}
