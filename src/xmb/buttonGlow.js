import * as THREE from 'three';
import {buttonActions} from './input';

const COLOR='#ffd7a0';

// A soft ring texture: clear in the middle so the button itself stays visible.
function ringTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=128;
 const ctx=canvas.getContext('2d'), ring=ctx.createRadialGradient(64,64,0,64,64,64);
 ring.addColorStop(0,'rgba(255,255,255,0)');ring.addColorStop(.52,'rgba(255,255,255,0)');
 ring.addColorStop(.64,'rgba(255,255,255,.9)');ring.addColorStop(.78,'rgba(255,255,255,.3)');ring.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=ring;ctx.fillRect(0,0,128,128);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 return texture;
}

// Static halos around the PSP buttons that do something, brightening on hover.
// Additive quads with one shared texture: no post-processing, a handful of draw calls.
export function createButtonGlow(model){
 const texture=ringTexture(), geometry=new THREE.PlaneGeometry(1,1), halos=[];
 for(const name of Object.keys(buttonActions)){
  const button=model.getObjectByName(name);
  if(!button)continue;
  button.geometry.computeBoundingBox();
  const {min,max}=button.geometry.boundingBox, pad=.08;
  const material=new THREE.MeshBasicMaterial({map:texture,color:COLOR,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  const halo=new THREE.Mesh(geometry,material);
  halo.scale.set(max.x-min.x+pad,max.y-min.y+pad,1);
  halo.position.set((min.x+max.x)/2,(min.y+max.y)/2,max.z+.002);
  halo.raycast=()=>{};
  model.add(halo);halos.push({name,halo,material});
 }
 let hovered=null;
 return {
  setHover(name){hovered=name;},
  update(){
   halos.forEach(({name,material})=>{material.opacity=name===hovered?.95:.4;});
  },
  dispose(){texture.dispose();geometry.dispose();halos.forEach(({halo,material})=>{halo.removeFromParent();material.dispose();});},
 };
}
