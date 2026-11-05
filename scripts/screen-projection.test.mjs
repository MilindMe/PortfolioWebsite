import {test} from 'node:test';
import assert from 'node:assert/strict';
import {screenTransform} from '../src/xmb/screenProjection.js';

function project({width,height,matrix:m},u,v){
 const x=u*width,y=v*height,w=m[3]*x+m[7]*y+m[15];
 return {x:(m[0]*x+m[4]*y+m[12])/w,y:(m[1]*x+m[5]*y+m[13])/w};
}
for(const points of [
 [{x:100,y:80},{x:700,y:80},{x:700,y:420},{x:100,y:420}],
 [{x:150,y:90},{x:640,y:160},{x:720,y:430},{x:90,y:490}],
])test('CSS projection maps all four DOM corners onto the screen',()=>{
 const transform=screenTransform(points);assert(transform);
 for(const [i,[u,v]] of [[0,[0,0]],[1,[1,0]],[2,[1,1]],[3,[0,1]]]){
  const p=project(transform,u,v);
  assert(Math.abs(p.x-points[i].x)<1e-8);assert(Math.abs(p.y-points[i].y)<1e-8);
 }
});
test('the HTML screen hides when flipped, edge-on or outside the camera range',()=>{
 const front=[{x:0,y:0},{x:100,y:0},{x:100,y:60},{x:0,y:60}];
 assert.equal(screenTransform([front[1],front[0],front[3],front[2]]),null);
 assert.equal(screenTransform(front.map(p=>({...p,x:0}))),null);
 assert.equal(screenTransform(front.map(p=>({...p,z:2}))),null);
});
