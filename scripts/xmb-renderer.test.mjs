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
const {XmbRenderer,layoutPage}=await import(`data:text/javascript;base64,${Buffer.from(code+'\n//# sourceURL=xmb-renderer-under-test.js').toString('base64')}`);

function canvas(){
 const canvas={width:0,height:0};
 const ctx=new Proxy({canvas,events:[],paints:[],globalAlpha:1,
  clearRect(){this.events=[];this.paints=[];},
  fillText(text){this.events.push(text);this.paints.push({text,alpha:this.globalAlpha,font:this.font});},
  drawImage(source){const layer=source.getContext('2d');this.events.push(...layer.events);this.paints.push(...(layer.paints??[]).map(p=>({...p,alpha:p.alpha*this.globalAlpha})));},
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
 const state={cat:0,item:xmb.shown.items.map(()=>0),view:'menu',sub:0,scroll:0,link:0,theme:'crimson',started:true,unlocked:true};
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
 assert(experience.includes('Sept 2026 – Dec 2026')&&experience.includes('Résumé'),JSON.stringify(experience));
 assert(xmb.maxScroll>0);
 xmb.dispose();
});

test('the Start screen shows only START, and a tap anywhere starts',t=>{
 const {xmb,state}=renderer(t,true);
 xmb.setState({...state,cat:5,started:false,unlocked:false});xmb.shown.start=null;
 xmb.out.events=[];xmb.tick(2000);
 assert(xmb.out.events.includes('START'),JSON.stringify(xmb.out.events));
 assert(!xmb.out.events.includes('Settings'),JSON.stringify(xmb.out.events));
 assert.deepEqual(xmb.hitTest(10,10),{type:'CONFIRM'});
 assert.deepEqual(xmb.hitTest(400,200),{type:'CONFIRM'});
 xmb.dispose();
});

test('a move draws on the next refresh and then at about 60 fps, even on a 144 Hz screen; a still menu drops to 30',t=>{
 const {xmb,state}=renderer(t);
 const refresh=1000/144;let now=5000;
 const run=ms=>{let drawn=0;for(const end=now+ms;now<end;now+=refresh)drawn+=xmb.tick(now)?1:0;return drawn;};
 run(2000);
 xmb.setState({...state,item:state.item.map((v,i)=>i===0?1:v)});
 assert.equal(xmb.tick(now),true,'the change shows on the next refresh');now+=refresh;
 const moving=run(300);
 assert(moving>=16&&moving<=19,`${moving} frames in 300 ms`);
 run(1000);
 const still=run(1000);
 assert(still>=27&&still<=31,`${still} frames in a still second`);
 xmb.dispose();
});

test('a right-floated image sits at the edge, and the text beside it wraps short of it until it passes the image',()=>{
 const ctx={font:'',measureText:text=>({width:text.length*6})};
 const width=412, page=layoutPage(ctx,{blocks:[
  {type:'image',src:'/a.webp',align:'right',width:76},
  {type:'h',text:'University of Waterloo'},
  {type:'p',text:'A long paragraph that has to wrap before it reaches the picture floated on the right of the page, and then carries on below it at full width once it is past the bottom of the image. '.repeat(3)},
 ]},width,{accent:'#fff',headFont:'9px sans-serif',headH:12});
 const image=page.ops.find(op=>op.image);
 assert.deepEqual([image.x,image.y,image.w,image.h],[width-76,0,76,76]);
 const lines=page.ops.filter(op=>op.text);
 for(const line of lines)if(line.y<76)assert(line.x+line.text.length*6<=width-76-12,`"${line.text}" runs under the image`);
 assert(lines.some(line=>line.y>=76&&line.x+line.text.length*6>width-76-12),'text below the image uses the full width');
 assert(page.height>=76);
});

test('a grid lays cards out in columns with equal heights per row',()=>{
 const ctx={font:'',measureText:text=>({width:text.length*6})};
 const page=layoutPage(ctx,{blocks:[{type:'grid',columns:2,items:[
  {image:'/a.webp',title:'One',text:'Short'},{title:'Two',text:'A much longer line of text that wraps over several lines in its card'},{title:'Three'},
 ]}]},412,{accent:'#fff',headFont:'9px sans-serif',headH:12});
 const cards=page.ops.filter(op=>op.card);
 assert.equal(cards.length,3);
 assert.equal(cards[0].y,cards[1].y);assert(cards[1].x>cards[0].x);assert.equal(cards[0].h,cards[1].h);
 assert(cards[2].y>=cards[0].y+cards[0].h,'the third card starts a new row');
 assert(page.ops.some(op=>op.image&&op.src==='/a.webp'&&op.w===cards[0].w));
});

test('Education draws the seal once it loads',async t=>{
 const previous=globalThis.Image;
 // A stand-in Image that "loads" straight away and records itself when drawn.
 globalThis.Image=class{set src(value){this.url=value;this.naturalWidth=this.naturalHeight=256;queueMicrotask(()=>this.onload?.());}getContext(){return {events:[`IMG ${this.url}`]};}};
 t.after(()=>{if(previous===undefined)delete globalThis.Image;else globalThis.Image=previous;});
 const {xmb,state}=renderer(t);
 const about=3, education=3;
 xmb.setState({...state,cat:about,item:state.item.map((value,i)=>i===about?education:value),view:'detail'});xmb.tick(2000);
 await new Promise(resolve=>setTimeout(resolve,0));
 xmb.out.events=[];xmb.draw(2,99,true);
 assert(xmb.out.events.includes('UNIVERSITY OF WATERLOO'),JSON.stringify(xmb.out.events));
 assert(xmb.out.events.includes('IMG /education/uw-seal.webp'),JSON.stringify(xmb.out.events));
 xmb.dispose();
});


for(const hz of [60,144])test(`folder labels clear before the sublist appears, including reversal (${hz} Hz)`,t=>{
 const {xmb,state}=renderer(t);let now=2000,paints=[];
 const tick=()=>{xmb.out.paints=[];const drawn=xmb.tick(now);if(drawn)paints=xmb.out.paints;return drawn;};
 const menu={...state,cat:5,unlocked:false};
 xmb.shown.cat=5;xmb.shown.reveal=0;xmb.setState(menu);tick();
 const opacity=label=>Math.max(0,...paints.filter(p=>p.text.toUpperCase()===label).map(p=>p.alpha));
 const run=ms=>{for(const end=now+ms;now<end;){
  now+=1000/hz;const drawn=tick();
  assert(!(opacity('CLASSICS')>.01&&opacity('CRIMSON')>.01),`overlapping folder labels at ${now} ms`);
  if(drawn&&xmb.state.view==='folder'&&xmb.shown.folder<=.7)assert(!xmb.hits.some(hit=>hit.action.type==='CONFIRM'||hit.action.sub!==undefined),'hidden sublist entries must not be clickable');
 }};
 xmb.setState({...menu,view:'folder'});run(600);
 assert.equal(xmb.shown.folder,1);assert(opacity('CRIMSON')>.9);assert.equal(opacity('CLASSICS'),0);
 xmb.setState(menu);run(600);
 assert.equal(xmb.shown.folder,0);assert(opacity('CLASSICS')>.9);assert.equal(opacity('CRIMSON'),0);
 // Closing and immediately reopening must use the current animation position.
 xmb.setState({...menu,view:'folder'});run(50);xmb.setState(menu);run(25);
 xmb.setState({...menu,view:'folder'});run(600);
 assert.equal(xmb.shown.folder,1);assert(opacity('CRIMSON')>.9);
 xmb.dispose();
});

for(const hz of [60,144])test(`outgoing subtitles clear before the next item's subtitle appears (${hz} Hz)`,t=>{
 const {xmb,state}=renderer(t);let now=2000,paints=[];
 const tick=()=>{xmb.out.paints=[];const drawn=xmb.tick(now);if(drawn)paints=xmb.out.paints;return drawn;};
 xmb.setState(state);tick();
 const subtitles=()=>[...new Set(paints.filter(p=>p.font?.startsWith('8.5px')&&p.alpha>.01).map(p=>p.text))];
 const first=subtitles();assert.equal(first.length,1);
 const next={...state,item:state.item.map((value,i)=>i===0?1:value)};
 const run=ms=>{for(const end=now+ms;now<end;){
  now+=1000/hz;tick();
  assert(subtitles().length<=1,`overlapping subtitles at ${now} ms: ${subtitles()}`);
 }};
 xmb.setState(next);run(600);assert.equal(subtitles().length,1);assert.notDeepEqual(subtitles(),first);
 xmb.setState(state);run(600);assert.deepEqual(subtitles(),first);
 xmb.setState(next);run(50);xmb.setState(state);run(600);assert.deepEqual(subtitles(),first);
 xmb.dispose();
});

test('reduced motion switches folder labels and subtitles immediately',t=>{
 const {xmb,state}=renderer(t,true);let now=2000;
 const menu={...state,cat:5,unlocked:false};
 for(const view of ['menu','folder','menu']){
  xmb.setState({...menu,view});xmb.out.paints=[];xmb.tick(now+=33);
  const visible=xmb.out.paints.filter(p=>p.alpha>.01).map(p=>p.text);
  assert.equal(visible.includes('Classics'),view==='menu');
  assert.equal(visible.includes('Crimson'),view==='folder');
 }
 xmb.dispose();
});


for(const hz of [60,144])test(`category changes do not overlap item-column subtitles (${hz} Hz)`,t=>{
 const {xmb,state}=renderer(t);let now=2000,paints=[];
 const tick=()=>{xmb.out.paints=[];const drawn=xmb.tick(now);if(drawn)paints=xmb.out.paints;return drawn;};
 xmb.shown.reveal=1;xmb.setState(state);tick();
 const subtitles=()=>[...new Set(paints.filter(p=>p.font?.startsWith('8.5px')&&p.alpha>.01).map(p=>p.text))];
 const first=subtitles();assert.equal(first.length,1);
 const run=ms=>{for(const end=now+ms;now<end;){now+=1000/hz;tick();assert(subtitles().length<=1,`overlapping column subtitles: ${subtitles()}`);}};
 xmb.setState({...state,cat:1});run(600);assert.equal(subtitles().length,1);assert.notDeepEqual(subtitles(),first);
 xmb.setState(state);run(600);assert.deepEqual(subtitles(),first);
 xmb.dispose();
});


for(const hz of [60,144])test(`START clears before Settings appears (${hz} Hz)`,t=>{
 const {xmb,state}=renderer(t);let now=2000,paints=[];
 const tick=()=>{xmb.out.paints=[];if(xmb.tick(now))paints=xmb.out.paints;};
 const start={...state,cat:5,started:false,unlocked:false};
 xmb.shown.cat=5;xmb.shown.start=1;xmb.shown.reveal=0;xmb.setState(start);tick();
 const opacity=label=>Math.max(0,...paints.filter(p=>p.text===label).map(p=>p.alpha));
 assert(opacity('START')>.9);assert.equal(opacity('Settings'),0);
 xmb.setState({...start,started:true});
 for(const end=now+600;now<end;){
  now+=1000/hz;tick();
  assert(!(opacity('START')>.01&&opacity('Settings')>.01),`START and Settings overlap at ${now} ms`);
 }
 assert.equal(opacity('START'),0);assert(opacity('Settings')>.9);
 xmb.dispose();
});

test('reduced motion replaces START with Settings immediately',t=>{
 const {xmb,state}=renderer(t,true);
 const start={...state,cat:5,started:false,unlocked:false};
 xmb.shown.start=1;xmb.setState(start);xmb.tick(2000);
 xmb.setState({...start,started:true});xmb.out.paints=[];xmb.tick(2033);
 const visible=xmb.out.paints.filter(p=>p.alpha>.01).map(p=>p.text);
 assert(!visible.includes('START'));assert(visible.includes('Settings'));
 xmb.dispose();
});
