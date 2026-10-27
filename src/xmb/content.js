import {themes} from './themes';

const themeItem=theme=>({id:`theme-${theme.id}`, label:theme.label, sub:theme.sub, icon:'palette', theme:theme.id});

// The résumé PDF, linked from About, Experience and Contact. Drop the file at public/resume.pdf.
export const RESUME_URL='/resume.pdf';
const resume={label:'Résumé', url:RESUME_URL, icon:'resume'};

// Everything the PSP's XMB shows. Edit freely; the screen and the screen-reader copy both read from here.
// Item fields: label, sub (subtitle), icon (see icons.js), detail {title, body, links:[{label,url,icon?}]},
// link (opened directly on confirm), photo (path under /public) and caption, or folder (a list of items it opens).
// Settings is generated from themes.js: the colour-only themes sit in the Classics folder, and each game
// experience gets its own item. Theme items carry theme and apply it on confirm.
// A detail can use blocks instead of body for a laid-out page: {type:'h', text} headings, {type:'p', text}
// paragraphs, {type:'list', items:[...]} bullets and {type:'timeline', entries:[{when, role, org, points, current}]}.
// focus marks a page worth reading in full: game experiences tuck their wheel away and the PSP grows back while it's open.
export const categories = [
 {
  id:'projects', label:'Projects', icon:'code',
  items:[
   {id:'portfolio', label:'PSP Portfolio', sub:'React · three.js', icon:'code',
    detail:{title:'PSP Portfolio', focus:true, body:'This site. A PSP model rendered with three.js whose screen runs a recreation of the XMB, drawn into a canvas texture and driven by keyboard, touch and the PSP\'s own buttons.\n\nStack: React 19, Vite, three.js, Canvas 2D.',
     links:[{label:'Source', url:'https://github.com/MilindMe'}]}},

   {id:'project-two', label:'Music Wesbite', sub:'Replace with a real project', icon:'code',
    detail:{title:'Project Two', focus:true, body:'Describe the problem, what you built and what you learned. Keep paragraphs short; the PSP screen is small and scrolls with ↑ ↓.',
     links:[{label:'GitHub', url:'https://github.com/'}, 
      {label:'Live demo', url:'https://example.com/'}]}},

   {id:'project-three', label:'Lalwa', sub:'Replace with a real project', icon:'code',
    detail:{title:'Project Three', focus:true, body:'Another project write-up. Mention the stack, your role and any numbers that show impact.',
     links:[{label:'GitHub', url:'https://github.com/'}]}},

  ],
 },
 {
  id:'games', label:'Games', icon:'game',
  items:[
   {id:'doom', label:'DOOM', sub:'Coming soon', icon:'game',
    detail:{title:'DOOM', body:'The 1993 classic, running in the browser through WebAssembly and drawn straight onto this PSP\'s screen.\n\nComing soon.'}},
   {id:'mini-games', label:'Mini games', sub:'Coming soon', icon:'game',
    detail:{title:'Mini games', body:'Small games built for the PSP screen, playable with the keyboard or the PSP\'s own buttons.\n\nComing soon.'}},
  ],
 },
 {
  id:'memories', label:'Memories', icon:'photo',
  items:[
   {id:'memory-1', label:'First hackathon', sub:'Add /public/memories/hackathon.jpg', icon:'camera', photo:'/memories/hackathon.jpg', caption:'First hackathon — 36 hours, one working demo.'},
   {id:'memory-2', label:'Conference talk', sub:'Add /public/memories/talk.jpg', icon:'camera', photo:'/memories/talk.jpg', caption:'Giving my first conference talk.'},
   {id:'memory-3', label:'Team offsite', sub:'Add /public/memories/offsite.jpg', icon:'camera', photo:'/memories/offsite.jpg', caption:'Team offsite.'},
  ],
 },
 {
  id:'about', label:'About', icon:'user',
  items:[
   {id:'bio', label:'About me', sub:'Who I am', icon:'resume',
    detail:{title:'Hi, I\'m Milind', sub:'Developer · Builder of playable things', focus:true, blocks:[
     {type:'p', text:'I\'m a developer who likes building things people can touch and play with, from product features used every day to experiments like this PSP.'},
     {type:'h', text:'What I do'},
     {type:'p', text:'Replace this with what you work on day to day: the kind of products, the platforms and the problems you enjoy solving.'},
     {type:'h', text:'What I care about'},
     {type:'list', items:['Interfaces that feel fast and considered', 'Clean, well-tested code that teammates enjoy working in', 'Shipping, learning and iterating']},
     {type:'h', text:'Outside of work'},
     {type:'p', text:'Games, music and side projects. Say what you\'re into and what you\'re looking for next.'},
    ], links:[resume]}},

   {id:'experience', label:'Experience', sub:'Where I\'ve worked', icon:'briefcase',
    detail:{title:'Experience', sub:'Most recent first', focus:true, blocks:[
     {type:'timeline', entries:[
      {when:'2024 — Present', role:'Role', org:'Company', current:true, points:['What you own and a highlight or two.', 'An outcome with a number that shows impact.']},
      {when:'2022 — 2024', role:'Role', org:'Company', points:['What you shipped.', 'Something you led or improved.']},
      {when:'2021 — 2022', role:'Intern', org:'Company', points:['What you built and learned.']},
     ]},
    ], links:[resume]}},

   {id:'skills', label:'Skills', sub:'Languages & tools', icon:'wrench',
    detail:{title:'Skills', body:'Languages: JavaScript, TypeScript, Kotlin, Python\nFrontend: React, three.js, CSS\nBackend: Node, REST, SQL\nTools: Git, CI/CD, Figma'}},

   {id:'education', label:'Education', sub:'Studies', icon:'education',
    detail:{title:'Education', body:'Degree — University (Year)\nRelevant coursework, awards or clubs.'}},
  ],
 },
 {
  id:'contact', label:'Contact', icon:'network',
  items:[
   {id:'email', label:'Email', sub:'hello@example.com', icon:'mail', link:'mailto:hello@example.com'},
   {id:'github', label:'GitHub', sub:'github.com/MilindMe', icon:'github', link:'https://github.com/MilindMe'},
   {id:'linkedin', label:'LinkedIn', sub:'Connect with me', icon:'linkedin', link:'https://www.linkedin.com/MilindMeetarbhan'},
   {id:'resume', label:'Résumé', sub:'PDF', icon:'resume', link:RESUME_URL},
  ],
 },
 {
  id:'settings', label:'Settings', icon:'settings',
  items:[
   {id:'classics', label:'Classics', sub:'Colour themes', icon:'folder', folder:themes.filter(theme=>theme.experience==='classic').map(themeItem)},
   ...themes.filter(theme=>theme.experience!=='classic').map(themeItem),
  ],
 },
];
