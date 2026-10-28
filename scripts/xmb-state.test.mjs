import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'vite';

// state.js uses extensionless browser-style imports, so bundle it (with the content it reads) before Node imports it.
const entry=`export * from ${JSON.stringify(new URL('../src/xmb/state.js',import.meta.url).pathname)};export {categories} from ${JSON.stringify(new URL('../src/xmb/content.js',import.meta.url).pathname)};`;
const bundle=await build({configFile:false,logLevel:'silent',plugins:[{name:'entry',resolveId:id=>id==='entry'?'\0entry':null,load:id=>id==='\0entry'?entry:null}],
 build:{write:false,minify:false,rollupOptions:{input:'entry',preserveEntrySignatures:'strict',output:{format:'es'}}}});
const output=(Array.isArray(bundle)?bundle:[bundle]).flatMap(result=>result.output);
const {xmbReducer,initialXmb,itemLabel,itemSub,readingFocus,trophiesFor,xmbLink,xmbOpensMemo,xmbSound,SETTINGS,START,categories}=await import(`data:text/javascript;base64,${Buffer.from(output.find(file=>file.type==='chunk').code).toString('base64')}`);

const last=categories.length-1;
const menu=(cat,item)=>({cat,item:categories.map((category,i)=>i===cat?item:0),view:'menu',sub:0,scroll:0,link:0,theme:'crimson',started:true,unlocked:true});
// A visit past its Start screen, locked on Settings.
const begun=()=>({...initialXmb(),started:true});
const focus=state=>[state.cat,state.item[state.cat]];

test('NEXT walks down a column, then on to the next category\'s first item',()=>{
 assert.deepEqual(focus(xmbReducer(menu(0,0),{type:'NEXT'})),[0,1]);
 assert.deepEqual(focus(xmbReducer(menu(0,categories[0].items.length-1),{type:'NEXT'})),[1,0]);
});

test('PREV walks up a column, then back to the previous category\'s last item',()=>{
 assert.deepEqual(focus(xmbReducer(menu(1,1),{type:'PREV'})),[1,0]);
 assert.deepEqual(focus(xmbReducer(menu(1,0),{type:'PREV'})),[0,categories[0].items.length-1]);
});

test('NEXT and PREV stop at both ends of the menu',()=>{
 const start=menu(0,0), end=menu(last,categories[last].items.length-1);
 assert.equal(xmbReducer(start,{type:'PREV'}),start);
 assert.equal(xmbReducer(end,{type:'NEXT'}),end);
});

test('NEXT and PREV scroll a detail page within its limit',()=>{
 const detail={...menu(0,0),view:'detail'};
 assert.equal(xmbReducer(detail,{type:'NEXT',maxScroll:2}).scroll,1);
 assert.equal(xmbReducer({...detail,scroll:2},{type:'NEXT',maxScroll:2}).scroll,2);
 assert.equal(xmbReducer({...detail,scroll:1},{type:'PREV'}).scroll,0);
 assert.equal(xmbReducer(detail,{type:'PREV'}).scroll,0);
});

test('NEXT and PREV step through photos without leaving the category, skipping items that aren\'t photos',()=>{
 const cat=categories.findIndex(category=>category.items.some(item=>item.photo)), items=categories[cat].items;
 const photos=items.flatMap((item,i)=>item.photo?[i]:[]);
 const photo={...menu(cat,photos[0]),view:'photo'};
 const next=xmbReducer(photo,{type:'NEXT'});
 assert.deepEqual(focus(next),[cat,photos[1%photos.length]]);assert.equal(next.view,'photo');
 assert.deepEqual(focus(xmbReducer(photo,{type:'PREV'})),[cat,photos.at(-1)]);
 // A made-up category of a photo, a memo item and another photo steps straight between the photos.
 const mixed=[{photo:'/a.webp'},{memo:true},{photo:'/b.webp'}];
 const saved=categories[cat].items;categories[cat].items=mixed;
 try{
  assert.deepEqual(focus(xmbReducer({...menu(cat,0),view:'photo'},{type:'NEXT'})),[cat,2]);
  assert.deepEqual(focus(xmbReducer({...menu(cat,2),view:'photo'},{type:'NEXT'})),[cat,0]);
  assert.deepEqual(focus(xmbReducer({...menu(cat,0),view:'photo'},{type:'PREV'})),[cat,2]);
 }finally{categories[cat].items=saved;}
});

