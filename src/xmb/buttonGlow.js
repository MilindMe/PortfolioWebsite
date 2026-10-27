import * as THREE from 'three';
import {buttonActions, buttonNames} from './input';

const COLOR='#ffd7a0';
// How far the glow reaches past a button's edge, in model units (buttons are about 0.15 across), and the texture's
// resolution for the largest button.
const REACH=.016, PIXELS=160;

// A thin glow around one button's own outline: its triangles, seen face on, are filled into a mask, the mask is drawn
// blurred, and then the mask itself is cut back out, so the glow hugs the edge (pointed D-pad arrows included) and
// never covers the button. Returns the texture and the quad's bounds in the button's parent.
function outlineTexture(button){
 const {geometry,matrix}=button, position=geometry.attributes.position, index=geometry.index;
 const corners=geometry.boundingBox.clone().applyMatrix4(matrix), {min,max}=corners;
 const width=max.x-min.x+REACH*2, height=max.y-min.y+REACH*2, scale=PIXELS/.18;
 const canvas=document.createElement('canvas');
 canvas.width=Math.ceil(width*scale);canvas.height=Math.ceil(height*scale);
 const mask=new Path2D(), point=new THREE.Vector3();
 const at=i=>{point.fromBufferAttribute(position,i).applyMatrix4(matrix);return [(point.x-min.x+REACH)*scale,(max.y+REACH-point.y)*scale];};
 const count=index?index.count:position.count;
 for(let i=0;i<count;i+=3){
  const [a,b,c]=[0,1,2].map(k=>at(index?index.getX(i+k):i+k));
  // Front and back faces wind opposite ways once flattened and would cancel out, so every triangle goes one way round.
  const turn=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  if(!turn)continue;
  const [p,q]=turn>0?[b,c]:[c,b];
  mask.moveTo(...a);mask.lineTo(...p);mask.lineTo(...q);mask.closePath();
 }
 const ctx=canvas.getContext('2d'), blur=REACH*scale*.45, away=canvas.width*4;
 // Only the mask's shadow lands on the canvas: the shape itself is drawn far off to the left.
 ctx.shadowColor='#fff';ctx.shadowBlur=blur;ctx.shadowOffsetX=away;ctx.fillStyle='#fff';
 ctx.translate(-away,0);ctx.fill(mask);ctx.fill(mask);ctx.setTransform(1,0,0,1,0,0);
 ctx.shadowColor='transparent';ctx.globalCompositeOperation='destination-out';ctx.fill(mask);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
 return {texture,width,height,centre:[(min.x+max.x)/2,(min.y+max.y)/2],front:max.z};
}

// Faint outlines round the PSP buttons that do something, brighter on hover. △ and □ only light up in the game.
// Additive quads, one small texture per button: no post-processing, a handful of draw calls.
export function createButtonGlow(model){
 const geometry=new THREE.PlaneGeometry(1,1), halos=[];
 for(const name of Object.keys(buttonNames)){
  const button=model.getObjectByName(name);
  if(!button)continue;
  // The halo sits beside the button in its parent, so the outline is traced through the node's transform.
  button.geometry.computeBoundingBox();button.updateMatrix();
  const {texture,width,height,centre,front}=outlineTexture(button);
  const material=new THREE.MeshBasicMaterial({map:texture,color:COLOR,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false});
  const halo=new THREE.Mesh(geometry,material);
  halo.scale.set(width,height,1);
  halo.position.set(centre[0],centre[1],front+.002);
  halo.raycast=()=>{};
  button.parent.add(halo);halos.push({name,halo,material,texture});
 }
 let hovered=null, game=false;
 return {
  setHover(name){hovered=name;},
  // Returns whether that changed anything.
  setGame(value){const changed=value!==game;game=value;return changed;},
  update(){
   halos.forEach(({name,halo,material})=>{halo.visible=game||!!buttonActions[name];material.opacity=name===hovered?.9:.5;});
  },
  dispose(){geometry.dispose();halos.forEach(({halo,material,texture})=>{halo.removeFromParent();material.dispose();texture.dispose();});},
 };
}
