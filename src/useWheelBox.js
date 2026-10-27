import {useEffect, useState} from 'react';
import {stageInsets} from './layout';

function readBox(){
 const {left,top}=stageInsets(innerWidth,innerHeight);
 return left?{width:left,height:innerHeight}:{width:innerWidth,height:top};
}

// The strip of the page that stageInsets reserves for an experience's wheel, kept up to date on resize.
export function useWheelBox(){
 const [box,setBox]=useState(readBox);
 useEffect(()=>{
  const update=()=>setBox(readBox());
  addEventListener('resize',update);
  return ()=>removeEventListener('resize',update);
 },[]);
 return box;
}
