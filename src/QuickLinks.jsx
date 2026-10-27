import React from 'react';
import {FileDown, Github, Linkedin} from 'lucide-react';
import {RESUME_FILE, RESUME_URL, categories} from './xmb/content';

// Icon-only shortcuts in the top-right corner: GitHub, LinkedIn and a résumé download. The URLs come from the Contact
// items in content.js, so the PSP and these stay in step. Each experience restyles them (see .quick-links in styles.css).
const contact=id=>categories.find(category=>category.id==='contact').items.find(item=>item.id===id)?.link;
const links=[
 {label:'GitHub',url:contact('github'),Icon:Github},
 {label:'LinkedIn',url:contact('linkedin'),Icon:Linkedin},
 {label:'Download résumé (PDF)',url:RESUME_URL,Icon:FileDown,download:true},
];

export default function QuickLinks(){
 return <nav className="quick-links" aria-label="Quick links">
  {links.map(({label,url,Icon,download})=><a key={label} href={url} title={label} aria-label={label}
   {...(download?{download:RESUME_FILE}:{target:'_blank',rel:'noopener'})}>
   <Icon aria-hidden="true" size={18} strokeWidth={1.6}/>
  </a>)}
 </nav>;
}
