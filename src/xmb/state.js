import {categories} from './content';
import {DEFAULT_THEME} from './themes';
import {gameReducer, gameSound, newGame} from './game';

export const SETTINGS=categories.findIndex(category=>category.id==='settings');
// Where the visitor lands once they have picked a theme.
export const START=categories.findIndex(category=>category.id==='about');

// view: 'menu' browses categories, 'detail' shows an item's write-up, 'photo' shows a memory full screen and
// 'folder' lists a folder item's contents, with sub the focused entry inside it, and 'game' plays an item's mini game
// (game.js), with game its state.
// item[] remembers the focused item in every category, like the real XMB. theme is the backdrop (see themes.js).
// Every visit starts on the Start screen (started false): just the backdrop and a Start prompt, which ✕ or a tap
// passes. Then it is locked on Settings: only that category shows until a theme is picked, which sets unlocked.
// Themes don't carry over between visits: every visit starts on Crimson, focused inside the Classics folder.
export function initialXmb(){
 const theme=DEFAULT_THEME, settings=categories[SETTINGS].items;
 const inFolder=settings.findIndex(item=>item.folder?.some(entry=>entry.theme===theme));
 const index=inFolder>=0?inFolder:Math.max(0,settings.findIndex(item=>item.theme===theme));
 const item=categories.map(()=>0);item[SETTINGS]=index;
 const sub=inFolder>=0?settings[inFolder].folder.findIndex(entry=>entry.theme===theme):0;
 return {cat:SETTINGS, item, view:'menu', sub, scroll:0, link:0, theme, started:false, unlocked:false};
}

// Whether the open page is one worth reading in full (detail.focus), so the page clears space around the PSP.
export function readingFocus(state){
 return state.unlocked&&state.view==='detail'&&!!currentItem(state).detail?.focus;
}

export function currentItem(state){
 return categories[state.cat].items[state.item[state.cat]];
}

// The item the visitor is on: a folder's focused entry while it is open, otherwise the current item.
export function focusedEntry(state){
 const item=currentItem(state);
 return state.view==='folder'?item.folder[state.sub]:item;
}

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

function withItem(state,index){
 const item=[...state.item];item[state.cat]=index;
 return {...state,item};
}

const applyTheme=(state,theme)=>({...state,theme,unlocked:true});

