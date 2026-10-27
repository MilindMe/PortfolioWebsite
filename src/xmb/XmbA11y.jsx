import React from 'react';
import {categories} from './content';
import {currentItem, focusedEntry, itemSub} from './state';

function announcement(state){
 const category=categories[state.cat], item=currentItem(state), entry=focusedEntry(state), sub=itemSub(state,entry);
 const prompt=state.unlocked?'':'Select a theme first. ';
 if(state.view==='folder')return `${prompt}${item.label}: ${entry.label}${sub?`, ${sub}`:''}`;
 if(state.view==='detail')return `${item.detail.title}. ${item.detail.body}`;
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
    {item.detail && <p>{item.detail.body}</p>}
    {item.caption && <p>{item.caption}</p>}
    {item.folder && <ul>{item.folder.map(entry => <li key={entry.id}>{entry.label}</li>)}</ul>}
    {item.detail?.links?.map(link => <a key={link.url + link.label} href={link.url} target="_blank" rel="noopener">{link.label}</a>)}
   </li>)}</ul>
  </section>)}
 </section>;
}
