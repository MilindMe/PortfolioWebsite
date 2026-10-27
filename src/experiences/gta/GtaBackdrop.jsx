import React, {useState} from 'react';

// The Vice City page behind the PSP. Stays mounted so it can fade out, and only asks for the image once the
// experience has been used, so other visitors never download it.
export default function GtaBackdrop({active}){
 const [used,setUsed]=useState(active);
 if(active&&!used)setUsed(true);
 return <div className={`gta-backdrop${active?' active':''}${used?' used':''}`} aria-hidden="true"/>;
}
