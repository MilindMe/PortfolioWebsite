import * as THREE from 'three';
import {SCREEN_W, SCREEN_H} from './XmbRenderer';
import {ROTATION_LOCKED, localDelta, localPoint} from '../layout';

// Each key's menu action and the PSP button it stands for (Button Rush reads the button). I J K L are the face buttons
// in the PSP's diamond (△ □ ✕ ○) and only do something in the game; Esc and Backspace are Home.
const keys={
 ArrowLeft:['LEFT','left'],a:['LEFT','left'],ArrowRight:['RIGHT','right'],d:['RIGHT','right'],
 ArrowUp:['UP','up'],w:['UP','up'],ArrowDown:['DOWN','down'],s:['DOWN','down'],
 Enter:['CONFIRM','cross'],' ':['CONFIRM','cross'],x:['CONFIRM','cross'],o:['BACK','circle'],Escape:['BACK','home'],Backspace:['BACK','home'],
 i:['PRESS','triangle'],j:['PRESS','square'],k:['PRESS','cross'],l:['PRESS','circle'],
};
// {type, button} for a key, or null.
export function keyAction(key){
 const entry=keys[key.length===1?key.toLowerCase():key];
 return entry?{type:entry[0],button:entry[1]}:null;
}

// Mesh names in psp.glb and the button each one is: D-pad up/right/down/left, △, ○, ✕, □ and Home.
export const buttonNames={button1_low:'up',button2_low:'right',button3_low:'down',button4_low:'left',button5_low:'triangle',button6_low:'circle',button7_low:'cross',button8_low:'square',button9_low:'home'};
const menuActions={up:'UP',right:'RIGHT',down:'DOWN',left:'LEFT',cross:'CONFIRM',circle:'BACK',home:'BACK'};
// The buttons the menu uses, by mesh name. △ and □ only work in the game.
export const buttonActions=Object.fromEntries(Object.entries(buttonNames).filter(([,button])=>menuActions[button]).map(([name,button])=>[name,menuActions[button]]));
const meshFor=Object.fromEntries(Object.entries(buttonNames).map(([name,button])=>[button,name]));

// The optimized model merges △ (button5_low) and □ (button8_low) into the body, so the game gets invisible stand-ins
// cut from ○: the face buttons sit in a diamond, so △ is as far above its centre (✕'s x, ○'s y) as ○ is right of it,
// and □ as far left. They take clicks and a halo; the merged buttons themselves don't move when pressed.
export function addFaceButtons(model){
 const circle=model.getObjectByName('button6_low'), cross=model.getObjectByName('button7_low');
 if(!circle||!cross||model.getObjectByName('button5_low'))return;
 const centre=mesh=>{mesh.geometry.computeBoundingBox();mesh.updateMatrix();return mesh.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(mesh.matrix);};
 const o=centre(circle), x=centre(cross), step=o.x-x.x;
 for(const [name,dx,dy] of [['button5_low',-step,step],['button8_low',-2*step,0]]){
  const stand=new THREE.Mesh(circle.geometry,new THREE.MeshBasicMaterial({visible:false}));
  stand.name=name;stand.position.copy(circle.position).add(new THREE.Vector3(dx,dy,0));
  stand.quaternion.copy(circle.quaternion);stand.scale.copy(circle.scale);
  circle.parent.add(stand);
 }
}

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
  return live(hit.object.name)?{button:hit.object,point:centre(hit.object)}:null;
 }
 function live(name){
  return !!buttonActions[name]||(!!buttonNames[name]&&xmb.state?.view==='game');
 }
 function centre(mesh){
  mesh.geometry.boundingBox??mesh.geometry.computeBoundingBox();
  return mesh.localToWorld(mesh.geometry.boundingBox.getCenter(new THREE.Vector3()));
 }
 // Where a key's action appears to come from: its PSP button, if it has one.
 function origin(button){
  const mesh=model.getObjectByName(meshFor[button]??'');
  return mesh?centre(mesh):null;
 }
 function press(target){
  const mesh=typeof target==='string'?model.getObjectByName(meshFor[target]??''):target;
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
  if(hit.button){const button=buttonNames[hit.button.name];press(hit.button);act({type:menuActions[button]??'PRESS',button},hit.point);return;}
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
