import React from 'react';
import {categories} from '../../xmb/content';

// Black Ops II's in-game HUD around the PSP, over a dark tactical backdrop: the kill feed and scoreboard in the bottom
// left (its round is the page the PSP is on), and the scorestreaks and ammo counter on the right. Stays mounted so it
// can fade out; its animations pause while hidden.

// The kill feed, newest last: [attacker, victim]. The visitor's side is orange, like your team in the game.
const FEED=[['Milind','Bugs'],['Milind','Deadlines'],['Scope Creep','Milind'],['Milind','Scope Creep']];
// Scorestreaks, top to bottom, with the kills each needs; the first is ready and glows.
const STREAKS=[
 {label:'UAV',kills:3,path:'M12 2l1.6 7.2L22 12l-8.4 1.6-.6 5.4 3 2V22l-4-1-4 1v-1l3-2-.6-5.4L2 12l8.4-2.8z'},
 {label:'Hunter Killer',kills:5,path:'M12 3l3 7 6 2-6 2-3 7-3-7-6-2 6-2z'},
 {label:'Lightning Strike',kills:8,path:'M12 2c2 2 2.5 5 2.5 8v7l2.5 3v2l-5-2-5 2v-2l2.5-3v-7c0-3 .5-6 2.5-8z'},
];

// A sniper rifle in profile, for the kill feed.
function Rifle(){
 return <svg className="bo2-rifle" viewBox="0 0 40 10"><path d="M0 4h22l2-2h6v2h10v1.4H30l-1 1.6h-5l-2 3h-3l1-3h-6l-3 3H8l2-3H0z"/></svg>;
}

// A prestige-style emblem: a shield with two rank chevrons.
function Emblem(){
 return <svg className="bo2-emblem" viewBox="0 0 40 44">
  <path className="bo2-shield" d="M20 2l17 7v15c0 10-8 16-17 19C11 40 3 34 3 24V9z"/>
  <path className="bo2-chevrons" d="M10 17l10 6 10-6M10 25l10 6 10-6"/>
 </svg>;
}

export default function Bo2Backdrop({active,state}){
 const round=(state?.cat??0)+1;
 return <div className={`bo2-backdrop${active?' active':''}`} aria-hidden="true">
  <div className="bo2-grid"/>
  <div className="bo2-sweep"/>
  <div className="bo2-hud bo2-score">
   <ul className="bo2-feed">
    {FEED.map(([attacker,victim],i)=><li key={i} style={{'--i':i}}>
     <b className={attacker==='Milind'?'ours':''}>{attacker==='Milind'?'[MM]':''}{attacker}</b><Rifle/><span className={victim==='Milind'?'ours':''}>{victim}</span>
    </li>)}
   </ul>
   <p className="bo2-round">Round {round} of {categories.length}</p>
   <p className="bo2-status">Winning</p>
   <div className="bo2-tally">
    <Emblem/>
    <div><strong>75</strong><span>50</span></div>
   </div>
  </div>
  <div className="bo2-hud bo2-loadout">
   <ul className="bo2-streaks">
    {STREAKS.map((streak,i)=><li key={streak.label} className={i===0?'ready':''}>
     <svg viewBox="0 0 24 24"><path d={streak.path}/></svg>
     <small>{i===0?streak.label:streak.kills}</small>
    </li>)}
   </ul>
   <div className="bo2-ammo">
    <small>Ballista</small>
    <p><strong>5</strong><span>/ 25</span></p>
   </div>
  </div>
 </div>;
}
