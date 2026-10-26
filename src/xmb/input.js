import * as THREE from 'three';
import {SCREEN_W, SCREEN_H} from './XmbRenderer';
import {ROTATION_LOCKED, localDelta, localPoint} from '../layout';

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

// Taps and swipes on the PSP screen drive the XMB, and clicks on the PSP's buttons press them. The mouse wheel is
// handled page-wide by the scene. Drags that start anywhere else orbit the camera, or, while rotation is locked,
// vertical swipes there step through the menu like the wheel does. act(action, origin) gets the world point it came from.
export function attachScreenInput({element,camera,controls,model,screen,xmb,act,invalidate,onHoverButton}){
 const raycaster=new THREE.Raycaster(), pointer=new THREE.Vector2();
 let gesture=null, hoverFrame=0;
 function pick(event){
  const {x,y}=localPoint(element,event.clientX,event.clientY);
  pointer.set(x*2-1,-y*2+1);
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObject(model,true)[0];
  if(!hit)return null;
  if(hit.object===screen)return {screen:true,x:hit.uv.x*SCREEN_W,y:(1-hit.uv.y)*SCREEN_H,point:hit.point};
  return buttonActions[hit.object.name]?{button:hit.object,point:centre(hit.object)}:null;
 }
 function centre(mesh){
  mesh.geometry.boundingBox??mesh.geometry.computeBoundingBox();
  return mesh.localToWorld(mesh.geometry.boundingBox.getCenter(new THREE.Vector3()));
 }
 // Where a key's action appears to come from: its PSP button, if it has one.
 function origin(type){
  const mesh=model.getObjectByName(buttonFor[type]??'');
  return mesh?centre(mesh):null;
 }
 function press(target){
  const mesh=typeof target==='string'?model.getObjectByName(buttonFor[target]??''):target;
  if(!mesh)return;
  // Quantized models give every node a transform, so press relative to where the button rests.
  const rest=mesh.userData.restZ??=mesh.position.z;
  mesh.position.z=rest-.012;invalidate();
  setTimeout(()=>{mesh.position.z=rest;invalidate();},120);
 }
 function down(event){
  if(!event.isPrimary)return;
  const hit=pick(event);
  if(!hit){
   if(ROTATION_LOCKED){element.setPointerCapture(event.pointerId);gesture={id:event.pointerId,clientX:event.clientX,clientY:event.clientY,page:true};}
   return;
  }
  // Runs in the capture phase, before OrbitControls sees the event.
  controls.enabled=false;
  element.setPointerCapture(event.pointerId);
  if(hit.button){press(hit.button);act({type:buttonActions[hit.button.name]},hit.point);return;}
  gesture={id:event.pointerId,clientX:event.clientX,clientY:event.clientY,x:hit.x,y:hit.y,point:hit.point};
 }
 function up(event){
  if(event.pointerId!==gesture?.id){if(!controls.enabled&&event.isPrimary)controls.enabled=true;return;}
  const {dx,dy}=localDelta(event.clientX-gesture.clientX,event.clientY-gesture.clientY), distance=Math.max(Math.abs(dx),Math.abs(dy));
  if(gesture.page){if(Math.abs(dy)>24&&Math.abs(dy)>Math.abs(dx))act({type:dy<0?'NEXT':'PREV'});}
  else if(distance<6){const action=xmb.hitTest(gesture.x,gesture.y);if(action)act(action,gesture.point);}
  else if(distance>24)act({type:Math.abs(dx)>Math.abs(dy)?(dx<0?'RIGHT':'LEFT'):(dy<0?'DOWN':'UP')},gesture.point);
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
 element.addEventListener('pointerdown',down,{capture:true});
 element.addEventListener('pointerup',up);
 element.addEventListener('pointercancel',cancel);
 element.addEventListener('pointermove',hover);
 element.addEventListener('pointerleave',leave);
 return {
  press,
  origin,
  dispose(){
   cancelAnimationFrame(hoverFrame);
   element.removeEventListener('pointerdown',down,{capture:true});
   element.removeEventListener('pointerup',up);
   element.removeEventListener('pointercancel',cancel);
   element.removeEventListener('pointermove',hover);
   element.removeEventListener('pointerleave',leave);
  },
 };
}