test('✕ on Memories\' Leave a memo item opens the memo dialog, and nothing else does',()=>{
 const cat=categories.findIndex(category=>category.id==='memories'), item=categories[cat].items.findIndex(item=>item.memo);
 assert(item>=0,'Memories has a Leave a memo item');
 const on=menu(cat,item), confirm={type:'CONFIRM'};
 assert(xmbOpensMemo(on,confirm));
 // The menu stays where it is underneath, and it isn't a link.
 assert.equal(xmbReducer(on,confirm),on);assert.equal(xmbLink(on,confirm),null);
 assert(!xmbOpensMemo(on,{type:'DOWN'}));
 assert(!xmbOpensMemo({...on,unlocked:false},confirm));
 assert(!xmbOpensMemo({...on,started:false},confirm));
 assert(!xmbOpensMemo(menu(cat,item===0?1:0),confirm));
 assert.equal(xmbSound(on,xmbReducer(on,confirm),confirm,true),'ok');
});

const settings=categories[SETTINGS].items, classics=settings.findIndex(item=>item.folder), persona5=settings.findIndex(item=>item.theme==='persona5');

test('every visit starts on the Start screen, which only ✕ passes',()=>{
 const state=initialXmb();
 assert.equal(state.started,false);
 for(const action of [{type:'DOWN'},{type:'NEXT'},{type:'BACK'},{type:'GOTO',cat:SETTINGS},{type:'FOCUS',cat:SETTINGS,item:0}])assert.equal(xmbReducer(state,action),state,action.type);
 const started=xmbReducer(state,{type:'CONFIRM'});
 assert.equal(started.started,true);assert.equal(started.theme,state.theme);assert.equal(started.unlocked,false);
 assert.equal(xmbSound(state,started,{type:'CONFIRM'}),'ok');
});

test('after Start it is locked on Settings with Crimson in use and focused',()=>{
 const state=begun();
 assert.equal(state.unlocked,false);assert.equal(state.cat,SETTINGS);assert.equal(state.theme,'crimson');
 assert.equal(settings[state.item[SETTINGS]].folder?.[state.sub]?.theme??settings[state.item[SETTINGS]].theme,state.theme);
});

test('while locked nothing leaves Settings',()=>{
 const state=begun();
 for(const action of [{type:'LEFT'},{type:'RIGHT'},{type:'GOTO',cat:0},{type:'FOCUS',cat:0}])assert.equal(xmbReducer(state,action).cat,SETTINGS,action.type);
 const top={...state,item:state.item.map((v,i)=>i===SETTINGS?0:v)};
 assert.equal(xmbReducer(top,{type:'PREV'}).cat,SETTINGS);
 const bottom={...state,item:state.item.map((v,i)=>i===SETTINGS?settings.length-1:v)};
 assert.equal(xmbReducer(bottom,{type:'NEXT'}),bottom);
});

test('picking Persona 5 applies it and unlocks the menu',()=>{
 const state={...begun(),item:categories.map((c,i)=>i===SETTINGS?persona5:0)};
 const next=xmbReducer(state,{type:'CONFIRM'});
 assert.equal(next.theme,'persona5');assert.equal(next.unlocked,true);
 assert.equal(xmbReducer(next,{type:'GOTO',cat:START}).cat,START);
});

