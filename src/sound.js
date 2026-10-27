// PS3 XMB menu sounds (public/sounds, from the XMB PS3 Icons + Sounds pack), played through Web Audio so quick
// repeats overlap cleanly. Nothing is created or fetched until the first sound, which always follows a click or key
// press, so browsers allow it. Muting is remembered per visitor.
const SOUNDS=['up','down','ok','cancel','unlock'];
const VOLUME=.45, STORAGE_KEY='xmb-muted';

let context=null, gain=null;
const buffers=new Map();

function load(name){
 if(!buffers.has(name))buffers.set(name,fetch(`/sounds/${name}.ogg`).then(response=>response.arrayBuffer()).then(data=>context.decodeAudioData(data)).catch(()=>null));
 return buffers.get(name);
}

let muted=(()=>{try{return localStorage.getItem(STORAGE_KEY)==='1';}catch{return false;}})();
export const isMuted=()=>muted;
export function setMuted(value){
 muted=value;
 try{localStorage.setItem(STORAGE_KEY,value?'1':'0');}catch{}
}

export function playSound(name){
 if(muted||!name||typeof AudioContext!=='function')return;
 if(!context){
  context=new AudioContext();gain=context.createGain();gain.gain.value=VOLUME;gain.connect(context.destination);
  SOUNDS.forEach(load);
 }
 if(context.state==='suspended')context.resume();
 load(name).then(buffer=>{
  if(!buffer||muted)return;
  const source=context.createBufferSource();source.buffer=buffer;source.connect(gain);source.start();
 });
}
