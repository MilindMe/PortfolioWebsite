import React, {forwardRef} from 'react';
import {currentItem} from './state';
import {themeColors} from './themes';
import './nativeScreen.css';

function Blocks({detail}){
 if(!detail.blocks)return <p className="native-copy">{detail.body}</p>;
 return detail.blocks.map((block,i)=>{
  if(block.type==='h')return <h3 key={i}>{block.text}</h3>;
  if(block.type==='p')return <p key={i}>{block.text||'\u00a0'}</p>;
  if(block.type==='list')return <ul key={i}>{block.items.map(text=><li key={text}>{text}</li>)}</ul>;
  if(block.type==='image')return <figure key={i} className={block.align?'native-logo':'native-banner'} style={{float:block.align, width:block.align?`${(block.width??72)/4.8}cqw`:undefined}}>
   <img src={block.src} alt={block.alt??''}/>{block.caption&&<figcaption>{block.caption}</figcaption>}
  </figure>;
  if(block.type==='timeline')return <ol className="native-timeline" key={i}>{block.entries.map(entry=><li key={entry.when+entry.role}>
   <time>{entry.when}</time><strong>{entry.role}</strong>{entry.org&&<span>{entry.org}</span>}
   {entry.points&&<ul>{entry.points.map(text=><li key={text}>{text}</li>)}</ul>}
  </li>)}</ol>;
  if(block.type==='grid')return <div className="native-grid" key={i} style={{gridTemplateColumns:`repeat(${block.columns??2},1fr)`}}>{block.items.map(item=><section key={item.title}>
   {item.image&&<img src={item.image} alt={item.alt??''}/>}<h3>{item.title}</h3><p>{item.text}</p>
  </section>)}</div>;
  return null;
 });
}

function About({detail,onAction}){
 const headings=detail.blocks.filter(block=>block.type==='h');
 const practices=detail.blocks.find(block=>block.type==='grid')?.items??[];
 const principles=detail.blocks.find(block=>block.type==='list')?.items??[];
 return <>
  <div className="native-about-waves" aria-hidden="true">{['ambient-wave','wave-ribbon','wave-edge'].map(name=><img key={name} src={`/about/${name}.svg`} alt=""/>)}</div>
  <header className="native-about-status"><span><img src="/about/file-user.svg" alt=""/> About me</span><span>{new Date().toLocaleDateString(undefined,{month:'numeric',day:'numeric'})} &nbsp; {new Date().toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'})} <img src="/about/battery-full.svg" alt="Battery full"/></span></header>
  <div className="native-about-body" data-screen-scroll>
   <p className="native-eyebrow">{detail.sub}</p><h2>{detail.title}</h2>
   <div className="native-about-intro"><p>{detail.blocks[0].text}</p><button className="native-resume" onClick={()=>onAction({type:'CONFIRM',link:0})}>↗ {detail.links[0].label}</button></div>
   <div className="native-about-columns"><section><h3>{headings[0]?.text}</h3>{practices.map(practice=><article key={practice.title}><h4>{practice.title}</h4><p>{practice.text}</p></article>)}</section>
   <section><h3>{headings[1]?.text}</h3><ul>{principles.map(text=><li key={text}>{text}</li>)}</ul></section></div>
  </div>
 </>;
}

// The scene owns positioning. React only updates the semantic content when navigation changes.
const NativeScreen=forwardRef(function NativeScreen({state,experience,onAction,enabled},ref){
 const item=currentItem(state),detail=state.view==='detail'?item.detail:null;
 const colors=themeColors(state.theme);
 return <div ref={ref} className={`native-screen native-${experience.id}${detail?.layout==='about'?' native-about':''}`}
  style={{'--screen-top':colors[0],'--screen-bottom':colors[1]}} data-native-screen data-active={enabled&&!!detail} aria-hidden={!enabled||!detail}>
  {enabled&&detail&&<div className="native-screen-page" key={item.id}>
   {detail.layout==='about'?<About detail={detail} onAction={onAction}/>:<>
    <header className="native-header"><h2>{detail.title}</h2>{(detail.sub??item.sub)&&<p>{detail.sub??item.sub}</p>}</header>
    <div className="native-body" data-screen-scroll><Blocks detail={detail}/></div>
   </>}
   <footer className="native-footer"><nav aria-label="Page links">{detail.links?.map((link,i)=><button key={link.url} className={state.link===i?'selected':''} onClick={()=>onAction({type:'CONFIRM',link:i})}>{link.label}</button>)}</nav>
    <button onClick={()=>onAction({type:'BACK'})}>○ Back</button>
   </footer>
  </div>}
 </div>;
});
export default NativeScreen;
