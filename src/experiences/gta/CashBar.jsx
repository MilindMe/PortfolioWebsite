import React, {useEffect, useRef, useState} from 'react';
import {CASH_SPRITE} from './cashGlyphs';

// GTA V's cash readout, top right: "cash $1234" in Pricedown green. The font can't be served, so the text is built
// from a pre-rendered sprite of its glyphs (scripts/render-cash-sprite.py). Earnings slide in underneath as "+$500"
// while the total counts up to them. Stays mounted so it can fade out.
const SPRITE='/experiences/gta/cash.png';
const COUNT_FOR=900, GAIN_FOR=2600;
const STORAGE_KEY='gta-cash';

export function savedCash(){
 try{return Math.max(0,Number(localStorage.getItem(STORAGE_KEY))||0);}catch{return 0;}
}
export function saveCash(value){
 try{localStorage.setItem(STORAGE_KEY,String(value));}catch{}
}

// A line of sprite pieces: whole words where the sprite has them ("cash"), otherwise one glyph per character.
// Sizes are in em of the line's font-size, which is the sprite's height.
function Pricedown({text,className}){
 const {width,height,overlap,cells}=CASH_SPRITE, em=px=>`${px/height}em`;
 const pieces=text.split(' ').flatMap((word,i)=>[...(i?[' ']:[]),...(cells[word]?[word]:[...word])]);
 return <span className={`pricedown ${className}`} aria-hidden="true">
  {pieces.map((piece,i)=>piece===' '
   ?<i key={i} style={{width:em(overlap*3)}}/>
   :<i key={i} style={{width:em(cells[piece][1]),marginLeft:i?em(-overlap):0,backgroundSize:`${em(width)} 100%`,backgroundPosition:`${em(-cells[piece][0])} 0`}}/>)}
 </span>;
}

export default function CashBar({active,cash}){
 const [used,setUsed]=useState(active);
 if(active&&!used)setUsed(true);
 // shown counts towards cash; gains holds the recent "+$" lines, keyed so each one animates on its own.
 const [shown,setShown]=useState(cash), [gains,setGains]=useState([]);
 const last=useRef(cash), frame=useRef(0), timers=useRef(new Set());
 useEffect(()=>{
  const from=last.current;last.current=cash;
  if(cash<=from){setShown(cash);return;}
  const id=performance.now();
  setGains(list=>[...list.slice(-2),{id,amount:cash-from}]);
  const timer=setTimeout(()=>{timers.current.delete(timer);setGains(list=>list.filter(gain=>gain.id!==id));},GAIN_FOR);
  timers.current.add(timer);
  cancelAnimationFrame(frame.current);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){setShown(cash);return;}
  const start=performance.now(), step=now=>{
   const t=Math.min(1,(now-start)/COUNT_FOR);
   setShown(Math.round(from+(cash-from)*(1-Math.pow(1-t,3))));
   if(t<1)frame.current=requestAnimationFrame(step);
  };
  frame.current=requestAnimationFrame(step);
 },[cash]);
 useEffect(()=>()=>{cancelAnimationFrame(frame.current);timers.current.forEach(clearTimeout);},[]);
 if(!used)return null;
 return <div className={`gta-cash${active?' active':''}`} style={{'--sprite':`url(${SPRITE})`}}>
  <p className="sr-only" aria-live="polite">{active?`Cash: $${cash}`:''}</p>
  <Pricedown className="cash-total" text={`cash $${shown}`}/>
  {gains.map(gain=><Pricedown key={gain.id} className="cash-gain" text={`+$${gain.amount}`}/>)}
 </div>;
}
