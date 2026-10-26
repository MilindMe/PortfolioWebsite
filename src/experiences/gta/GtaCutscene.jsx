import React from 'react';

// A one-shot San Andreas cutscene played when the theme is picked: letterbox bars close in and Big Smoke's line
// runs as an outlined subtitle, then everything clears. Purely decorative; it removes itself when it ends.
export default function GtaCutscene({onDone}){
 return <div className="gta-cutscene" aria-hidden="true" onAnimationEnd={event=>{if(event.target===event.currentTarget)onDone();}}>
  <i className="gta-bar top"/><i className="gta-bar bottom"/>
  <p className="gta-subtitle">All we had to do, was follow the damn train,<br/>CJ!</p>
 </div>;
}
