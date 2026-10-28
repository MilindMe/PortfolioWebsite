import React, {useEffect, useRef, useState} from 'react';
import {ArrowRight, LockKeyhole, Mail, Plus, X} from 'lucide-react';
import {categories} from './xmb/content';
import {memoDraftUrl, validMemoCode} from './memo';

const recipient=categories.find(category=>category.id==='contact').items.find(item=>item.id==='email').link;

export default function LeaveMemo(){
 const dialog=useRef(null), trigger=useRef(null), codeInput=useRef(null), messageInput=useRef(null);
 const [code,setCode]=useState(''), [unlocked,setUnlocked]=useState(false), [error,setError]=useState('');
 const [name,setName]=useState(''), [message,setMessage]=useState('');
 useEffect(()=>{if(unlocked)messageInput.current?.focus();},[unlocked]);
 function open(){dialog.current.showModal();codeInput.current?.focus();}
 function close(){dialog.current.close();}
 function reset(){setUnlocked(false);setCode('');setError('');trigger.current?.focus();}
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
 return <>
  <button ref={trigger} className="leave-memo" onClick={open}><Plus size={18} strokeWidth={1.7} aria-hidden="true"/>Leave a memo!</button>
  <dialog ref={dialog} className="memo-dialog" aria-labelledby="memo-title" aria-describedby="memo-description" onClose={reset}
   onWheel={event=>event.stopPropagation()}>
   <button type="button" className="memo-close" onClick={close} aria-label="Close memo"><X size={19} aria-hidden="true"/></button>
   <div className="memo-symbol" aria-hidden="true">{unlocked?<Mail size={25} strokeWidth={1.4}/>:<LockKeyhole size={25} strokeWidth={1.4}/>}</div>
   <p className="memo-eyebrow">MEMORY CARD</p>
   <h2 id="memo-title">{unlocked?'A little moment to keep.':'Leave a memo!'}</h2>
   <p id="memo-description">{unlocked?'A story, a photo, an inside joke. Send me a memory and I’ll add it to the site.':'Got an invite? Enter your code to share a memory.'}</p>
   {!unlocked?<form onSubmit={unlock}>
    <label htmlFor="memo-code">Invite code</label>
    <input ref={codeInput} id="memo-code" type="password" value={code} onChange={event=>{setCode(event.target.value);setError('');}}
     autoComplete="off" spellCheck={false} autoCapitalize="characters" required autoFocus maxLength={80}
     aria-invalid={!!error} aria-describedby={error?'memo-error':undefined}/>
    {error&&<p id="memo-error" className="memo-error" role="alert">{error}</p>}
    <button type="submit" className="memo-submit">Unlock<ArrowRight size={17} aria-hidden="true"/></button>
   </form>:<form onSubmit={draft}>
    <label htmlFor="memo-name">Your name <span>(optional)</span></label>
    <input id="memo-name" autoComplete="name" maxLength={80} value={name} onChange={event=>setName(event.target.value)}/>
    <label htmlFor="memo-message">Your memory</label>
    <textarea ref={messageInput} id="memo-message" rows={5} required maxLength={2000} placeholder="Remember when…"
     value={message} onChange={event=>{setMessage(event.target.value);setError('');}} aria-invalid={!!error} aria-describedby="memo-handoff"/>
    {error&&<p className="memo-error" role="alert">{error}</p>}
    <p id="memo-handoff" className="memo-handoff">This opens an email draft. Add a photo there if you like, then send it my way.</p>
    <button type="submit" className="memo-submit"><Mail size={17} aria-hidden="true"/>Open email draft<ArrowRight size={17} aria-hidden="true"/></button>
   </form>}
  </dialog>
 </>;
}
