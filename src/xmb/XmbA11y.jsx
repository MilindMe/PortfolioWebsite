import React from 'react';
import {categories} from './content';
import {currentItem, focusedEntry, itemSub} from './state';

// A detail page as plain text: its body, or its blocks flattened in reading order.
function pageText(detail){
 if(!detail.blocks)return detail.body;
 return detail.blocks.map(block=>block.type==='list'?block.items.join('. '):block.type==='timeline'
  ?block.entries.map(entry=>[entry.role,entry.org,entry.when,...(entry.points??[])].filter(Boolean).join(', ')).join('. '):block.text).join('. ');
}

function DetailBody({detail}){
 if(!detail.blocks)return <p>{detail.body}</p>;
 return detail.blocks.map((block,i)=>block.type==='h'?<h4 key={i}>{block.text}</h4>
  :block.type==='list'?<ul key={i}>{block.items.map(item=><li key={item}>{item}</li>)}</ul>
  :block.type==='timeline'?<ol key={i}>{block.entries.map(entry=><li key={entry.when+entry.role}>
   <strong>{entry.role}</strong>{entry.org?`, ${entry.org}`:''} <time>{entry.when}</time>
   {entry.points&&<ul>{entry.points.map(point=><li key={point}>{point}</li>)}</ul>}
  </li>)}</ol>
  :<p key={i}>{block.text}</p>);
}

function announcement(state){
 const category=categories[state.cat], item=currentItem(state), entry=focusedEntry(state), sub=itemSub(state,entry);
 const prompt=state.unlocked?'':'Select a theme first. ';
 if(state.view==='folder')return `${prompt}${item.label}: ${entry.label}${sub?`, ${sub}`:''}`;
 if(state.view==='detail')return `${item.detail.title}. ${pageText(item.detail)}`;
 if(state.view==='photo')return `Photo: ${item.caption??item.label}`;
 return `${prompt}${category.label}: ${item.label}${sub?`, ${sub}`:''}`;
}

// A hidden, semantic copy of what the PSP screen shows, for screen readers and search engines.
export default function XmbA11y({state}){
 return <section className="sr-only" aria-label="Portfolio contents">
  <p aria-live="polite">{announcement(state)}</p>
  {categories.map(category => <section key={category.id} aria-label={category.label}>
   <h2>{category.label}</h2>
   <ul>{category.items.map(item => <li key={item.id}>
    {item.link ? <a href={item.link} target="_blank" rel="noopener">{item.label}{item.sub ? ` — ${item.sub}` : ''}</a> : <h3>{item.detail?.title ?? item.label}</h3>}
    {item.detail && <DetailBody detail={item.detail} />}
    {item.caption && <p>{item.caption}</p>}
    {item.folder && <ul>{item.folder.map(entry => <li key={entry.id}>{entry.label}</li>)}</ul>}
    {item.detail?.links?.map(link => <a key={link.url + link.label} href={link.url} target="_blank" rel="noopener">{link.label}</a>)}
   </li>)}</ul>
  </section>)}
 </section>;
}
