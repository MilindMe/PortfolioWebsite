import React from 'react';

export default function LoadingScreen({progress}) {
 const amount=Math.round(Math.min(1,Math.max(0,progress))*100);
 return <div className="loading-screen" role="progressbar" aria-label="Loading the PSP scene" aria-valuemin={0} aria-valuemax={100} aria-valuenow={amount}>
  <svg viewBox="0 0 120 220" aria-hidden="true">
   <defs><clipPath id="guitar-fill"><rect x="0" y={220-amount*2.2} width="120" height={amount*2.2}/></clipPath></defs>
   <path className="loading-outline" d="M51 12 Q60 7 69 12 L67 42 L64 46 L64 105 C83 96 98 111 89 130 C83 143 105 151 103 174 C101 201 81 211 60 211 C39 211 19 201 17 174 C15 151 37 143 31 130 C22 111 37 96 56 105 L56 46 L53 42 Z"/>
   <path className="loading-fill" clipPath="url(#guitar-fill)" d="M51 12 Q60 7 69 12 L67 42 L64 46 L64 105 C83 96 98 111 89 130 C83 143 105 151 103 174 C101 201 81 211 60 211 C39 211 19 201 17 174 C15 151 37 143 31 130 C22 111 37 96 56 105 L56 46 L53 42 Z"/>
   <circle cx="60" cy="148" r="12" className="loading-hole"/><path d="M48 184 H72 M58 44 V180 M62 44 V180" className="loading-strings"/>
  </svg>
 </div>;
}
