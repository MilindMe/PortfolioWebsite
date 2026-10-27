import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'vite';

// Bundle the real renderer so Node can resolve its browser-style imports.
// Canvas records composition order; Chrome separately verifies actual pixels.
const bundle=await build({configFile:false,logLevel:'silent',build:{write:false,minify:false,
 lib:{entry:new URL('../src/xmb/XmbRenderer.js',import.meta.url).pathname,formats:['es']},
 rollupOptions:{external:['three']}}});
const output=(Array.isArray(bundle)?bundle:[bundle]).flatMap(result=>result.output);
const code=output.find(file=>file.type==='chunk').code.replaceAll('"three"',JSON.stringify(new URL('../node_modules/three/build/three.module.js',import.meta.url).href));
const {XmbRenderer}=await import(`data:text/javascript;base64,${Buffer.from(code+'\n//# sourceURL=xmb-renderer-under-test.js').toString('base64')}`);

function canvas(){
 const canvas={width:0,height:0};
 const ctx=new Proxy({canvas,events:[],globalAlpha:1,
  clearRect(){this.events=[];},
  fillText(text){this.events.push(text);},
  drawImage(source){this.events.push(...source.getContext('2d').events);},
  measureText(text){return {width:text.length*6};},
  createLinearGradient(){return {addColorStop(){}};},
  createRadialGradient(){return {addColorStop(){}};},
 },{get(target,key){return key in target?target[key]:()=>{};}});
 canvas.getContext=()=>ctx;return canvas;
}
// No WebGL or DOM is needed for the renderer's 2D compositing contracts.
function renderer(t,reduced=false){
 const previous=globalThis.document, previousPath=globalThis.Path2D;
 globalThis.Path2D=class {addPath(){}};
 globalThis.document={createElement:()=>canvas()};
 t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;
  if(previousPath===undefined)delete globalThis.Path2D;else globalThis.Path2D=previousPath;});
 const xmb=new XmbRenderer({matches:reduced});
 xmb.poke=()=>{xmb.activeUntil=Infinity;};
 xmb.boot(-10000);
 const state={cat:0,item:xmb.shown.items.map(()=>0),view:'menu',sub:0,scroll:0,link:0,theme:'crimson',unlocked:true};
 xmb.setState(state);xmb.tick(1000);return {xmb,state};
}

test('the outgoing menu pulse is composited below the incoming page',t=>{
 const {xmb,state}=renderer(t);
 xmb.state={...state,view:'detail'};xmb.shown.detail=.5;
 xmb.status=()=>{};
 xmb.menu=()=>xmb.pulses.push({text:'outgoing menu',x:0,y:0,font:'12px sans-serif',alpha:.5});
 xmb.detail=()=>{
  xmb.ctx.fillText('incoming page',0,0);
  xmb.pulses.push({link:true,text:'selected link',x:0,y:0,width:60,alpha:.5});
 };
 xmb.out.events=[];xmb.draw(2,99,true);
 const events=xmb.out.events;
 assert(events.includes('outgoing menu'));assert(events.includes('incoming page'));
 assert(events.indexOf('outgoing menu')<events.indexOf('incoming page'),JSON.stringify(events));
 assert(events.indexOf('incoming page')<events.indexOf('selected link'),JSON.stringify(events));
 xmb.dispose();
});

test('opening and closing both cache the exact final animation frame',t=>{
 const {xmb,state}=renderer(t);let lastDetail=null,now=1000;
 const foreground=xmb.foreground.bind(xmb);
 xmb.foreground=(...args)=>{lastDetail=xmb.shown.detail;return foreground(...args);};
 for(const [view,target] of [['detail',1],['menu',0]]){
  xmb.setState({...state,view});
  for(let i=0;i<60;i++){now+=33;xmb.tick(now);}
  assert.equal(xmb.shown.detail,target);
  assert.equal(lastDetail,target,`stale ${view} cache`);
 }
 xmb.dispose();
});

test('idle frames reuse the foreground and reduced motion settles without redraws',t=>{
 const {xmb}=renderer(t,true);let redraws=0;
 const foreground=xmb.foreground.bind(xmb);
 xmb.foreground=(...args)=>{redraws++;return foreground(...args);};
 assert.equal(xmb.tick(1100),false);assert.equal(redraws,0);
 xmb.dispose();
});