test('Classics opens as a folder of the colour themes and applies one from inside',()=>{
 const state={...begun(),theme:'cobalt',item:categories.map((c,i)=>i===SETTINGS?classics:0)};
 const open=xmbReducer(state,{type:'CONFIRM'}), folder=settings[classics].folder;
 assert.equal(open.view,'folder');assert.equal(folder[open.sub].theme,'cobalt');
 assert(folder.every(entry=>entry.theme&&entry.theme!=='persona5'));
 assert.equal(itemSub(state,settings[classics]),'✓ Cobalt in use');
 const down=xmbReducer(open,{type:'NEXT'}), picked=xmbReducer(down,{type:'CONFIRM'});
 assert.equal(picked.theme,folder[open.sub+1].theme);assert.equal(picked.unlocked,true);assert.equal(picked.view,'folder');
 assert.equal(xmbReducer(open,{type:'FOCUS',sub:0}).sub,0);
 assert.equal(xmbReducer(open,{type:'BACK'}).view,'menu');assert.equal(xmbReducer(open,{type:'LEFT'}).view,'menu');
});

test('OPEN opens an item\'s page from anywhere once a theme is picked',()=>{
 const bio=categories[START].items.findIndex(item=>item.id==='bio');
 const opened=xmbReducer(menu(0,1),{type:'OPEN',cat:START,item:bio});
 assert.deepEqual([opened.cat,opened.item[START],opened.view,opened.scroll,opened.link],[START,bio,'detail',0,0]);
 const locked={...menu(SETTINGS,0),unlocked:false};
 assert.equal(xmbReducer(locked,{type:'OPEN',cat:START,item:bio}),locked);
});

test('About me and Experience are reading pages; menus and locked states are not',()=>{
 for(const id of ['bio','experience']){
  const item=categories[START].items.findIndex(entry=>entry.id===id);
  assert.equal(readingFocus({...menu(START,item),view:'detail'}),true,id);
  assert.equal(readingFocus(menu(START,item)),false,id);
 }
 assert.equal(readingFocus({...menu(START,0),view:'detail',unlocked:false}),false);
});

test('menu sounds follow what the action changed',()=>{
 const sound=(state,action)=>xmbSound(state,xmbReducer(state,action),action);
 assert.equal(sound(menu(0,1),{type:'UP'}),'up');
 assert.equal(sound(menu(0,0),{type:'DOWN'}),'down');
 assert.equal(sound(menu(1,0),{type:'LEFT'}),'up');
 assert.equal(sound(menu(0,0),{type:'CONFIRM'}),'ok');
 assert.equal(sound({...menu(0,0),view:'detail'},{type:'BACK'}),'cancel');
 // Nothing to move to, nothing to hear.
 assert.equal(sound(menu(0,0),{type:'UP'}),null);
 assert.equal(sound(menu(0,0),{type:'BACK'}),null);
 // Opening a link from the menu.
 assert.equal(xmbSound(menu(0,0),menu(0,0),{type:'CONFIRM'},true),'ok');
});

test('Button Rush opens from Games, keeps the menu where it was and closes with Home',()=>{
 const games=categories.findIndex(category=>category.id==='games'), rush=categories[games].items.findIndex(item=>item.game);
 const open=xmbReducer(menu(games,rush),{type:'CONFIRM',button:'cross'});
 assert.equal(open.view,'game');assert.equal(open.game.status,'title');
 assert.equal(xmbReducer(open,{type:'LEFT',button:'left'}),open);
 const closed=xmbReducer(open,{type:'BACK',button:'home'});
 assert.deepEqual([closed.view,closed.game,...focus(closed)],['menu',null,games,rush]);
});

