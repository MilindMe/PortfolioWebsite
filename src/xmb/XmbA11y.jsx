import React from 'react';
import {categories} from './content';
import PortfolioContents from './PortfolioContents';
import {currentItem, focusedEntry, itemLabel, itemSub} from './state';
import {BUTTON_LABELS, ROUNDS} from './game';

// What Button Rush is showing: the rules, the round's sequence and progress, or how it ended.
function gameText({status,round,seq,pos}){
 const of=`Round ${round+1} of ${ROUNDS.length}`;
 if(status==='title')return 'Button Rush. Press the buttons shown, in order. Arrow keys are the D-pad; I, J, K and L are Triangle, Square, Cross and Circle. Press Cross to start, Circle to leave.';
 if(status==='ready')return `${of}. Get ready.`;
 if(status==='play')return `${of}: ${seq.slice(pos).map(button=>BUTTON_LABELS[button]).join(', ')}. ${pos} of ${seq.length} done.`;
 if(status==='lost')return `Time's up on round ${round+1}. Press Cross to try again, Circle to leave.`;
 return `All ${ROUNDS.length} rounds cleared. Press Cross to play again, Circle to leave.`;
}

// A detail page as plain text: its body, or its blocks flattened in reading order.
function pageText(detail){
 if(!detail.blocks)return detail.body;
 return detail.blocks.map(block=>block.type==='list'?block.items.join('. '):block.type==='timeline'
  ?block.entries.map(entry=>[entry.role,entry.org,entry.when,...(entry.points??[])].filter(Boolean).join(', ')).join('. ')
  :block.type==='grid'?block.items.map(item=>[item.title,item.text].filter(Boolean).join(', ')).join('. ')
  :block.type==='image'?block.caption??'':block.text).filter(Boolean).join('. ');
}

function announcement(state){
 if(!state.started)return 'Press Cross or Enter, or tap the PSP screen, to begin.';
 const category=categories[state.cat], item=currentItem(state), entry=focusedEntry(state), sub=itemSub(state,entry);
 const prompt=state.unlocked?'':'Select a theme first. ';
 if(state.view==='folder')return `${prompt}${item.label}: ${itemLabel(state,entry)}${sub?`, ${sub}`:''}`;
 if(state.view==='detail')return `${item.detail.title}. ${pageText(item.detail)}`;
 if(state.view==='photo')return `Photo: ${item.caption??item.label}`;
 if(state.view==='game')return gameText(state.game);
 return `${prompt}${category.label}: ${item.label}${sub?`, ${sub}`:''}`;
}

// A hidden, semantic copy of what the PSP screen shows, for screen readers and search engines. onMemo opens the
// Leave a memo dialog, as ✕ on its item does.
export default function XmbA11y({state,onMemo}){
 return <>
  <p className="sr-only" aria-live="polite">{announcement(state)}</p>
  <PortfolioContents className="sr-only" onMemo={onMemo}/>
 </>;
}
