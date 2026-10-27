// Timelines for the PSP when the page changes experience, in ms. Pure maths so the scene and the tests share it.
// 'enter' goes to a wheel experience (from the big centred PSP or another game): shake, a full flip with a dip and a hop, then the
// framing slides the PSP aside. 'exit' flips back the other way without the shake. frame is the 0→1 mix from the
// old framing to the new one.
export const DURATION={enter:1600,exit:1100};
// The flip's half-way point, when the screen faces away and the skin can swap unseen.
export const SKIN_AT={enter:700,exit:400};
// When the page wheel should pop out, as the PSP settles into its smaller frame.
export const WHEEL_AT=1000;

const clamp01=value=>Math.min(1,Math.max(0,value));
export const easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const span=(t,start,length)=>clamp01((t-start)/length);

export const REST={shakeX:0,shakeRot:0,rotY:0,scale:1,hop:0,frame:1};

export function pose(kind,t){
 if(t>=DURATION[kind])return REST;
 if(kind==='enter'){
  const decay=1-span(t,0,350), flip=span(t,300,800), arc=Math.sin(Math.PI*flip);
  return {
   shakeX:Math.sin(t*.09)*.06*decay,shakeRot:Math.sin(t*.11+1)*.07*decay,
   rotY:easeInOut(flip)*Math.PI*2,scale:1-.2*arc,hop:.18*arc,
   frame:easeInOut(span(t,600,750)),
  };
 }
 const flip=span(t,0,800), arc=Math.sin(Math.PI*flip);
 return {shakeX:0,shakeRot:0,rotY:-easeInOut(flip)*Math.PI*2,scale:1-.15*arc,hop:.12*arc,frame:easeInOut(span(t,150,800))};
}

// Which timeline moves between two experiences, or null when only the colours change.
export function transitionKind(from,to){
 if(from.id===to.id||(!from.wheel&&!to.wheel))return null;
 return to.wheel?'enter':'exit';
}
