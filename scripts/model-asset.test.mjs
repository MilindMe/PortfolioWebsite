import {test} from 'node:test';
import assert from 'node:assert/strict';

let instance=0;
const fresh=()=>import(`../src/modelAsset.js?test=${instance++}`);

test('concurrent consumers share one early download and get byte progress', async t=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{
  calls++;
  return new Response(new ReadableStream({start(controller){
   controller.enqueue(new Uint8Array([1,2]));controller.enqueue(new Uint8Array([3,4]));controller.close();
  }}),{headers:{'Content-Length':'4'}});
 });
 const {loadModelBytes,preloadModel}=await fresh();preloadModel();
 const progress=[];
 const [a,b]=await Promise.all([loadModelBytes(value=>progress.push(value)),loadModelBytes()]);
 assert.equal(calls,1);assert.equal(a,b);assert.deepEqual([...new Uint8Array(a)],[1,2,3,4]);
 assert(progress.includes(.5));assert.equal(progress.at(-1),1);
});

test('a rejected preload can be retried after network or HTTP failure', async t=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{
  calls++;
  if(calls===1)throw new TypeError('Network unavailable');
  return new Response('ok',{status:calls===2?503:200});
 });
 const {loadModelBytes}=await fresh();
 await assert.rejects(loadModelBytes(),/Network unavailable/);
 await assert.rejects(loadModelBytes(),/503/);
 assert.equal(new TextDecoder().decode(await loadModelBytes()),'ok');
 assert.equal(calls,3);
});

test('compressed byte lengths do not report premature completion', async t=>{
 t.mock.method(globalThis,'fetch',async()=>new Response('decoded bytes',{
  headers:{'Content-Encoding':'gzip','Content-Length':'1'}
 }));
 const {loadModelBytes}=await fresh(), progress=[];
 await loadModelBytes(value=>progress.push(value));
 assert.deepEqual(progress,[0,1]);
});
