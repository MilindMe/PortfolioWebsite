import {themes} from './themes';

const themeItem=theme=>({id:`theme-${theme.id}`, label:theme.label, sub:theme.sub, icon:'palette', theme:theme.id});

// Everything the PSP's XMB shows. Edit freely; the screen and the screen-reader copy both read from here.
// Item fields: label, sub (subtitle), icon (see icons.js), detail {title, body, links:[{label,url}]},
// link (opened directly on confirm), photo (path under /public) and caption, or folder (a list of items it opens).
// Settings is generated from themes.js: the colour-only themes sit in the Classics folder, and each game
// experience gets its own item. Theme items carry theme and apply it on confirm.
export const categories = [
 {
  id:'projects', label:'Projects', icon:'code',
  items:[
   {id:'portfolio', label:'PSP Portfolio', sub:'React · three.js', icon:'code',
    detail:{title:'PSP Portfolio', body:'This site. A PSP model rendered with three.js whose screen runs a recreation of the XMB, drawn into a canvas texture and driven by keyboard, touch and the PSP\'s own buttons.\n\nStack: React 19, Vite, three.js, Canvas 2D.',
     links:[{label:'Source', url:'https://github.com/MilindMe'}]}},

   {id:'project-two', label:'Music Wesbite', sub:'Replace with a real project', icon:'code',
    detail:{title:'Project Two', body:'Describe the problem, what you built and what you learned. Keep paragraphs short; the PSP screen is small and scrolls with ↑ ↓.',
     links:[{label:'GitHub', url:'https://github.com/'}, 
      {label:'Live demo', url:'https://example.com/'}]}},

   {id:'project-three', label:'Lalwa', sub:'Replace with a real project', icon:'code',
    detail:{title:'Project Three', body:'Another project write-up. Mention the stack, your role and any numbers that show impact.',
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
   {id:'bio', label:'About me', sub:'Who I am', icon:'sparkles',
    detail:{title:'Hi, I\'m Milind', body:'I\'m a developer who likes building things people can touch and play with. Replace this with a short bio: what you work on, what you care about and what you\'re looking for next.'}},

   {id:'experience', label:'Experience', sub:'Where I\'ve worked', icon:'briefcase',
    detail:{title:'Experience', body:'Role — Company (2024–now)\nWhat you own and a highlight or two.\n\nRole — Company (2022–2024)\nWhat you shipped.'}},

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
   {id:'resume', label:'Résumé', sub:'PDF — add /public/resume.pdf', icon:'file', link:'/resume.pdf'},
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
