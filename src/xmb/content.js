import {themes} from './themes';
import {GRADES, trophies} from '../trophies';

const themeItem=theme=>({id:`theme-${theme.id}`, label:theme.label, sub:theme.sub, icon:'palette', theme:theme.id});
// The Trophies folder at the bottom of Settings: every trophy, platinum first and down through the grades, drawn
// greyed out until it is earned, and hidden ones nameless until then (see itemLabel and itemSub in state.js, and
// drawTrophy in src/trophyArt.js).
const trophyItems=Object.entries(trophies).map(([id,{title,grade,hidden}])=>({id:`trophy-${id}`, label:title, trophy:id, grade, hidden:!!hidden}))
 .sort((a,b)=>GRADES.indexOf(b.grade)-GRADES.indexOf(a.grade));

// The résumé PDF, linked from About, Experience, Contact and the quick links. Drop the file at public/resume.pdf;
// it is served as a static file and always downloads (as RESUME_FILE), never opens in a tab (see public/_headers).
export const RESUME_URL='/resume.pdf', RESUME_FILE='Milind-Meetarbhan-Resume.pdf';
const resume={label:'Résumé', url:RESUME_URL, icon:'resume'};

// Everything the PSP's XMB shows. Edit freely; the screen and the screen-reader copy both read from here.
// Item fields: label, sub (subtitle), icon (see icons.js), detail {title, body, links:[{label,url,icon?}]},
// link (opened directly on confirm), photo (path under /public) and caption, folder (a list of items it opens), or
// game (opens the Button Rush mini game, see game.js), or memo (opens the Leave a memo dialog, see src/LeaveMemo.jsx).
// Settings is generated from themes.js: the colour-only themes sit in the Classics folder, and each game
// experience gets its own item. Trophies comes last, listing what the visitor has collected. Theme items carry theme and apply it on confirm.
// A detail can use blocks instead of body for a laid-out page: {type:'h', text} headings, {type:'p', text}
// paragraphs, {type:'list', items:[...]} bullets, {type:'timeline', entries:[{when, role, org, points, current}]},
// {type:'image', src, alt, align, width, height, caption} pictures (align 'left' or 'right' floats it beside the blocks
// that follow; no align is a full-width banner) and {type:'grid', columns, items:[{image, title, text}]} cards.
// See docs/content.md for examples.
// focus marks a page worth reading in full: game experiences tuck their wheel away and the PSP grows back while it's open.
export const categories = [
 {
  id:'projects', label:'Projects', icon:'code',
  items:[
   {id:'portfolio', label:'PSP Portfolio', sub:'React · three.js', icon:'code',
    detail:{title:'PSP Portfolio', focus:true, body:'This site. A PSP model rendered with three.js whose screen runs a recreation of the XMB, drawn into a canvas texture and driven by keyboard, touch and the PSP\'s own buttons.\n\nStack: React 19, Vite, three.js, Canvas 2D.',
     links:[{label:'Source', url:'https://github.com/MilindMe'}]}},

   {id:'twotogether', label:'TwoTogether', sub:'Swift · Python', icon:'code',
    detail:{title:'TwoTogether', focus:true, body:'A habit accountability app for iOS.\n\nStack: Swift, Python.',
     links:[{label:'Source', url:'https://github.com/MilindMe/TwoTogether'}]}},

   {id:'lalwa', label:'Lalwa', sub:'Next.js · Python · Firebase', icon:'code',
    detail:{title:'Lalwa', focus:true, body:'Stack: Next.js, Python, Firebase.'}},

   // A placeholder with nothing to open: ✕ on it does nothing.
   {id:'coming-soon', label:'Updating soon', sub:'More projects on the way', icon:'code'},

  ],
 },
 {
  id:'games', label:'Games', icon:'game',
  items:[
   {id:'button-rush', label:'Button Rush', sub:'Mini game · beat the clock', icon:'game', game:'button-rush'},
  ],
 },
 {
  id:'memories', label:'Memories', icon:'photo',
  items:[
   {id:'leave-memo', label:'Leave a memo', sub:'Have an invite code?', icon:'plus', memo:true},
   {id:'rodrigues', label:'Rodrigues Island', icon:'camera', photo:'/memories/rodrigues.webp', caption:'Rodrigues Island - off the coast of Mauritius'},
  ],
 },
 {
  id:'about', label:'About', icon:'user',
  items:[
   {id:'bio', label:'About me', sub:'Who I am', icon:'resume',
    detail:{title:'Hi, I\'m Milind', sub:'Software Engineer', focus:true, presentation:'editorial', pageLabel:'About me',
     intro:'I’m a developer and AI engineer, with a taste for Design and UX',
     bodyStyle:{bodySize:8,bodyLineH:10.5,blockGap:4},
     backgroundImages:[
      {src:'/about/ambient-wave.svg',x:0,y:202,w:480,h:46.5},
      {src:'/about/wave-ribbon.svg',x:0,y:214,w:480,h:35.25},
      {src:'/about/wave-edge.svg',x:0,y:216,w:480,h:31.875},
     ], blocks:[
     {type:'h', text:'What I do'},
     {type:'p', text:'I’m a Software Engineer and a student at the University of Waterloo.'},
     {type:'p', text:'The work i’m most passionate about are often projects that start from silly, scrappy ideas. I bring products from zero to one, roll out proof of concepts fast and carry them all the way to production.'},
     {type:'p', text:'I’ve been a software engineer in various fields; Consulting, Healthcare/BioTech and Telecommunications.\nIn all of them, I dedicate my time and effort into finding solutions to redundant and boring tasks. I’m the engineer who fixes problems no one realised they could have a solution to.'},
     {type:'p', text:'I keep UX at the heart of all my development.'},
     {type:'p', text:'Software should be useful but also clean and engaging. With AI having reshaped the way we think about code, I find it important to put taste and UX research at the forefront.'},
    ], links:[{...resume,trailingIcon:'link'}]}},

   {id:'experience', label:'Work Experience', icon:'briefcase',
    detail:{title:'Experience', sub:'Most recent first', focus:true, icon:'terminal', linksPosition:'header', blocks:[
     {type:'timeline', layout:'grid', entries:[
      {when:'Sept 2026 – Dec 2026', role:'Software Developer', org:'TextNow – Incoming'},
      {when:'Jan 2026 – Apr 2026', role:'Full Stack AI Developer', org:'Revvity'},
      {when:'May 2025 – Aug 2025', role:'Software Engineer', org:'BDO IT Consulting'},
      {when:'May 2024 – Aug 2024', role:'Software Developer', org:'BDO IT Consulting'},
      {when:'Jul 2023 – Aug 2023', role:'Technology Consultant', org:'PricewaterhouseCoopers'},
     ]},
    ], links:[resume]}},

   {id:'skills', label:'Skills', sub:'Languages & tools', icon:'wrench',
    detail:{title:'Skills', focus:true, body:'Languages: Go, C, C#, TypeScript, Kotlin, Python\nFrameworks & Libraries: React, React Native, Angular, PyTorch, Langchain, LangGraph\nTools: Git, CI/CD, Figma'}},

   {id:'education', label:'Education', sub:'Studies', icon:'education',
    detail:{title:'Education', focus:true, blocks:[
     {type:'image', src:'/education/uw-seal.webp', alt:'University of Waterloo seal', align:'right', width:76},
     {type:'h', text:'University of Waterloo'},
     {type:'p', text:'Combinatorics & Optimization + Statistics'},
     {type:'p', text:'Minor in Computing'},
     {type:'p', text:''},
    //  {type:'image', src:'/education/college-du-saint-esprit.png', alt:'College Du Saint Esprit crest', align:'right', width:76},
    //  {type:'h', text:'College Du Saint Esprit'},
    //  {type:'p', text:'Cambridge A-levels, Cambridge O-levels'},
    ]}},
  ],
 },
 {
  id:'contact', label:'Contact', icon:'network',
  items:[
   {id:'email', label:'Email', sub:'msmeetar@uwaterloo.ca', icon:'mail', link:'mailto:msmeetar@uwaterloo.ca'},
   {id:'github', label:'GitHub', sub:'github.com/MilindMe', icon:'github', link:'https://github.com/MilindMe'},
   {id:'linkedin', label:'LinkedIn', sub:'Connect with me', icon:'linkedin', link:'https://www.linkedin.com/in/milindmeetarbhan/'},
   {id:'resume', label:'Résumé', sub:'PDF', icon:'resume', link:RESUME_URL},
  ],
 },
 {
  id:'settings', label:'Settings', icon:'settings',
  items:[
   {id:'classics', label:'Classics', sub:'Colour themes', icon:'folder', folder:themes.filter(theme=>theme.experience==='classic').map(themeItem)},
   ...themes.filter(theme=>theme.experience!=='classic').map(themeItem),
   {id:'trophies', label:'Trophies', icon:'trophy', folder:trophyItems, trophies:true},
  ],
 },
];
