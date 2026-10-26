import React, {useState} from 'react';

// The Black Ops II key art behind the PSP. Stays mounted so it can fade out, and only asks for the image once the
// experience has been used.
export default function Bo2Backdrop({active}){
 const [used,setUsed]=useState(active);
 if(active&&!used)setUsed(true);
 return <div className={`bo2-backdrop${active?' active':''}${used?' used':''}`} aria-hidden="true"/>;
}
