import React from 'react';
import {RESUME_FILE, RESUME_URL, categories} from './content';

// Shared by the initial HTML, readable preview and live screen-reader copy.
const HIDDEN_TROPHY='Hidden Trophy';
// Link attributes for the hidden copy: the résumé downloads, everything else opens in a new tab.
const linkProps=url=>url===RESUME_URL?{download:RESUME_FILE}:{target:'_blank',rel:'noopener'};

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

// Menu state changes do not require re-rendering the static content.
const Contents=React.memo(function Contents({onMemo}){
 return categories.map(category => <section key={category.id} aria-label={category.label}>
   <h2>{category.label}</h2>
   <ul>{category.items.map(item => <li key={item.id}>
    {item.link ? <a href={item.link} {...linkProps(item.link)}>{item.label}{item.sub ? ` — ${item.sub}` : ''}</a>
     : item.memo ? <button type="button" disabled={!onMemo} onClick={onMemo}>{item.label}</button> : <h3>{item.detail?.title ?? item.label}</h3>}
    {item.detail && <DetailBody detail={item.detail} />}
    {item.caption && <p>{item.caption}</p>}
    {item.folder && <ul>{item.folder.map(entry => <li key={entry.id}>{entry.hidden ? HIDDEN_TROPHY : entry.label}</li>)}</ul>}
    {item.detail?.links?.map(link => <a key={link.url + link.label} href={link.url} {...linkProps(link.url)}>{link.label}</a>)}
   </li>)}</ul>
  </section>);
});

export default function PortfolioContents({onMemo,className}){
 return <section className={className} aria-label="Portfolio contents">
  <h1>Milind Meetarbhan</h1>
  <Contents onMemo={onMemo}/>
 </section>;
}
