import * as THREE from 'three';
import {SCREEN_W, SCREEN_H} from './XmbRenderer';

const keys={
 ArrowLeft:'LEFT',a:'LEFT',ArrowRight:'RIGHT',d:'RIGHT',ArrowUp:'UP',w:'UP',ArrowDown:'DOWN',s:'DOWN',
 Enter:'CONFIRM',' ':'CONFIRM',x:'CONFIRM',Escape:'BACK',Backspace:'BACK',o:'BACK',
};
export function keyAction(key){
 return keys[key.length===1?key.toLowerCase():key]??null;
}

// Mesh names in psp.glb: D-pad up/right/down/left, then ✕, ○ and Home.
export const buttonActions={button1_low:'UP',button2_low:'RIGHT',button3_low:'DOWN',button4_low:'LEFT',button7_low:'CONFIRM',button6_low:'BACK',button9_low:'BACK'};
const buttonFor=Object.fromEntries(Object.entries(buttonActions).filter(([name])=>name!=='button9_low').map(([name,action])=>[action,name]));

// Taps, swipes and wheel on the PSP screen drive the XMB, and clicks on the PSP's buttons press them.
// Drags that start anywhere else still orbit the camera.
export function attachScreenInput({element,camera,controls,model,screen,xmb,act,invalidate,onHoverButton}){
 const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
 let gesture=null, wheel=0, wheelAt=0, hoverFrame=0;
 function pick(event){
  const rect=element.getBoundingClientRect();
  pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObject(model,true)[0];
  if(!hit)return null;
  if(hit.object===screen)return {screen:true,x:hit.uv.x*SCREEN_W,y:(1-hit.uv.y)*SCREEN_H};
  return buttonActions[hit.object.name]?{button:hit.object}:null;
 }
 function press(target){
  const mesh=typeof target==='string'?model.getObjectByName(buttonFor[target]??''):target;
  if(!mesh)return;
  mesh.position.z=-.012;invalidate();
  setTimeout(()=>{mesh.position.z=0;invalidate();},120);
 }
 function down(event){
  if(!event.isPrimary)return;
  const hit=pick(event);
  if(!hit)return;
  // Runs in the capture phase, before OrbitControls sees the event.
  controls.enabled=false;
  element.setPointerCapture(event.pointerId);
  if(hit.button){press(hit.button);act({type:buttonActions[hit.button.name]});return;}
  gesture={id:event.pointerId,clientX:event.clientX,clientY:event.clientY,x:hit.x,y:hit.y};
 }
 function up(event){
  if(event.pointerId!==gesture?.id){if(!controls.enabled&&event.isPrimary)controls.enabled=true;return;}
  const dx=event.clientX-gesture.clientX, dy=event.clientY-gesture.clientY, distance=Math.max(Math.abs(dx),Math.abs(dy));
  if(distance<6){const action=xmb.hitTest(gesture.x,gesture.y);if(action)act(action);}
  else if(distance>24)act({type:Math.abs(dx)>Math.abs(dy)?(dx<0?'RIGHT':'LEFT'):(dy<0?'DOWN':'UP')});
  gesture=null;controls.enabled=true;
 }
 function cancel(){gesture=null;controls.enabled=true;}
 function hover(event){
  if(gesture||event.pointerType!=='mouse'||event.buttons)return;
  cancelAnimationFrame(hoverFrame);
  hoverFrame=requestAnimationFrame(()=>{
   const hit=pick(event);
   element.style.cursor=hit?.button||(hit?.screen&&xmb.hitTest(hit.x,hit.y))?'pointer':'';
   xmb.setHover(hit?.screen?hit:null);
   onHoverButton?.(hit?.button?.name??null);
  });
 }
 function leave(){cancelAnimationFrame(hoverFrame);xmb.setHover(null);onHoverButton?.(null);}
 function scroll(event){
  if(!pick(event)?.screen)return;
  event.preventDefault();
  const now=performance.now();
  if(now-wheelAt>200)wheel=0;
  wheelAt=now;wheel+=event.deltaY;
  if(Math.abs(wheel)>=40){act({type:wheel>0?'DOWN':'UP'});wheel=0;}
 }
 element.addEventListener('pointerdown',down,{capture:true});
 element.addEventListener('pointerup',up);
 element.addEventListener('pointercancel',cancel);
 element.addEventListener('pointermove',hover);
 element.addEventListener('pointerleave',leave);
 element.addEventListener('wheel',scroll,{passive:false});
 return {
  press,
  dispose(){
   cancelAnimationFrame(hoverFrame);
   element.removeEventListener('pointerdown',down,{capture:true});
   element.removeEventListener('pointerup',up);
   element.removeEventListener('pointercancel',cancel);
   element.removeEventListener('pointermove',hover);
   element.removeEventListener('pointerleave',leave);
   element.removeEventListener('wheel',scroll);
  },
 };
}
