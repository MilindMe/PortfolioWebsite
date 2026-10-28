import React, {useEffect, useState} from 'react';
import TrophyIcon from './TrophyIcon';
import {onTrophy} from './trophies';
import {playSound} from './sound';

// How long each card stays up, in ms; the CSS slide in and out fits inside it.
const SHOWN_FOR=4800;

// The PS4's "You have earned a trophy!" banner in the top-right corner. Trophies earned together queue up and show one at a time.
export default function TrophyToast(){
 const [queue,setQueue]=useState([]);
 useEffect(()=>onTrophy(trophy=>setQueue(list=>[...list,{...trophy,key:`${trophy.id}-${Date.now()}`}])),[]);
 const current=queue[0];
 useEffect(()=>{
  if(!current)return;
  playSound('unlock');
  const timer=setTimeout(()=>setQueue(list=>list.slice(1)),SHOWN_FOR);
  return ()=>clearTimeout(timer);
 },[current?.key]);
 return <div className="trophy-region" role="status" aria-live="polite">
  {current && <div key={current.key} className={`trophy-card grade-${current.grade}`} style={{'--shown':`${SHOWN_FOR}ms`}}>
   <div className="trophy-thumb" aria-hidden="true"><TrophyIcon grade={current.grade} /></div>
   <div className="trophy-text">
    <p className="trophy-title"><TrophyIcon className="trophy-glyph" grade={current.grade} />{current.title}</p>
    <p className="trophy-sub">You have earned a trophy!<span className="sr-only"> {current.description}</span></p>
   </div>
  </div>}
 </div>;
}
