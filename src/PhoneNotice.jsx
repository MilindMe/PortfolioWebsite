import React, {useEffect, useRef} from 'react';
import {Smartphone} from 'lucide-react';
import {CrossGlyph} from './SystemGlyphs';

const STORAGE_KEY='phone-notice-seen';
function seen(){
 try{return sessionStorage.getItem(STORAGE_KEY)==='1';}catch{return false;}
}

// A PSP-style welcome on phones, shown once per session while the model loads.
// The rotating icon explains how to hold the phone; reduced motion keeps it still.
export default function PhoneNotice(){
 const dialog=useRef(null);
 useEffect(()=>{if(!seen())dialog.current?.showModal();},[]);
 function close(){
  try{sessionStorage.setItem(STORAGE_KEY,'1');}catch{}
  dialog.current?.close();
 }
 return <dialog ref={dialog} className="system-dialog phone-notice" aria-label="Welcome" aria-describedby="phone-notice-message" onCancel={close}>
  <div className="system-panel">
   <Smartphone className="phone-notice-icon" aria-hidden="true" strokeWidth={1.4}/>
   <p id="phone-notice-message" className="phone-notice-message">Turn on Rotation Lock, turn your phone sideways and enjoy - Milind M</p>
   <div className="system-actions"><button onClick={close} autoFocus><CrossGlyph/>Continue</button></div>
  </div>
 </dialog>;
}