test('trophies: opening About pages and projects, playing Button Rush and switching theme',()=>{
 const about=categories[START].items, open=(cat,id)=>{const item=categories[cat].items.findIndex(entry=>entry.id===id);return xmbReducer(menu(cat,item),{type:'CONFIRM'});};
 for(const [id,trophy] of [['bio','about-me'],['experience','experience'],['skills','skills'],['education','education']])
  assert.deepEqual(trophiesFor(menu(START,0),open(START,id)),[trophy],id);
 const projects=categories.findIndex(category=>category.id==='projects');
 assert.deepEqual(trophiesFor(menu(projects,0),xmbReducer(menu(projects,0),{type:'CONFIRM'})),['projects']);
 const detail=open(START,'bio');
 assert.deepEqual(trophiesFor(detail,xmbReducer(detail,{type:'DOWN',maxScroll:5})),[],'scrolling an open page earns nothing');
 const title={...menu(1,0),view:'game',game:{status:'title',round:0}}, ready={...title,game:{status:'ready',round:0}};
 assert.deepEqual(trophiesFor(title,ready),['first-game']);
 assert.deepEqual(trophiesFor({...title,game:{status:'play',round:0}},{...title,game:{status:'ready',round:1}}),[],'the next round is not a new game');
 assert.deepEqual(trophiesFor({...title,game:{status:'play',round:3}},{...title,game:{status:'won',round:3}}),['button-rush']);
 const first={...begun(),item:categories.map((c,i)=>i===SETTINGS?persona5:0)};
 const picked=xmbReducer(first,{type:'CONFIRM'});
 assert.deepEqual(trophiesFor(first,picked),[],'the first theme is not a switch');
 assert.deepEqual(trophiesFor(picked,{...picked,theme:'gta'}),['new-theme']);
 assert.equal(about.length>0,true);
});

test('Settings ends with Trophies: every trophy, platinum first, counted and ticked as they are earned',()=>{
 const folder=settings.at(-1);
 assert.equal(folder.id,'trophies');
 assert.equal(folder.folder[0].grade,'platinum');
 const store=new Map();
 globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value))};
 try{
  const total=folder.folder.length, about=folder.folder.find(entry=>entry.trophy==='about-me');
  assert.equal(itemSub(begun(),folder),`0 / ${total} collected`);
  assert(!itemSub(begun(),about).startsWith('✓'));
  // Unknown ids left over in storage don't count.
  store.set('trophies-earned',JSON.stringify(['about-me','retired-trophy']));
  assert.equal(itemSub(begun(),folder),`1 / ${total} collected`);
  assert(itemSub(begun(),about).startsWith('✓ '));
 }finally{delete globalThis.localStorage;}
 // Opening it lists the trophies; ✕ on one changes nothing, and ○ closes it.
 const open=xmbReducer({...begun(),item:begun().item.map((item,i)=>i===SETTINGS?settings.length-1:item),unlocked:true},{type:'CONFIRM'});
 assert.equal(open.view,'folder');
 assert.equal(xmbReducer(open,{type:'CONFIRM'}),open);
 assert.equal(xmbReducer(open,{type:'BACK'}).view,'menu');
});

test('hidden trophies keep their name and what earns them secret until earned',()=>{
 const entries=settings.at(-1).folder, hidden=entries.filter(entry=>entry.hidden);
 assert(hidden.length>0&&hidden.length<entries.length,'some trophies are hidden, not all');
 assert(!entries[0].hidden,'the platinum stays visible as the goal');
 const store=new Map();
 globalThis.localStorage={getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value))};
 try{
  const entry=hidden[0];
  assert.equal(itemLabel(begun(),entry),'Hidden Trophy');
  assert(!itemSub(begun(),entry).includes(entry.label));
  store.set('trophies-earned',JSON.stringify([entry.trophy]));
  assert.equal(itemLabel(begun(),entry),entry.label);
  assert(itemSub(begun(),entry).startsWith('✓ '));
  const shown=entries.find(entry=>!entry.hidden&&entry.grade!=='platinum');
  store.clear();
  assert.equal(itemLabel(begun(),shown),shown.label);
 }finally{delete globalThis.localStorage;}
});
