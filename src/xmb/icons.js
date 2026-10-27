// Icon outlines from Lucide (ISC licence, https://lucide.dev), kept as their 24×24 SVG nodes and stroked onto the XMB canvas.
const nodes = {
 game:[['line',{x1:6,y1:11,x2:10,y2:11}],['line',{x1:8,y1:9,x2:8,y2:13}],['line',{x1:15,y1:12,x2:15.01,y2:12}],['line',{x1:18,y1:10,x2:18.01,y2:10}],
  ['path',{d:'M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z'}]],
 photo:[['rect',{x:3,y:3,width:18,height:18,rx:2}],['circle',{cx:9,cy:9,r:2}],['path',{d:'m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21'}]],
 user:[['path',{d:'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'}],['circle',{cx:12,cy:7,r:4}]],
 network:[['circle',{cx:12,cy:12,r:10}],['path',{d:'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20'}],['path',{d:'M2 12h20'}]],
 code:[['path',{d:'M10 10.5 8 13l2 2.5'}],['path',{d:'m14 10.5 2 2.5-2 2.5'}],['path',{d:'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z'}]],
 briefcase:[['path',{d:'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'}],['rect',{x:2,y:6,width:20,height:14,rx:2}]],
 mail:[['rect',{x:2,y:4,width:20,height:16,rx:2}],['path',{d:'m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'}]],
 github:[['path',{d:'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4'}],['path',{d:'M9 18c-4.51 2-5-2-7-2'}]],
 linkedin:[['path',{d:'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z'}],['rect',{x:2,y:9,width:4,height:12}],['circle',{cx:4,cy:4,r:2}]],
 file:[['path',{d:'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'}],['path',{d:'M14 2v4a2 2 0 0 0 2 2h4'}],['path',{d:'M10 9H8'}],['path',{d:'M16 13H8'}],['path',{d:'M16 17H8'}]],
 education:[['path',{d:'M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z'}],['path',{d:'M22 10v6'}],['path',{d:'M6 12.5V16a6 3 0 0 0 12 0v-3.5'}]],
 wrench:[['path',{d:'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'}]],
 sparkles:[['path',{d:'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z'}],['path',{d:'M20 3v4'}],['path',{d:'M22 5h-4'}],['path',{d:'M4 17v2'}],['path',{d:'M5 18H3'}]],
 resume:[['path',{d:'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z'}],['path',{d:'M14 2v4a2 2 0 0 0 2 2h4'}],['path',{d:'M15 18a3 3 0 1 0-6 0'}],['circle',{cx:12,cy:13,r:2}]],
 link:[['path',{d:'M15 3h6v6'}],['path',{d:'M10 14 21 3'}],['path',{d:'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'}]],
 settings:[['path',{d:'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z'}],['circle',{cx:12,cy:12,r:3}]],
 palette:[['circle',{cx:13.5,cy:6.5,r:.5}],['circle',{cx:17.5,cy:10.5,r:.5}],['circle',{cx:8.5,cy:7.5,r:.5}],['circle',{cx:6.5,cy:12.5,r:.5}],['path',{d:'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z'}]],
 folder:[['path',{d:'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z'}]],
 camera:[['path',{d:'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z'}],['circle',{cx:12,cy:13,r:3}]],
};

function toPath([tag,a]){
 // A leading relative moveto is absolute in its own <path>, but not once paths are joined.
 if(tag==='path')return a.d.startsWith('m')?`M0 0${a.d}`:a.d;
 if(tag==='line')return `M${a.x1} ${a.y1}L${a.x2} ${a.y2}`;
 if(tag==='circle')return `M${a.cx-a.r} ${a.cy}a${a.r} ${a.r} 0 1 0 ${a.r*2} 0a${a.r} ${a.r} 0 1 0 ${-a.r*2} 0`;
 const {x,y,width:w,height:h}=a, r=a.rx??0;
 return `M${x+r} ${y}h${w-2*r}${r?`a${r} ${r} 0 0 1 ${r} ${r}`:''}v${h-2*r}${r?`a${r} ${r} 0 0 1 ${-r} ${r}`:''}h${2*r-w}${r?`a${r} ${r} 0 0 1 ${-r} ${-r}`:''}v${2*r-h}${r?`a${r} ${r} 0 0 1 ${r} ${-r}`:''}z`;
}

const cache = new Map();
// Strokes an icon centred on (x, y) at the given size, in the canvas' current style.
export function drawIcon(ctx,name,x,y,size){
 if(!cache.has(name))cache.set(name,new Path2D((nodes[name]??nodes.sparkles).map(toPath).join(' ')));
 const scale=size/24;
 ctx.save();ctx.translate(x-size/2,y-size/2);ctx.scale(scale,scale);
 ctx.lineWidth=1.7;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke(cache.get(name));
 ctx.restore();
}