test('photo overlays also cover the outgoing menu pulse',t=>{
 const {xmb,state}=renderer(t);
 xmb.state={...state,view:'photo'};xmb.shown.photo=.5;
 xmb.status=()=>{};
 xmb.menu=()=>xmb.pulses.push({text:'outgoing menu',x:0,y:0,font:'12px sans-serif',alpha:.5});
 xmb.photoView=()=>xmb.ctx.fillText('photo page',0,0);
 xmb.out.events=[];xmb.draw(2,99,true);
 assert(xmb.out.events.indexOf('outgoing menu')<xmb.out.events.indexOf('photo page'));
 xmb.dispose();
});

for(const reduced of [false,true])test(`view changes replace the outgoing screen in one frame (reduced motion: ${reduced})`,t=>{
 const {xmb,state}=renderer(t,reduced);let now=1000,menuAlpha,detailAlpha,photoAlpha;
 xmb.menu=alpha=>{menuAlpha=alpha;};
 xmb.detail=alpha=>{detailAlpha=alpha;};
 xmb.photoView=alpha=>{photoAlpha=alpha;};
 for(const view of ['detail','menu','photo','menu','detail','photo','menu']){
  menuAlpha=detailAlpha=photoAlpha=undefined;
  xmb.setState({...state,view});xmb.tick(now+=33);
  assert.equal(xmb.shown.detail,view==='detail'?1:0);
  assert.equal(xmb.shown.photo,view==='photo'?1:0);
  assert.equal(menuAlpha,view==='menu'?1:0,`outgoing menu visible in ${view}`);
  assert.equal(detailAlpha,view==='detail'?1:undefined,`outgoing detail visible in ${view}`);
  assert.equal(photoAlpha,view==='photo'?1:undefined,`outgoing photo visible in ${view}`);
 }
 xmb.dispose();
});

test('the Persona 5 skin still draws every label and records the same hit areas',t=>{
 const {xmb}=renderer(t);
 xmb.out.events=[];xmb.draw(2,99,true);
 const labels=xmb.out.events, hits=xmb.hits.map(({x,y,w,h})=>[x,y,w,h]);
 xmb.setSkin('persona5');
 xmb.out.events=[];xmb.draw(2,99,true);
 assert.deepEqual(xmb.hits.map(({x,y,w,h})=>[x,y,w,h]),hits);
 // Same text, set in capitals; the status bar's clock is the one string the skin leaves alone.
 assert.deepEqual(xmb.out.events.map(text=>text.toUpperCase()),labels.map(text=>text.toUpperCase()));
 assert(xmb.out.events.filter(text=>text!==text.toUpperCase()).length<=1,JSON.stringify(xmb.out.events));
 xmb.dispose();
});

for(const skin of ['gta','bo2'])test(`the ${skin} skin keeps the PSP skin's hit areas and item labels`,t=>{
 const {xmb}=renderer(t);
 // The bo2 backdrop asks for its image; nothing loads under Node.
 const previous=globalThis.Image;globalThis.Image=class {};t.after(()=>{globalThis.Image=previous;});
 xmb.out.events=[];xmb.draw(2,99,true);
 const labels=xmb.out.events, hits=xmb.hits.map(({x,y,w,h})=>[x,y,w,h]);
 xmb.setSkin(skin);
 xmb.out.events=[];xmb.draw(2,99,true);
 assert.deepEqual(xmb.hits.map(({x,y,w,h})=>[x,y,w,h]),hits);
 // Black Ops sets category names in capitals; everything else is word for word.
 assert.deepEqual(xmb.out.events.map(text=>text.toUpperCase()),labels.map(text=>text.toUpperCase()));
 xmb.dispose();
});

test('laid-out pages draw their headings and timeline, and scroll when long',t=>{
 const {xmb,state}=renderer(t);
 // About is the fourth category: About me, then Experience.
 let now=2000;
 const open=item=>{xmb.setState({...state,cat:3,item:state.item.map((value,i)=>i===3?item:value),view:'detail'});xmb.tick(now+=33);xmb.out.events=[];xmb.draw(2,99,true);return xmb.out.events;};
 assert(open(0).includes('WHAT I DO'),JSON.stringify(xmb.out.events));
 const experience=open(1);
 assert(experience.includes('2024 — Present')&&experience.includes('Résumé'),JSON.stringify(experience));
 assert(xmb.maxScroll>0);
 xmb.dispose();
});
