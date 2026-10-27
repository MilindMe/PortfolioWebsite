import React from 'react';

// A one-shot Persona 5 cut-in played while the PSP flips: a slashed black band slams across with the title, then
// clears. Purely decorative; it removes itself when its animation ends.
export default function CallingCard({onDone}){
 return <div className="p5-card" aria-hidden="true" onAnimationEnd={event=>{if(event.target===event.currentTarget)onDone();}}>
  <i className="p5-card-slash"/>
  <b className="p5-card-title"><span>Take</span> <span>your</span> <span>heart</span></b>
 </div>;
}
