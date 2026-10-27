import React from 'react';
import {Briefcase, Camera, Code, FileText, Folder, Gamepad2, Github, GraduationCap, Linkedin, Mail, Palette, Sparkles, Wrench} from 'lucide-react';
import {categories} from '../../xmb/content';
import {useWheelBox} from '../../useWheelBox';

// Lucide components for the item icon names in content.js.
const icons={code:Code,game:Gamepad2,camera:Camera,sparkles:Sparkles,briefcase:Briefcase,wrench:Wrench,education:GraduationCap,
 mail:Mail,github:Github,linkedin:Linkedin,file:FileText,folder:Folder,palette:Palette};
// Loadout slots, in Black Ops II's order; a page's items fill them from the top.
const slots=['Primary','Secondary','Perk 1','Perk 2','Perk 3','Lethal','Tactical','Wildcard'];

// Black Ops II's Choose Class screen in place of a wheel: the site's pages are the classes, and the current page's
// items are its loadout. Clicking a class jumps the PSP there, clicking a loadout slot focuses that item (or opens it
// if it is already focused), and ESC Back backs out. Beside the PSP it stacks; above it (narrow screens) the loadout
// sits to the right of the classes. It slides in when it mounts, after delay ms.
export default function ClassSelect({state,delay=0,onSelect,onAction}){
 const box=useWheelBox(), cat=state.cat, focused=state.item[cat], items=categories[cat].items;
 return <nav className={`class-select${box.width>box.height?' wide':''}`} aria-label="Pages" style={{width:box.width,height:box.height,'--delay':`${delay}ms`}}>
  <div className="class-panel">
   <h2>Choose class</h2>
   <div className="class-progress" aria-hidden="true">
    {categories.map((category,i)=><i key={category.id} className={i<=cat?'on':''}/>)}
    <b>{cat+1}/{categories.length}</b>
   </div>
   <ul className="class-list">
    {categories.map((category,i)=><li key={category.id}>
     <button className={i===cat?'active':''} onClick={()=>onSelect(i)} aria-current={i===cat?'page':undefined}>{category.label}</button>
    </li>)}
   </ul>
   <ul className="class-loadout" key={cat} aria-label={`${categories[cat].label} loadout`}>
    {items.map((item,i)=>{
     const Icon=icons[item.icon]??Sparkles;
     return <li key={item.id}>
      <button className={i===focused?'active':''} onClick={()=>onAction(i===focused?{type:'CONFIRM'}:{type:'FOCUS',cat,item:i})}>
       <small>{slots[i]??'Wildcard'}</small><span>{item.label}</span>
       <i aria-hidden="true"><Icon strokeWidth={1.6}/></i>
      </button>
     </li>;
    })}
   </ul>
   <button className="class-back" onClick={()=>onAction({type:'BACK'})}><b>ESC</b> Back</button>
  </div>
 </nav>;
}
