import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'vite';

// state.js uses extensionless browser-style imports, so bundle it (with the content it reads) before Node imports it.
const entry=`export * from ${JSON.stringify(new URL('../src/xmb/state.js',import.meta.url).pathname)};export {categories} from ${JSON.stringify(new URL('../src/xmb/content.js',import.meta.url).pathname)};`;
const bundle=await build({configFile:false,logLevel:'silent',plugins:[{name:'entry',resolveId:id=>id==='entry'?'\0entry':null,load:id=>id==='\0entry'?entry:null}],
 build:{write:false,minify:false,rollupOptions:{input:'entry',preserveEntrySignatures:'strict',output:{format:'es'}}}});
const output=(Array.isArray(bundle)?bundle:[bundle]).flatMap(result=>result.output);
const {xmbReducer,initialXmb,itemSub,readingFocus,xmbSound,SETTINGS,START,categories}=await import(`data:text/javascript;base64,${Buffer.from(output.find(file=>file.type==='chunk').code).toString('base64')}`);

const last=categories.length-1;
const menu=(cat,item)=>({cat,item:categories.map((category,i)=>i===cat?item:0),view:'menu',sub:0,scroll:0,link:0,theme:'crimson',unlocked:true});
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

test('NEXT and PREV step through photos without leaving the category',()=>{
 const cat=categories.findIndex(category=>category.items.some(item=>item.photo)), count=categories[cat].items.length;
 const photo={...menu(cat,0),view:'photo'};
 assert.deepEqual(focus(xmbReducer(photo,{type:'NEXT'})),[cat,1]);
 assert.deepEqual(focus(xmbReducer(photo,{type:'PREV'})),[cat,count-1]);
});

const settings=categories[SETTINGS].items, classics=settings.findIndex(item=>item.folder), persona5=settings.findIndex(item=>item.theme==='persona5');

test('every visit starts locked on Settings with the last theme focused',()=>{
 const state=initialXmb();
 assert.equal(state.unlocked,false);assert.equal(state.cat,SETTINGS);
 assert.equal(settings[state.item[SETTINGS]].folder?.[state.sub]?.theme??settings[state.item[SETTINGS]].theme,state.theme);
});

test('while locked nothing leaves Settings',()=>{
 const state=initialXmb();
 for(const action of [{type:'LEFT'},{type:'RIGHT'},{type:'GOTO',cat:0},{type:'FOCUS',cat:0}])assert.equal(xmbReducer(state,action).cat,SETTINGS,action.type);
 const top={...state,item:state.item.map((v,i)=>i===SETTINGS?0:v)};
 assert.equal(xmbReducer(top,{type:'PREV'}).cat,SETTINGS);
 const bottom={...state,item:state.item.map((v,i)=>i===SETTINGS?settings.length-1:v)};
 assert.equal(xmbReducer(bottom,{type:'NEXT'}),bottom);
});

test('picking Persona 5 applies it and unlocks the menu',()=>{
 const state={...initialXmb(),item:categories.map((c,i)=>i===SETTINGS?persona5:0)};
 const next=xmbReducer(state,{type:'CONFIRM'});
 assert.equal(next.theme,'persona5');assert.equal(next.unlocked,true);
 assert.equal(xmbReducer(next,{type:'GOTO',cat:START}).cat,START);
});

test('Classics opens as a folder of the colour themes and applies one from inside',()=>{
 const state={...initialXmb(),theme:'cobalt',item:categories.map((c,i)=>i===SETTINGS?classics:0)};
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
