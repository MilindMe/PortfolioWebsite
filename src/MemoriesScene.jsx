import React, {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {applyLighting} from './lighting';
import {XmbRenderer} from './xmb/XmbRenderer';
import {attachScreenInput, keyAction} from './xmb/input';
import {createButtonGlow} from './xmb/buttonGlow';
import {stageInsets} from './layout';

// Free rotation is switched off for now; flip this to let visitors drag or Shift+arrow the PSP around again.
export const ROTATION_LOCKED=true;
// Fraction of the free area (the viewport minus the page wheel's strip) the PSP spans, capped so it never overflows vertically.
const FILL_WIDTH=.9, FILL_HEIGHT=.72, PSP_HALF_WIDTH=1.5, PSP_HALF_HEIGHT=.7;

export default function MemoriesScene({lightMode='golden',reset,xmbState,onXmbAction,onStatus,onProgress}) {
 const lightModeRef=useRef(lightMode);lightModeRef.current=lightMode;
 const xmbStateRef=useRef(xmbState);xmbStateRef.current=xmbState;
 const xmbActionRef=useRef(onXmbAction);xmbActionRef.current=onXmbAction;
 const host=useRef(null), dots=useRef(null), api=useRef(null);
 useEffect(()=>{api.current?.reset();},[reset]);
 useEffect(()=>{api.current?.lighting(lightMode);},[lightMode]);
 useEffect(()=>{api.current?.xmb(xmbState);},[xmbState]);
 useEffect(()=>{
  const element=host.current, pattern=dots.current, ctx=pattern.getContext('2d');
  let renderer, disposed=false, frame=0, loop=0, input=null, glow=null, inset={left:0,top:0};
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
  const xmb=new XmbRenderer(reduced);xmb.setState(xmbStateRef.current);
  const act=action=>xmbActionRef.current?.({...action,maxScroll:xmb.maxScroll});
  // One loop renders camera moves as they happen and redraws the screen texture at up to 30 fps.
  let needsRender=true, lastTick=0;
  const render=()=>{needsRender=true;};
  function animate(now){
   loop=requestAnimationFrame(animate);
   if(now-lastTick>=32){
    lastTick=now;
    if(xmb.tick(now))needsRender=true;
   }
   if(needsRender&&!disposed){needsRender=false;renderer.render(scene,camera);}
  }
  loop=requestAnimationFrame(animate);
  let point=null;
  function drawDots(){
   const w=element.clientWidth,h=element.clientHeight;
   ctx.clearRect(0,0,w,h);
   for(let y=-30;y<h+30;y+=28)for(let x=-30;x<w+30;x+=28){
    const px=x+(Math.floor(y/28)%2)*14;
    const dx=point?px-point.x:0,dy=point?y-point.y:0,distance=Math.hypot(dx,dy);
    const influence=point&&!reduced.matches?Math.max(0,1-distance/150):0;
    const shift=influence*15;
    const freeW=w-inset.left,freeH=h-inset.top;
    const centerFade=Math.min(1,Math.hypot((px-inset.left-freeW*.5)/(freeW*.45),(y-inset.top-freeH*.46)/(freeH*.7)));
    ctx.fillStyle=`rgba(255,255,255,${.05+centerFade*.25+influence*.5})`;
    ctx.beginPath();ctx.arc(px+(dx/(distance||1))*shift,y+(dy/(distance||1))*shift,2.3+centerFade*1.1+influence*3,0,Math.PI*2);ctx.fill();
   }
  }
  function move(e){const r=element.getBoundingClientRect();point={x:e.clientX-r.left,y:e.clientY-r.top};cancelAnimationFrame(frame);frame=requestAnimationFrame(drawDots);}
  function leave(){point=null;cancelAnimationFrame(frame);frame=requestAnimationFrame(drawDots);}
  function resetView(){const h=element.clientHeight||1, freeW=Math.max(1,element.clientWidth-inset.left), freeH=Math.max(1,h-inset.top), halfFov=Math.tan(THREE.MathUtils.degToRad(17)), distance=Math.max(PSP_HALF_HEIGHT*h/(halfFov*FILL_HEIGHT*freeH),PSP_HALF_WIDTH*h/(halfFov*FILL_WIDTH*freeW));camera.position.set(0,0,distance);controls.target.set(0,0,0);controls.update();render();}
  function key(e){
   if((e.target!==renderer.domElement&&e.target!==document.body)||e.altKey||e.ctrlKey||e.metaKey)return;
   if(ROTATION_LOCKED||!e.shiftKey||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
    const type=keyAction(e.key);
    if(!type||(e.repeat&&(type==='CONFIRM'||type==='BACK')))return;
    e.preventDefault();input?.press(type);act({type});return;
   }
   e.preventDefault();const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);spherical.theta+=(e.key==='ArrowLeft'?.12:e.key==='ArrowRight'?-.12:0);spherical.phi=THREE.MathUtils.clamp(spherical.phi+(e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0),controls.minPolarAngle,controls.maxPolarAngle);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();render();}
  // The view offset slides the PSP into the middle of the area the page wheel leaves free.
  const resize=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;inset=stageInsets(w,h);camera.aspect=w/h;camera.setViewOffset(w,h,-inset.left/2,-inset.top/2,w,h);camera.updateProjectionMatrix();renderer.setSize(w,h);const dpr=Math.min(devicePixelRatio,1.5);pattern.width=w*dpr;pattern.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);drawDots();resetView();});resize.observe(element);
  function lost(e){e.preventDefault();onStatus('error');}
  element.addEventListener('pointermove',move);element.addEventListener('pointerleave',leave);
  addEventListener('keydown',key);renderer.domElement.addEventListener('webglcontextlost',lost);
  controls.addEventListener('change',render);api.current={reset:resetView,lighting:mode=>{applyLighting(mode,'memories',lightRig);render();},xmb:state=>xmb.setState(state)};
  function disposeModel(root){root.traverse(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){for(const value of Object.values(m))if(value?.isTexture)value.dispose();m.dispose();}});}
  const manager=new THREE.LoadingManager();manager.onProgress=(_url,loaded,total)=>{if(!disposed)onProgress?.(loaded/total);};
  new GLTFLoader(manager).load('/models/psp.glb',gltf=>{
   if(disposed){disposeModel(gltf.scene);return;}
   // The screen's UVs point at a placeholder in the texture atlas; remap them to fill the XMB canvas instead.
   const screen=gltf.scene.getObjectByName('screen_low');
   if(screen){
    const {geometry}=screen, position=geometry.attributes.position, uv=geometry.attributes.uv;
    geometry.computeBoundingBox();const {min,max}=geometry.boundingBox;
    for(let i=0;i<position.count;i++)uv.setXY(i,(position.getX(i)-min.x)/(max.x-min.x),(position.getY(i)-min.y)/(max.y-min.y));
    uv.needsUpdate=true;
    xmb.texture.anisotropy=renderer.capabilities.getMaxAnisotropy();
    // Emissive so the menu glows at its true colours, while the glossy surface still catches reflections.
    screen.material=new THREE.MeshStandardMaterial({color:'#000',emissive:'#fff',emissiveMap:xmb.texture,roughness:.18,metalness:0,toneMapped:false});
    glow=createButtonGlow(gltf.scene);glow.update();
    const hoverButton=name=>{glow.setHover(name);glow.update();render();};
    input=attachScreenInput({element:renderer.domElement,camera,controls,model:gltf.scene,screen,xmb,act,invalidate:render,onHoverButton:hoverButton});
   }
   scene.add(gltf.scene);render();onStatus('ready');
   xmb.boot(performance.now()+250);
  },undefined,()=>{if(!disposed)onStatus('error');});
  resetView();
  return()=>{disposed=true;cancelAnimationFrame(frame);cancelAnimationFrame(loop);input?.dispose();glow?.dispose();xmb.dispose();api.current=null;resize.disconnect();controls.dispose();element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',leave);removeEventListener('keydown',key);renderer.domElement.removeEventListener('webglcontextlost',lost);disposeModel(scene);environment.dispose();renderer.dispose();renderer.domElement.remove();};
 },[onStatus,onProgress]);
 return <div className={`memories-stage${ROTATION_LOCKED?' rotation-locked':''}`} ref={host}><div className="memory-slash" aria-hidden="true"/><canvas ref={dots} className="memory-dots" aria-hidden="true"/></div>;
}
