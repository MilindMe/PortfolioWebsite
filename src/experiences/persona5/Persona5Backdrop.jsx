import React from 'react';

// Black stars and paper shards drifting over the red field: [left %, top %, size px, kind].
const pieces=[
 [8,14,46,'star'],[22,72,28,'shard'],[35,8,22,'star'],[48,84,54,'star'],[58,22,26,'shard'],[66,62,34,'star'],
 [76,10,58,'shard'],[84,44,24,'star'],[92,78,40,'shard'],[14,46,20,'shard'],[42,40,18,'star'],[96,18,30,'star'],
];

// The Persona 5 page behind the PSP: red field, halftone, slashes and drifting pieces. Stays mounted so it can fade
// out when the visitor goes back to a Classic theme.
export default function Persona5Backdrop({active}){
 return <div className={`p5-backdrop${active?' active':''}`} aria-hidden="true">
  {pieces.map(([x,y,size,kind],i)=><i key={i} className={`p5-piece ${kind}`}
   style={{'--x':`${x}%`,'--y':`${y}%`,'--s':`${size}px`,'--t':`${7+i%4*2}s`,'--delay':`${-i*1.3}s`,'--r':`${i%2?-1:1}*${90+i*15}deg`}}/>)}
 </div>;
}
