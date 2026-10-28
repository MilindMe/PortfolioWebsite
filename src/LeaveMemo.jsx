import React, {useEffect, useRef, useState} from 'react';
import {LockKeyhole, Mail} from 'lucide-react';
import {CircleGlyph, CrossGlyph} from './SystemGlyphs';
import {categories} from './xmb/content';
import {memoDraftUrl, validMemoCode} from './memo';

const recipient=categories.find(category=>category.id==='contact').items.find(item=>item.id==='email').link;

// Memories' Leave a memo item opens this as a PSP-style system dialog: an invite code first, then a memory that
// becomes an email draft. open is App's; closing it any way (○ Back, Esc) calls onClose. colors are the theme's
// [top, bottom], which tint the classic dialog; each game experience restyles it in styles.css.
export default function LeaveMemo({open,onClose,colors}){
 const dialog=useRef(null), codeInput=useRef(null), messageInput=useRef(null);
 const [code,setCode]=useState(''), [unlocked,setUnlocked]=useState(false), [error,setError]=useState('');
 const [name,setName]=useState(''), [message,setMessage]=useState('');
 useEffect(()=>{
  const element=dialog.current;
  if(open&&!element.open){element.showModal();codeInput.current?.focus();}
  else if(!open&&element.open)element.close();
 },[open]);
 useEffect(()=>{if(unlocked)messageInput.current?.focus();},[unlocked]);
 function close(){dialog.current.close();}
 function reset(){setUnlocked(false);setCode('');setError('');onClose();}
 function unlock(event){
  event.preventDefault();
  if(!validMemoCode(code)){setError('That code doesn’t match. Give it another try.');return;}
  setError('');setUnlocked(true);
 }
 function draft(event){
  event.preventDefault();
  if(!message.trim()){setError('Write a little memory first.');messageInput.current.focus();return;}
  setError('');
  const link=document.createElement('a');
  link.href=memoDraftUrl(recipient,name,message);link.click();
 }
 const back=<button type="button" className="memo-back" onClick={close}><CircleGlyph/>Back</button>;
 return <dialog ref={dialog} className="system-dialog" aria-labelledby="memo-title" aria-describedby="memo-description" onClose={reset}
  onWheel={event=>event.stopPropagation()} style={{'--dialog-a':colors[0],'--dialog-b':colors[1]}}>
  <div className="system-panel">
   <p className="system-eyebrow">{unlocked?<Mail size={13} strokeWidth={1.8} aria-hidden="true"/>:<LockKeyhole size={13} strokeWidth={1.8} aria-hidden="true"/>}Memory Card</p>
   <h2 id="memo-title">{unlocked?'A little moment to keep.':'Leave a memo'}</h2>
   <p id="memo-description" className="system-description">{unlocked?'A story, a photo, an inside joke. Send me a memory and I’ll add it to the site.':'Got an invite? Enter your code to share a memory.'}</p>
   {!unlocked?<form onSubmit={unlock}>
    <label htmlFor="memo-code">Invite code</label>
    <input ref={codeInput} id="memo-code" type="password" value={code} onChange={event=>{setCode(event.target.value);setError('');}}
     autoComplete="off" spellCheck={false} autoCapitalize="characters" required maxLength={80}
     aria-invalid={!!error} aria-describedby={error?'memo-error':undefined}/>
    {error&&<p id="memo-error" className="memo-error" role="alert">{error}</p>}
    <div className="system-actions">{back}<button type="submit" className="memo-submit"><CrossGlyph/>Unlock</button></div>
   </form>:<form onSubmit={draft}>
    <label htmlFor="memo-name">Your name <span>(optional)</span></label>
    <input id="memo-name" autoComplete="name" maxLength={80} value={name} onChange={event=>setName(event.target.value)}/>
    <label htmlFor="memo-message">Your memory</label>
    <textarea ref={messageInput} id="memo-message" rows={4} required maxLength={2000} placeholder="Remember when…"
     value={message} onChange={event=>{setMessage(event.target.value);setError('');}} aria-invalid={!!error} aria-describedby="memo-handoff"/>
    {error&&<p className="memo-error" role="alert">{error}</p>}
    <p id="memo-handoff" className="memo-handoff">This opens an email draft. Add a photo there if you like, then send it my way.</p>
    <div className="system-actions">{back}<button type="submit" className="memo-submit"><CrossGlyph/>Open email draft</button></div>
   </form>}
  </div>
 </dialog>;
}
