import React from 'react';
import {RESUME_FILE, RESUME_URL, categories} from './content';
import {HIDDEN_TROPHY, currentItem, focusedEntry, itemLabel, itemSub} from './state';
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

// Link attributes for the hidden copy: the résumé downloads, everything else opens in a new tab.
const linkProps=url=>url===RESUME_URL?{download:RESUME_FILE}:{target:'_blank',rel:'noopener'};

// A detail page as plain text: its body, or its blocks flattened in reading order.
function pageText(detail){
 if(!detail.blocks)return detail.body;
 return detail.blocks.map(block=>block.type==='list'?block.items.join('. '):block.type==='timeline'
  ?block.entries.map(entry=>[entry.role,entry.org,entry.when,...(entry.points??[])].filter(Boolean).join(', ')).join('. ')
  :block.type==='grid'?block.items.map(item=>[item.title,item.text].filter(Boolean).join(', ')).join('. ')
  :block.type==='image'?block.caption??'':block.text).filter(Boolean).join('. ');
}

function DetailBody({detail}){
 if(!detail.blocks)return <p>{detail.body}</p>;
 return detail.blocks.map((block,i)=>block.type==='h'?<h4 key={i}>{block.text}</h4>
  :block.type==='list'?<ul key={i}>{block.items.map(item=><li key={item}>{item}</li>)}</ul>
  :block.type==='timeline'?<ol key={i}>{block.entries.map(entry=><li key={entry.when+entry.role}>
   <strong>{entry.role}</strong>{entry.org?`, ${entry.org}`:''} <time>{entry.when}</time>
   {entry.points&&<ul>{entry.points.map(point=><li key={point}>{point}</li>)}</ul>}
  </li>)}</ol>
  // Images are described, not embedded, so the hidden copy never downloads them for visitors who don't open the page.
  :block.type==='image'?<figure key={i}>{block.alt&&<span role="img" aria-label={block.alt}/>}{block.caption&&<figcaption>{block.caption}</figcaption>}</figure>
  :block.type==='grid'?<ul key={i}>{block.items.map(item=><li key={item.title}>
   {item.alt&&<span role="img" aria-label={item.alt}/>}<strong>{item.title}</strong>{item.text?` — ${item.text}`:''}
  </li>)}</ul>
  :<p key={i}>{block.text}</p>);
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

// The content itself never changes, so it renders once; only the announcement follows the state.
const Contents=React.memo(function Contents({onMemo}){
 return categories.map(category => <section key={category.id} aria-label={category.label}>
   <h2>{category.label}</h2>
   <ul>{category.items.map(item => <li key={item.id}>
    {item.link ? <a href={item.link} {...linkProps(item.link)}>{item.label}{item.sub ? ` — ${item.sub}` : ''}</a>
     : item.memo ? <button type="button" onClick={onMemo}>{item.label}</button> : <h3>{item.detail?.title ?? item.label}</h3>}
    {item.detail && <DetailBody detail={item.detail} />}
    {item.caption && <p>{item.caption}</p>}
    {item.folder && <ul>{item.folder.map(entry => <li key={entry.id}>{entry.hidden ? HIDDEN_TROPHY : entry.label}</li>)}</ul>}
    {item.detail?.links?.map(link => <a key={link.url + link.label} href={link.url} {...linkProps(link.url)}>{link.label}</a>)}
   </li>)}</ul>
  </section>);
});

// A hidden, semantic copy of what the PSP screen shows, for screen readers and search engines. onMemo opens the
// Leave a memo dialog, as ✕ on its item does.
export default function XmbA11y({state,onMemo}){
 return <section className="sr-only" aria-label="Portfolio contents">
  <p aria-live="polite">{announcement(state)}</p>
  <Contents onMemo={onMemo}/>
 </section>;
}
