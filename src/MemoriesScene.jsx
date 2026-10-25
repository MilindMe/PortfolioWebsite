import React, {useEffect, useRef} from 'react';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {applyLighting} from './lighting';

export default function MemoriesScene({lightMode='golden',reset,onStatus,onProgress}) {
 const lightModeRef=useRef(lightMode);lightModeRef.current=lightMode;
 const host=useRef(null), dots=useRef(null), api=useRef(null);
 useEffect(()=>{api.current?.reset();},[reset]);
 useEffect(()=>{api.current?.lighting(lightMode);},[lightMode]);
 useEffect(()=>{
  const element=host.current, pattern=dots.current, ctx=pattern.getContext('2d');
  let renderer, disposed=false, frame=0;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{onStatus('error');return;}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  renderer.domElement.setAttribute('aria-label','PSP model. Drag to rotate, or use the arrow keys.');
  renderer.domElement.tabIndex=0;
  element.appendChild(renderer.domElement);
  const scene=new THREE.Scene(), camera=new THREE.PerspectiveCamera(34,1,.1,40);
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=false;
  controls.minPolarAngle=Math.PI*.2;controls.maxPolarAngle=Math.PI*.8;
  controls.rotateSpeed=.55;
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
  const render=()=>{if(!disposed)renderer.render(scene,camera);};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let point=null;
  function drawDots(){
   const w=element.clientWidth,h=element.clientHeight;
   ctx.clearRect(0,0,w,h);
   for(let y=-30;y<h+30;y+=28)for(let x=-30;x<w+30;x+=28){
    const px=x+(Math.floor(y/28)%2)*14;
    const dx=point?px-point.x:0,dy=point?y-point.y:0,distance=Math.hypot(dx,dy);
    const influence=point&&!reduced.matches?Math.max(0,1-distance/150):0;
    const shift=influence*15;
    const centerFade=Math.min(1,Math.hypot((px-w*.5)/(w*.45),(y-h*.46)/(h*.7)));
    ctx.fillStyle=`rgba(255,255,255,${.05+centerFade*.25+influence*.5})`;
    ctx.beginPath();ctx.arc(px+(dx/(distance||1))*shift,y+(dy/(distance||1))*shift,2.3+centerFade*1.1+influence*3,0,Math.PI*2);ctx.fill();
   }
  }
  function move(e){const r=element.getBoundingClientRect();point={x:e.clientX-r.left,y:e.clientY-r.top};cancelAnimationFrame(frame);frame=requestAnimationFrame(drawDots);}
  function leave(){point=null;cancelAnimationFrame(frame);frame=requestAnimationFrame(drawDots);}
  function resetView(){const distance=Math.max(5.6,1.95/(Math.tan(THREE.MathUtils.degToRad(17))*camera.aspect));camera.position.set(.25,.35,distance);controls.target.set(0,0,0);controls.update();render();}
  function key(e){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const offset=camera.position.clone().sub(controls.target),spherical=new THREE.Spherical().setFromVector3(offset);spherical.theta+=(e.key==='ArrowLeft'?.12:e.key==='ArrowRight'?-.12:0);spherical.phi=THREE.MathUtils.clamp(spherical.phi+(e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0),controls.minPolarAngle,controls.maxPolarAngle);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));controls.update();render();}
  const resize=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);const dpr=Math.min(devicePixelRatio,1.5);pattern.width=w*dpr;pattern.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);drawDots();resetView();});resize.observe(element);
  function lost(e){e.preventDefault();onStatus('error');}
  element.addEventListener('pointermove',move);element.addEventListener('pointerleave',leave);
  renderer.domElement.addEventListener('keydown',key);renderer.domElement.addEventListener('webglcontextlost',lost);
  controls.addEventListener('change',render);api.current={reset:resetView,lighting:mode=>{applyLighting(mode,'memories',lightRig);render();}};
  function disposeModel(root){root.traverse(o=>{o.geometry?.dispose();for(const m of o.material?(Array.isArray(o.material)?o.material:[o.material]):[]){for(const value of Object.values(m))if(value?.isTexture)value.dispose();m.dispose();}});}
  const manager=new THREE.LoadingManager();manager.onProgress=(_url,loaded,total)=>{if(!disposed)onProgress?.(loaded/total);};
  new GLTFLoader(manager).load('/models/psp.glb',gltf=>{
   if(disposed){disposeModel(gltf.scene);return;}
   gltf.scene.rotation.z=-.10;scene.add(gltf.scene);render();onStatus('ready');
  },undefined,()=>{if(!disposed)onStatus('error');});
  resetView();
  return()=>{disposed=true;cancelAnimationFrame(frame);api.current=null;resize.disconnect();controls.dispose();element.removeEventListener('pointermove',move);element.removeEventListener('pointerleave',leave);renderer.domElement.removeEventListener('keydown',key);renderer.domElement.removeEventListener('webglcontextlost',lost);disposeModel(scene);environment.dispose();renderer.dispose();renderer.domElement.remove();};
 },[onStatus,onProgress]);
 return <div className="memories-stage" ref={host}><div className="memory-slash" aria-hidden="true"/><canvas ref={dots} className="memory-dots" aria-hidden="true"/></div>;
}
