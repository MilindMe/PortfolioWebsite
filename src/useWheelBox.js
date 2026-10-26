import {useEffect, useState} from 'react';
import {pageSize, stageInsets} from './layout';

function readBox(){
 const {width,height}=pageSize(), {left,top}=stageInsets(width,height);
 return left?{width:left,height}:{width,height:top};
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
