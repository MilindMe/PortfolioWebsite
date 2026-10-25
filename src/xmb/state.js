import {categories} from './content';
import {savedTheme} from './themes';

// view: 'menu' browses categories, 'detail' shows an item's write-up, 'photo' shows a memory full screen.
// item[] remembers the focused item in every category, like the real XMB. theme is the backdrop (see themes.js).
export function initialXmb(){
 return {cat:0, item:categories.map(()=>0), view:'menu', scroll:0, link:0, theme:savedTheme()};
}

export function currentItem(state){
 return categories[state.cat].items[state.item[state.cat]];
}

const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

function withItem(state,index){
 const item=[...state.item];item[state.cat]=index;
 return {...state,item};
}

// Actions: LEFT RIGHT UP DOWN CONFIRM BACK, FOCUS {cat, item?} from taps on the screen and GOTO {cat}.
// DOWN carries maxScroll in the detail view because only the renderer knows how tall the text is.
// CONFIRM may carry link (an index) when a link button is tapped directly, and applies a theme item's theme.
export function xmbReducer(state,action){
 // GOTO jumps straight to a category from anywhere, e.g. from the page wheel.
 if(action.type==='GOTO')return {...state,view:'menu',cat:action.cat};
 const items=categories[state.cat].items, focused=state.item[state.cat], item=items[focused];
 if(state.view==='detail'){
  const links=item.detail.links??[];
  switch(action.type){
   case 'UP':return {...state,scroll:Math.max(0,state.scroll-1)};
   case 'DOWN':return {...state,scroll:clamp(state.scroll+1,0,action.maxScroll??Infinity)};
   case 'LEFT':return {...state,link:clamp(state.link-1,0,Math.max(0,links.length-1))};
   case 'RIGHT':return {...state,link:clamp(state.link+1,0,Math.max(0,links.length-1))};
   case 'CONFIRM':return action.link===undefined?state:{...state,link:action.link};
   case 'BACK':return {...state,view:'menu'};
   default:return state;
  }
 }
 if(state.view==='photo'){
  switch(action.type){
   case 'LEFT':case 'UP':return withItem(state,(focused-1+items.length)%items.length);
   case 'RIGHT':case 'DOWN':return withItem(state,(focused+1)%items.length);
   case 'BACK':case 'CONFIRM':return {...state,view:'menu'};
   default:return state;
  }
 }
 switch(action.type){
  case 'LEFT':return {...state,cat:Math.max(0,state.cat-1)};
  case 'RIGHT':return {...state,cat:Math.min(categories.length-1,state.cat+1)};
  case 'UP':return withItem(state,Math.max(0,focused-1));
  case 'DOWN':return withItem(state,Math.min(items.length-1,focused+1));
  case 'FOCUS':{
   const next={...state,cat:action.cat};
   return action.item===undefined?next:withItem(next,action.item);
  }
  case 'CONFIRM':
   if(item.detail)return {...state,view:'detail',scroll:0,link:0};
   if(item.photo)return {...state,view:'photo'};
   if(item.theme)return {...state,theme:item.theme};
   return state;
  default:return state;
 }
}

// The URL an action should open, if any. Called before dispatching so window.open runs inside the user's gesture.
// The subtitle shown for an item; theme items say whether they're in use.
export function itemSub(state,item){
 return item.theme?(item.theme===state.theme?'✓ In use':item.sub??'Select to apply'):item.sub;
}

export function xmbLink(state,action){
 if(action.type!=='CONFIRM')return null;
 const item=currentItem(state);
 if(state.view==='detail')return item.detail.links?.[action.link??state.link]?.url??null;
 if(state.view==='menu'&&!item.detail&&!item.photo&&!item.theme)return item.link??null;
 return null;
}
