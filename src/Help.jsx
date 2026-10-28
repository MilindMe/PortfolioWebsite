import React, {useRef} from 'react';
import {CircleHelp, Palette} from 'lucide-react';
import {CircleGlyph} from './SystemGlyphs';
import TrophyIcon from './TrophyIcon';

// The ? in the bottom-right corner, with the other page controls. It opens a short help card in the same system
// dialog as Leave a memo, tinted with the theme's [top, bottom] colours.
export default function Help({colors}){
 const dialog=useRef(null);
 return <>
  <button className="help-toggle" onClick={()=>dialog.current.showModal()} aria-label="Help" title="Help"><CircleHelp size={18} strokeWidth={1.5}/></button>
  <dialog ref={dialog} className="system-dialog help-dialog" aria-labelledby="help-title" onWheel={event=>event.stopPropagation()}
   style={{'--dialog-a':colors[0],'--dialog-b':colors[1]}}>
   <div className="system-panel">
    <p className="system-eyebrow"><CircleHelp size={13} strokeWidth={1.8} aria-hidden="true"/>Help</p>
    <h2 id="help-title">How to explore</h2>
    <p className="help-controls"><b>Controls</b> Arrow keys or WASD to move, or click the PSP’s buttons.</p>
    <ul className="help-tips">
     <li><TrophyIcon grade="platinum" className="help-icon"/>You can collect trophies by exploring this website. Collect 7 and get the Platinum Trophy!</li>
     <li><Palette className="help-icon" strokeWidth={1.5} aria-hidden="true"/>Explore different experiences by switching themes in Settings.</li>
    </ul>
    <div className="system-actions"><button type="button" onClick={()=>dialog.current.close()} autoFocus><CircleGlyph/>Back</button></div>
   </div>
  </dialog>
 </>;
}
