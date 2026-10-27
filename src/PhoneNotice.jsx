import React, {useEffect, useRef} from 'react';
import {Monitor, Smartphone} from 'lucide-react';

const STORAGE_KEY='phone-notice-seen';
function seen(){
 try{return sessionStorage.getItem(STORAGE_KEY)==='1';}catch{return false;}
}

// Shown once per visit on phones: the site is built for a desktop, but the PSP still works sideways on a phone with
// taps on its screen and buttons. Opens over the loading screen so it's read while the model downloads.
export default function PhoneNotice(){
 const dialog=useRef(null);
 useEffect(()=>{if(!seen())dialog.current?.showModal();},[]);
 function close(){
  try{sessionStorage.setItem(STORAGE_KEY,'1');}catch{}
  dialog.current?.close();
 }
 return <dialog ref={dialog} className="phone-notice" aria-labelledby="phone-notice-title" onCancel={close}>
  <Monitor className="phone-notice-icon" aria-hidden="true" strokeWidth={1.4}/>
  <h2 id="phone-notice-title">Best on a desktop</h2>
  <p>This portfolio is a 3D PSP you drive with a keyboard and mouse. For the full experience, visit on a laptop or desktop.</p>
  <p className="phone-notice-turn"><Smartphone aria-hidden="true" strokeWidth={1.6}/><span>On your phone? Turn it sideways and tap the PSP's screen and buttons to look around.</span></p>
  <button onClick={close} autoFocus>Continue on phone</button>
 </dialog>;
}
