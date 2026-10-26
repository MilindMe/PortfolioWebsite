import React, {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {KTX2Loader} from 'three/addons/loaders/KTX2Loader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {applyLighting} from './lighting';
import {XmbRenderer} from './xmb/XmbRenderer';
import {attachScreenInput, keyAction} from './xmb/input';
import {createButtonGlow} from './xmb/buttonGlow';
import {ROTATION_LOCKED, stageInsets} from './layout';
import {MODEL_URL, loadModelBytes} from './modelAsset';
import {DURATION, REST, SKIN_AT, pose, transitionKind} from './experiences/transitions';

// Built by `npm run model:optimize` (meshopt geometry, KTX2 textures). Vite bundles the Basis transcoder that
// KTX2Loader finds by itself; it is only fetched when the model actually has KTX2 textures.
// The PSP's half extents; each experience says what fraction of the free area it spans (see themes.js).
const PSP_HALF_WIDTH=1.5, PSP_HALF_HEIGHT=.7;
// Page wheel: 40px of scrolling is one step, a pause resets the count and steps are spaced so trackpad momentum
// doesn't race through the menu.
const WHEEL_STEP=40, WHEEL_RESET=200, WHEEL_GAP=140;

// children are page layers drawn behind the PSP (e.g. an experience's backdrop); the WebGL canvas sits above them.
export default function MemoriesScene({lightMode='golden',reset,xmbState,experience,onXmbAction,onStatus,onProgress,children}) {
 const lightModeRef=useRef(lightMode);lightModeRef.current=lightMode;
 const xmbStateRef=useRef(xmbState);xmbStateRef.current=xmbState;
 const xmbActionRef=useRef(onXmbAction);xmbActionRef.current=onXmbAction;
 const experienceRef=useRef(experience);experienceRef.current=experience;
 const host=useRef(null), api=useRef(null);
 useEffect(()=>{api.current?.reset();},[reset]);
 useEffect(()=>{api.current?.lighting(lightMode);},[lightMode]);
 useEffect(()=>{api.current?.xmb(xmbState);},[xmbState]);
 useEffect(()=>{api.current?.experience(experience);},[experience]);
 useEffect(()=>{
  const element=host.current;
  let renderer, disposed=false, loop=0, input=null, glow=null;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{onStatus('error');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  renderer.domElement.setAttribute('aria-label','PSP running the portfolio menu. Arrow keys move through the menu, Enter opens, Escape goes back.'+(ROTATION_LOCKED?'':' Drag or use Shift and the arrow keys to rotate the PSP.'));
  renderer.domElement.tabIndex=0;
  element.appendChild(renderer.domElement);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(34,1,.1,40);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=false;
  controls.minPolarAngle=Math.PI*.2;controls.maxPolarAngle=Math.PI*.8;
  controls.rotateSpeed=.55;controls.enableRotate=!ROTATION_LOCKED;
  const hemisphere=new THREE.HemisphereLight('#bcc6d6','#292831',1.1);scene.add(hemisphere);
  const keyLight=new THREE.DirectionalLight(),fill=new THREE.DirectionalLight(),rim=new THREE.DirectionalLight();
  fill.position.set(4,1,2);rim.position.set(0,2,-3);scene.add(keyLight,fill,rim);
  const lightRig={hemisphere,key:keyLight,fill,rim,scene};
  // Dim reflections preserve the black plastic while the warm key shapes its edges.
  const studio=new THREE.Scene();studio.background=new THREE.Color('#343744');
  for(const [x,y,z] of [[0,4,0],[-4,1,2],[4,0,1]]){
   const panel=new THREE.Mesh(new THREE.PlaneGeometry(5,3),new THREE.MeshBasicMaterial({color:'#ead6ba',side:THREE.DoubleSide}));
   panel.position.set(x,y,z);panel.lookAt(0,0,0);studio.add(panel);
  }
  const pmrem=new THREE.PMREMGenerator(renderer), environment=pmrem.fromScene(studio,.08);
  scene.environment=environment.texture;scene.environmentIntensity=.55;pmrem.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
  applyLighting(lightModeRef.current,'memories',lightRig);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const xmb=new XmbRenderer(reduced);xmb.setState(xmbStateRef.current);xmb.setSkin(experienceRef.current.screen);
  // The model hangs off rig, which the experience transitions shake, flip and scale. frame mixes the camera framing
  // of the experience being left with the one being entered.
  const rig=new THREE.Group();scene.add(rig);
  let current=experienceRef.current, frame={from:current,to:current,mix:1}, transition=null;
  // origin (where the action came from, as a world point) is unused for now; the saved pulse effect needs it.
  const act=(action,origin)=>xmbActionRef.current?.({...action,maxScroll:xmb.maxScroll});
  // One loop renders camera moves as they happen; the XMB decides when its texture is due (30 fps active, 12 idle).
  let needsRender=true;
  const render=()=>{needsRender=true;};
  function animate(now){
   loop=requestAnimationFrame(animate);
   if(transition)step(now);
   if(xmb.tick(now))needsRender=true;
   if(needsRender&&!disposed){needsRender=false;renderer.render(scene,camera);}
  }
  loop=requestAnimationFrame(animate);
  // Frames the PSP in the area the page wheel leaves free, mixing between two experiences mid-transition. The view
  // offset slides it into the middle of that area, so shrinking it aside is just this framing changing.
  function resetView(){
   const w=element.clientWidth||1, h=element.clientHeight||1, mix=frame.mix, lerp=(a,b)=>a+(b-a)*mix;
   const from=stageInsets(w,h,frame.from.wheel), to=stageInsets(w,h,frame.to.wheel), left=lerp(from.left,to.left), top=lerp(from.top,to.top);
   const fillW=lerp(frame.from.fill.w,frame.to.fill.w), fillH=lerp(frame.from.fill.h,frame.to.fill.h);
   const halfFov=Math.tan(THREE.MathUtils.degToRad(17)), distance=Math.max(PSP_HALF_HEIGHT*h/(halfFov*fillH*Math.max(1,h-top)),PSP_HALF_WIDTH*h/(halfFov*fillW*Math.max(1,w-left)));
   camera.setViewOffset(w,h,-left/2,-top/2,w,h);camera.updateProjectionMatrix();
   camera.position.set(0,0,distance);controls.target.set(0,0,0);controls.update();render();
  }
  function setPose(p){rig.position.set(p.shakeX,p.hop,0);rig.rotation.set(0,p.rotY,p.shakeRot);rig.scale.setScalar(p.scale);}
  function step(now){
   const t=now-transition.start, p=pose(transition.kind,t);
   if(!transition.skinned&&t>=SKIN_AT[transition.kind]){transition.skinned=true;xmb.setSkin(current.screen);}
   setPose(p);frame.mix=p.frame;resetView();
   if(t>=DURATION[transition.kind])transition=null;
  }
  // Switches experience: animated once the PSP is on screen, otherwise (first load, reduced motion) it snaps.
  function changeExperience(next){
   if(next.id===current.id)return;
   const kind=transitionKind(current,next), from=current;
   current=next;
   if(!kind||!rig.children.length||reduced.matches){
    transition=null;frame={from:next,to:next,mix:1};setPose(REST);xmb.setSkin(next.screen);resetView();return;
   }
   frame={from,to:next,mix:0};transition={kind,start:performance.now(),skinned:false};
  }
  function key(e){
   if((e.target!==renderer.domElement&&e.target!==document.body)||e.altKey||e.ctrlKey||e.metaKey)return;
   if(ROTATION_LOCKED||!e.shiftKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
    const type=keyAction(e.key);
    if(!type||(e.repeat&&(type==='CONFIRM'||type==='BACK')))return;
    e.preventDefault();input?.press(type);act({type},input?.origin(type));return;
   }
   e.preventDefault();const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);spherical.theta+=(e.key==='ArrowLeft'?.12:e.key==='ArrowRight'?-.12:0);spherical.phi=THREE.MathUtils.clamp(spherical.phi+(e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0),controls.minPolarAngle,controls.maxPolarAngle);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();render();}
  const resize=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;camera.aspect=w/h;renderer.setSize(w,h);resetView();});resize.observe(element);
  // Scrolling anywhere on the page walks the menu (NEXT/PREV), once the PSP is on screen.
  let wheelTotal=0, wheelAt=0, stepAt=0;
  function wheel(e){
   if(!input||e.ctrlKey||e.target.closest?.('.light-panel'))return;
   e.preventDefault();
   const now=performance.now();
   if(now-wheelAt>WHEEL_RESET)wheelTotal=0;
   wheelAt=now;
   if(now-stepAt<WHEEL_GAP){wheelTotal=0;return;}
   wheelTotal+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?element.clientHeight:1);
   if(Math.abs(wheelTotal)>=WHEEL_STEP){act({type:wheelTotal>0?'NEXT':'PREV'});wheelTotal=0;stepAt=now;}
  }
  function lost(e){e.preventDefault();onStatus('error');}
  addEventListener('keydown',key);addEventListener('wheel',wheel,{passive:false});renderer.domElement.addEventListener('webglcontextlost',lost);
  controls.addEventListener('change',render);api.current={reset:resetView,lighting:mode=>{applyLighting(mode,'memories',lightRig);render();},xmb:state=>xmb.setState(state),experience:changeExperience};
  function disposeModel(root){root.traverse(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){for(const value of Object.values(m))if(value?.isTexture)value.dispose();m.dispose();}});}
  const manager=new THREE.LoadingManager();
  const ktx2=new KTX2Loader(manager).detectSupport(renderer);
  const loader=new GLTFLoader(manager).setMeshoptDecoder(MeshoptDecoder).setKTX2Loader(ktx2);
  loadModelBytes(value=>{if(!disposed)onProgress?.(value);}).then(bytes=>{
   if(disposed)return null;
   return loader.parseAsync(bytes,MODEL_URL.slice(0,MODEL_URL.lastIndexOf('/')+1));
  }).then(gltf=>{
   if(!gltf)return;
   if(disposed){disposeModel(gltf.scene);return;}
   // The Blender export already fills 0–1 with U right and V up.
   const screen=gltf.scene.getObjectByName('screen_low');
   if(screen){
    xmb.texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
    // Emissive so the menu glows at its true colours, while the glossy surface still catches reflections.
    screen.material.dispose();
    screen.material=new THREE.MeshStandardMaterial({color:'#000',emissive:'#fff',emissiveMap:xmb.texture,roughness:.18,metalness:0,toneMapped:false});
    glow=createButtonGlow(gltf.scene);glow.update();
    const hoverButton=name=>{glow.setHover(name);glow.update();render();};
    input=attachScreenInput({element:renderer.domElement,camera,controls,model:gltf.scene,screen,xmb,act,invalidate:render,onHoverButton:hoverButton});
   }
   rig.add(gltf.scene);render();onStatus('ready');
   xmb.boot(performance.now()+250);
  }).catch(()=>{if(!disposed)onStatus('error');});
  resetView();
  return()=>{disposed=true;cancelAnimationFrame(loop);input?.dispose();glow?.dispose();xmb.dispose();api.current=null;resize.disconnect();controls.dispose();removeEventListener('keydown',key);removeEventListener('wheel',wheel);renderer.domElement.removeEventListener('webglcontextlost',lost);disposeModel(scene);environment.dispose();ktx2.dispose();renderer.dispose();renderer.domElement.remove();};
 },[onStatus,onProgress]);
 return <div className={`memories-stage${ROTATION_LOCKED?' rotation-locked':''}`} ref={host}>{children}</div>;
}