// Actions: LEFT RIGHT UP DOWN CONFIRM BACK, FOCUS {cat, item?} (or {sub} in a folder) from taps on the screen and
// GOTO {cat} and OPEN {cat, item}, which opens an item's page from anywhere (the name in the corner opens About me).
// NEXT and PREV come from scrolling the page: they walk down a column and on into the next category (or
// back up into the previous one's last item), scroll a detail page and step through photos and folders.
// DOWN and NEXT carry maxScroll in the detail view because only the renderer knows how tall the text is.
// CONFIRM may carry link (an index) when a link button is tapped directly, and applies a theme item's theme.
// Actions from a PSP button or its key also carry button; in the game view they all go to gameReducer.
// Before Start only CONFIRM does anything, and it starts. While locked, nothing leaves Settings.
export function xmbReducer(state,action){
 if(!state.started)return action.type==='CONFIRM'?{...state,started:true}:state;
 const locked=!state.unlocked;
 // GOTO jumps straight to a category from anywhere, e.g. from the page wheel.
 if(action.type==='GOTO')return locked&&action.cat!==SETTINGS?state:{...state,view:'menu',cat:action.cat};
 if(action.type==='OPEN'){
  if(locked||!categories[action.cat]?.items[action.item]?.detail)return state;
  return {...withItem({...state,cat:action.cat},action.item),view:'detail',scroll:0,link:0};
 }
 const items=categories[state.cat].items, focused=state.item[state.cat], item=items[focused];
 if(state.view==='game'){
  const game=gameReducer(state.game,action);
  return game===state.game?state:game?{...state,game}:{...state,view:'menu',game:null};
 }
 if(state.view==='detail'){
  const links=item.detail.links??[];
  switch(action.type){
   case 'UP':case 'PREV':return {...state,scroll:Math.max(0,state.scroll-1)};
   case 'DOWN':case 'NEXT':return {...state,scroll:clamp(state.scroll+1,0,action.maxScroll??Infinity)};
   case 'LEFT':return {...state,link:clamp(state.link-1,0,Math.max(0,links.length-1))};
   case 'RIGHT':return {...state,link:clamp(state.link+1,0,Math.max(0,links.length-1))};
   case 'CONFIRM':return action.link===undefined?state:{...state,link:action.link};
   case 'BACK':return {...state,view:'menu'};
   default:return state;
  }
 }
 if(state.view==='photo'){
  switch(action.type){
   case 'LEFT':case 'UP':case 'PREV':return withItem(state,(focused-1+items.length)%items.length);
   case 'RIGHT':case 'DOWN':case 'NEXT':return withItem(state,(focused+1)%items.length);
   case 'BACK':case 'CONFIRM':return {...state,view:'menu'};
   default:return state;
  }
 }
 if(state.view==='folder'){
  const last=item.folder.length-1;
  switch(action.type){
   case 'UP':case 'PREV':return {...state,sub:Math.max(0,state.sub-1)};
   case 'DOWN':case 'NEXT':return {...state,sub:Math.min(last,state.sub+1)};
   case 'FOCUS':return action.sub===undefined?state:{...state,sub:clamp(action.sub,0,last)};
   case 'CONFIRM':{const entry=item.folder[state.sub];return entry.theme?applyTheme(state,entry.theme):state;}
   case 'LEFT':case 'BACK':return {...state,view:'menu'};
   default:return state;
  }
 }
 switch(action.type){
  case 'LEFT':return locked?state:{...state,cat:Math.max(0,state.cat-1)};
  case 'RIGHT':return locked?state:{...state,cat:Math.min(categories.length-1,state.cat+1)};
  case 'UP':return withItem(state,Math.max(0,focused-1));
  case 'DOWN':return withItem(state,Math.min(items.length-1,focused+1));
  case 'NEXT':
   if(focused<items.length-1)return withItem(state,focused+1);
   return !locked&&state.cat<categories.length-1?withItem({...state,cat:state.cat+1},0):state;
  case 'PREV':
   if(focused>0)return withItem(state,focused-1);
   return !locked&&state.cat>0?withItem({...state,cat:state.cat-1},categories[state.cat-1].items.length-1):state;
  case 'FOCUS':{
   if(locked&&action.cat!==SETTINGS)return state;
   const next={...state,cat:action.cat};
   return action.item===undefined?next:withItem(next,action.item);
  }
  case 'CONFIRM':
   if(item.detail)return {...state,view:'detail',scroll:0,link:0};
   if(item.photo)return {...state,view:'photo'};
   if(item.folder){
    const active=item.folder.findIndex(entry=>entry.theme===state.theme);
    return {...state,view:'folder',sub:active>=0?active:0};
   }
   if(item.theme)return applyTheme(state,item.theme);
   if(item.game)return {...state,view:'game',game:newGame()};
   return state;
  default:return state;
 }
}

// The subtitle shown for an item; theme items say whether they're in use, and a folder names the one it holds.
export function itemSub(state,item){
 if(item.theme)return item.theme===state.theme?'✓ In use':item.sub??'Select to apply';
 const active=item.folder?.find(entry=>entry.theme===state.theme);
 return active?`✓ ${active.label} in use`:item.sub;
}

// The URL an action should open, if any. Called before dispatching so window.open runs inside the user's gesture.
export function xmbLink(state,action){
 if(action.type!=='CONFIRM'||!state.started)return null;
 const item=currentItem(state);
 if(state.view==='detail')return item.detail.links?.[action.link??state.link]?.url??null;
 if(state.view==='menu'&&!item.detail&&!item.photo&&!item.theme&&!item.folder&&!item.game)return item.link??null;
 return null;
}

// The menu sound an action makes (see sound.js), or null when nothing changed, e.g. pressing up at the top of a list.
// Starting, opening a page, folder or photo and applying a theme say ok, closing one says cancel, and moving the cursor says
// up or down by direction. opened is whether the action opened a link.
export function xmbSound(previous,next,action,opened=false){
 if(previous.view==='game'&&next.view==='game')return gameSound(previous.game,next.game);
 if(opened||next.theme!==previous.theme||next.started!==previous.started)return 'ok';
 if(next.view!==previous.view)return next.view==='menu'?'cancel':'ok';
 const moved=next.cat!==previous.cat||next.item[next.cat]!==previous.item[next.cat]||next.sub!==previous.sub||next.scroll!==previous.scroll||next.link!==previous.link;
 if(!moved)return null;
 return ['UP','LEFT','PREV'].includes(action.type)?'up':'down';
}
