import * as THREE from 'three';
import {categories} from './content';
import {drawIcon} from './icons';
import {SETTINGS, currentItem, itemSub} from './state';
import {themeColors} from './themes';

// The XMB is laid out in PSP-sized logical units and drawn at 2× into a canvas that textures the screen mesh.
// Cache the menu and page overlay separately so animated menu labels stay beneath the incoming page.
// The soft backdrop redraws at 1×; cached text stays at 2× and pulses animate between the appropriate layers.
export const SCREEN_W=480, SCREEN_H=270;
// ~30 fps while the visitor is active or something is easing, ~12 fps for the idle waves.
const ACTIVE_FRAME=32, IDLE_FRAME=80, ACTIVE_FOR=4000;
const SCALE=2, FONT='"Helvetica Neue", Helvetica, Arial, sans-serif', P5_FONT='Anton, Impact, "Arial Narrow", sans-serif';
const CAT_X=118, CAT_Y=74, CAT_W=78, ROW_H=34, ITEM_Y=CAT_Y+64, ABOVE_Y=CAT_Y-44;
const TEXT='#dadada', BRIGHT='#ffffff', P5_RED='#e5191c';
const BODY_TOP=62, BODY_BOTTOM=222, LINE_H=13, SCROLL_STEP=LINE_H*2;
// An open folder slides its column this far left and lists its entries this far right of the folder icon.
const FOLDER_SHIFT=70, FOLDER_GAP=72;
// GTA skin: a Vice City skyline along the horizon, as [x, width, height] blocks.
const SKYLINE=[[0,34,22],[30,20,40],[48,40,28],[86,16,56],[100,46,34],[150,26,18],[174,38,46],[210,22,30],[236,50,62],[284,30,24],
 [312,24,44],[334,44,30],[376,18,52],[392,40,26],[430,26,38],[454,30,20]], HORIZON=196;
// Black Ops II skin: Nuketown behind the menu, with the focused item in the game's orange.
const NUKETOWN='/experiences/bo2/nuketown.jpg', BO2_ORANGE='#f47b20';

const waves=[
 {y:172,amp:18,len:.008,speed:.22,width:42,alpha:.06},
 {y:180,amp:14,len:.012,speed:.35,width:26,alpha:.09},
 {y:190,amp:10,len:.018,speed:-.5,width:14,alpha:.11},
 {y:198,amp:7,len:.025,speed:.7,width:5,alpha:.16},
];

const clamp01=value=>Math.min(1,Math.max(0,value));
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));

function wrap(ctx,text,width){
 const lines=[];
 for(const paragraph of text.split('\n')){
  let line='';
  for(const word of paragraph.split(' ')){
   const next=line?`${line} ${word}`:word;
   if(line&&ctx.measureText(next).width>width){lines.push(line);line=word;}else line=next;
  }
  lines.push(line);
 }
 return lines;
}

// Lays a detail page out once as positioned ops (text runs, bullet dots and timeline rails), y from the top of the body.
// A plain body is a single paragraph; its line breaks are kept. accent colours headings and the current timeline dot.
function layoutPage(ctx,{body,blocks},width,{accent,headFont,headH}){
 const ops=[];let y=0;
 const text=(value,x,font,color,lineH=LINE_H)=>{
  ctx.font=font;
  for(const line of wrap(ctx,value,width-x)){ops.push({text:line,x,y,font,color});y+=lineH;}
 };
 const bullet=(value,x)=>{ops.push({dot:true,x:x+2,y:y+5.5,r:1.3,color:TEXT});text(value,x+9,`10px ${FONT}`,TEXT);};
 (blocks??[{type:'p',text:body??''}]).forEach((block,i)=>{
  if(i)y+=block.type==='h'?12:6;
  if(block.type==='h'){text(block.text.toUpperCase(),0,headFont,accent,headH);ops.push({rule:true,x:0,y:y,w:24,color:accent});y+=6;}
  else if(block.type==='p')text(block.text,0,`10px ${FONT}`,TEXT);
  else if(block.type==='list')block.items.forEach(item=>bullet(item,2));
  else if(block.type==='timeline'){
   let previous=null;
   block.entries.forEach((entry,j)=>{
    if(j)y+=12;
    const dotY=y+5;
    if(previous!==null)ops.push({rail:true,x:5,y1:previous+5,y2:dotY-5});
    ops.push({dot:true,x:5,y:dotY,r:3.4,color:entry.current?accent:BRIGHT,ring:!entry.current});
    previous=dotY;
    text(entry.when,18,`8.5px ${FONT}`,'rgba(255,255,255,.6)',12);
    text(entry.role,18,`bold 11.5px ${FONT}`,BRIGHT,14);
    if(entry.org)text(entry.org,18,`italic 9.5px ${FONT}`,TEXT,13);
    y+=3;
    entry.points?.forEach(point=>bullet(point,18));
   });
  }
 });
 return {ops,height:y};
}

export class XmbRenderer{
 constructor(reducedMotion){
  const layer=(width,height)=>{const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;return canvas.getContext('2d');};
  // out is the texture; ctx targets the cached menu or overlay while helpers draw; backdrop holds the waves.
  this.out=layer(SCREEN_W*SCALE,SCREEN_H*SCALE);this.canvas=this.out.canvas;
  this.ctx=layer(SCREEN_W*SCALE,SCREEN_H*SCALE);this.overlay=layer(SCREEN_W*SCALE,SCREEN_H*SCALE);this.backdrop=layer(SCREEN_W,SCREEN_H);
  this.texture=new THREE.CanvasTexture(this.canvas);
  this.texture.colorSpace=THREE.SRGBColorSpace;
  // The texture is re-uploaded every frame and shown at about its own size, so mipmaps would cost more than they give.
  this.texture.generateMipmaps=false;this.texture.minFilter=THREE.LinearFilter;
  this.reduced=reducedMotion;
  this.state=null;this.bootAt=null;this.lastTime=0;this.dirty=true;this.minute='';this.moving=false;this.activeUntil=0;this.pulses=[];
  // reveal fades in the categories other than Settings once a theme is picked; folder opens a folder item.
  this.shown={cat:0,items:categories.map(()=>0),detail:0,photo:0,scroll:0,top:null,bottom:null,reveal:0,folder:0,sub:0};
  this.hits=[];this.maxScroll=0;this.photos=new Map();this.wrapped=new Map();this.hover=null;this.skin='xmb';
 }
 setState(state){this.state=state;this.dirty=true;this.poke();}
 // 'xmb' is the PSP's own look; 'persona5' swaps the waves for a starburst and slashes and sets labels in Anton;
 // 'gta' puts a Vice City skyline on the horizon and outlines labels in black like San Andreas' subtitles;
 // 'bo2' shows Nuketown behind the menu and lights the focused item orange.
 // Anton is loaded by the page, but the canvas only picks it up once ready, so redraw when it is.
 setSkin(skin){
  if(skin===this.skin)return;
  this.skin=skin;this.dirty=true;this.poke();
  if(skin==='persona5')document.fonts?.load(`20px ${P5_FONT}`).then(()=>{this.dirty=true;this.poke();},()=>{});
 }
 get p5(){return this.skin==='persona5';}
 get gta(){return this.skin==='gta';}
 get bo2(){return this.skin==='bo2';}
 // San Andreas-style text: a thick black outline under the fill.
 outlined(ctx,text,x,y){ctx.save();ctx.lineWidth=3;ctx.lineJoin='round';ctx.strokeStyle='#000';ctx.strokeText(text,x,y);ctx.restore();ctx.fillText(text,x,y);}
 // Keeps the full frame rate for a while after the visitor does something.
 poke(){this.activeUntil=performance.now()+ACTIVE_FOR;}
 boot(now){if(this.bootAt===null){this.bootAt=now;this.dirty=true;}}
 // The mouse position in logical screen units (or null); clickable things under it get a glow.
 setHover(point){
  if(point?.x===this.hover?.x&&point?.y===this.hover?.y)return;
  this.hover=point?{x:point.x,y:point.y}:null;this.dirty=true;this.poke();
 }
 hovering(x,y,w,h){const p=this.hover;return !!p&&p.x>=x&&p.x<=x+w&&p.y>=y&&p.y<=y+h;}
 glow(x,y,radius){
  const ctx=this.ctx, light=ctx.createRadialGradient(x,y,0,x,y,radius);
  light.addColorStop(0,'rgba(255,240,215,.55)');light.addColorStop(1,'rgba(255,240,215,0)');
  ctx.save();this.noShadow();ctx.fillStyle=light;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);ctx.restore();
 }
 // Returns the action under a point in logical screen units, if any.
 hitTest(x,y){
  for(let i=this.hits.length-1;i>=0;i--){const h=this.hits[i];if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h)return h.action;}
  return null;
 }
 // Advances the animations and redraws when a frame is due; returns whether the texture was updated.
 tick(now){
  const state=this.state;if(!state)return false;
  if(now-this.lastTime<(this.moving||now<this.activeUntil?ACTIVE_FRAME:IDLE_FRAME))return false;
  const dt=Math.min(.1,(now-(this.lastTime||now))/1000);this.lastTime=now;
  const instant=this.reduced.matches, k=instant?1:1-Math.exp(-dt/.07), shown=this.shown;
  let moving=false;
  const ease=(object,key,target)=>{
   object[key]+=(target-object[key])*k;
   if(Math.abs(target-object[key])<.002)object[key]=target;else moving=true;
  };
  ease(shown,'cat',state.cat);
  state.item.forEach((target,i)=>ease(shown.items,i,target));
  // View changes are replacements, not cross-fades: never show the old menu
  // behind a newly opened page (or the old page over the returning menu).
  shown.detail=state.view==='detail'?1:0;
  shown.photo=state.view==='photo'?1:0;
  ease(shown,'scroll',state.scroll);
  ease(shown,'reveal',state.unlocked?1:0);
  ease(shown,'folder',state.view==='folder'?1:0);
  ease(shown,'sub',state.sub??0);
  // Theme changes cross-fade the backdrop colours.
  const [top,bottom]=themeColors(state.theme).map(rgb);
  if(!shown.top){shown.top=top;shown.bottom=bottom;}
  [0,1,2].forEach(i=>{ease(shown.top,i,top[i]);ease(shown.bottom,i,bottom[i]);});
  const minute=new Date().toTimeString().slice(0,5);
  if(minute!==this.minute){this.minute=minute;this.dirty=true;}
  const booted=this.bootAt===null?0:instant?Infinity:(now-this.bootAt)/1000;
  if(booted<1.4)moving=true;
  // The frame that snaps to the target must replace the last eased cache too.
  const changed=this.dirty||moving||this.moving;
  this.moving=moving;
  if(instant&&!changed)return false;
  this.draw(instant?8:now/1000,booted,changed);
  this.dirty=false;this.texture.needsUpdate=true;
  return true;
 }
 photo(src){
  if(!this.photos.has(src)){
   const image=new Image(), entry={image,ok:false,failed:false};
   image.onload=()=>{entry.ok=true;this.dirty=true;};
   image.onerror=()=>{entry.failed=true;this.dirty=true;};
   image.src=src;this.photos.set(src,entry);
  }
  return this.photos.get(src);
 }
 draw(t,booted,changed){
  const out=this.out;
  out.setTransform(SCALE,0,0,SCALE,0,0);
  out.globalAlpha=1;out.globalCompositeOperation='source-over';
  out.fillStyle='#000';out.fillRect(0,0,SCREEN_W,SCREEN_H);
  if(booted<=0){this.hits=[];this.pulses=[];return;}
  this.background(t);
  out.globalAlpha=clamp01(booted/.8);out.drawImage(this.backdrop.canvas,0,0,SCREEN_W,SCREEN_H);out.globalAlpha=1;
  if(changed)this.foreground(booted);
  out.drawImage(this.ctx.canvas,0,0,SCREEN_W,SCREEN_H);
  this.pulse(t);
  if(this.shown.detail>0||this.shown.photo>0)out.drawImage(this.overlay.canvas,0,0,SCREEN_W,SCREEN_H);
  this.pulse(t,true);
 }
 // Everything with blurred shadows: drawn into the cached layer, along with the hit areas.
 foreground(booted){
  const ctx=this.ctx, state=this.state, shown=this.shown;
  const clear=layer=>{
   layer.setTransform(1,0,0,1,0,0);layer.clearRect(0,0,layer.canvas.width,layer.canvas.height);
   layer.setTransform(SCALE,0,0,SCALE,0,0);
   layer.globalAlpha=1;layer.globalCompositeOperation='source-over';
  };
  clear(ctx);clear(this.overlay);
  this.hits=[];this.pulses=[];
  const menu=clamp01((booted-.7)/.6), overlay=Math.max(shown.detail,shown.photo);
  this.status(menu);
  this.menu(menu*(1-overlay),state.view==='menu');
  this.folder(menu*(1-overlay),state.view==='folder');
  // Page backgrounds and text must cover the outgoing menu's animated label.
  this.ctx=this.overlay;
  try{
   if(shown.detail>0)this.detail(shown.detail*menu,state.view==='detail');
   if(shown.photo>0)this.photoView(shown.photo*menu,state.view==='photo');
  }finally{this.ctx=ctx;}
 }
 // The focused item's label and the selected link glow in time; foreground() leaves them out and records them here.
 pulse(t,links=false){
  const ctx=this.out, beat=Math.sin(t*3.2);
  ctx.textAlign='left';ctx.textBaseline='middle';ctx.shadowOffsetX=ctx.shadowOffsetY=0;
  for(const p of this.pulses){
   if(!!p.link!==links)continue;
   ctx.globalAlpha=p.alpha;
   if(p.link){
    ctx.beginPath();ctx.roundRect(p.x,p.y-10,p.width,20,10);
    ctx.shadowColor=`rgba(255,255,255,${.4+.2*beat})`;ctx.shadowBlur=6*SCALE;ctx.fillStyle='rgba(255,255,255,.92)';ctx.fill();
    ctx.shadowColor='transparent';ctx.shadowBlur=0;
    ctx.strokeStyle=ctx.fillStyle='#1b1b1f';drawIcon(ctx,p.icon??'link',p.x+12,p.y,10);
    ctx.font=`10px ${FONT}`;ctx.fillText(p.text,p.x+21,p.y+.5);
   }else{
    ctx.shadowColor=`rgba(255,255,255,${.45+.25*beat})`;ctx.shadowBlur=(4+3*beat)*SCALE;
    ctx.font=p.font;ctx.fillStyle=p.color??BRIGHT;
    if(p.outline){const glow=ctx.shadowColor;ctx.shadowColor='transparent';ctx.lineWidth=3;ctx.lineJoin='round';ctx.strokeStyle='#000';ctx.strokeText(p.text,p.x,p.y);ctx.shadowColor=glow;}
    ctx.fillText(p.text,p.x,p.y);
   }
  }
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.globalAlpha=1;
 }
 // Drawn at 1× into its own canvas and scaled up: the waves are soft, so a quarter of the pixels looks the same.
 background(t){
  const ctx=this.backdrop, color=channels=>`rgb(${channels.map(Math.round).join(',')})`, top=color(this.shown.top), bottom=color(this.shown.bottom);
  ctx.globalAlpha=1;
  const sky=ctx.createLinearGradient(0,0,0,SCREEN_H);sky.addColorStop(0,top);sky.addColorStop(1,bottom);
  ctx.fillStyle=sky;ctx.fillRect(0,0,SCREEN_W,SCREEN_H);
  if(this.p5){this.p5Background(t);return;}
  if(this.gta){this.gtaBackground(t);return;}
  if(this.bo2){this.bo2Background();return;}
  const glow=ctx.createRadialGradient(90,20,0,90,20,260);glow.addColorStop(0,'rgba(255,255,255,.16)');glow.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,0,SCREEN_W,SCREEN_H);
  ctx.globalCompositeOperation='lighter';
  waves.forEach((wave,i)=>{
   const edge=[];
   for(let x=-6;x<=SCREEN_W+6;x+=6)edge.push([x,wave.y+Math.sin(x*wave.len+t*wave.speed+i)*wave.amp+Math.sin(x*wave.len*2.3-t*wave.speed*.7+i*2)*wave.amp*.35]);
   ctx.beginPath();
   edge.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));
   for(let j=edge.length-1;j>=0;j--){const [x,y]=edge[j];ctx.lineTo(x,y+wave.width*(.6+.4*Math.sin(x*.01+t*.3+i)));}
   ctx.closePath();ctx.fillStyle=`rgba(255,255,255,${wave.alpha})`;ctx.fill();
   ctx.beginPath();edge.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));
   ctx.strokeStyle=`rgba(255,255,255,${wave.alpha*2.2})`;ctx.lineWidth=.6;ctx.stroke();
  });
  ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
 }
 // Persona 5: a slowly turning starburst, halftone dots fading across the top and two black slashes.
 p5Background(t){
  const ctx=this.backdrop, cx=390, cy=190, rays=18, turn=t*.12;
  ctx.fillStyle='rgba(0,0,0,.28)';
  for(let i=0;i<rays;i+=2){
   const a=turn+i/rays*Math.PI*2, b=turn+(i+1)/rays*Math.PI*2;
   ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*600,cy+Math.sin(a)*600);ctx.lineTo(cx+Math.cos(b)*600,cy+Math.sin(b)*600);ctx.closePath();ctx.fill();
  }
  ctx.fillStyle='rgba(0,0,0,.35)';
  for(let y=6;y<70;y+=9)for(let x=6;x<300;x+=9){
   const r=2.6*(1-x/300)*(1-y/90);
   if(r>.3){ctx.beginPath();ctx.arc(x+(y/9%2)*4.5,y,r,0,Math.PI*2);ctx.fill();}
  }
  ctx.fillStyle='rgba(0,0,0,.78)';
  ctx.beginPath();ctx.moveTo(0,206);ctx.lineTo(SCREEN_W,150);ctx.lineTo(SCREEN_W,186);ctx.lineTo(0,236);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.85)';
  ctx.beginPath();ctx.moveTo(0,240);ctx.lineTo(SCREEN_W,190);ctx.lineTo(SCREEN_W,193);ctx.lineTo(0,244);ctx.closePath();ctx.fill();
 }
 // GTA: a low sun, the skyline in silhouette and the bay below it, with a slow shimmer on the water.
 gtaBackground(t){
  const ctx=this.backdrop, sun=ctx.createRadialGradient(330,HORIZON-6,0,330,HORIZON-6,120);
  sun.addColorStop(0,'rgba(255,236,190,.55)');sun.addColorStop(1,'rgba(255,236,190,0)');
  ctx.fillStyle=sun;ctx.fillRect(0,0,SCREEN_W,SCREEN_H);
  ctx.fillStyle='rgba(8,52,84,.62)';
  for(const [x,w,h] of SKYLINE)ctx.fillRect(x,HORIZON-h,w,h);
  ctx.fillStyle='rgba(255,226,150,.45)';
  for(const [x,w,h] of SKYLINE)for(let y=HORIZON-h+5;y<HORIZON-4;y+=7)for(let wx=x+4;wx<x+w-4;wx+=7)if((wx*7+y*3)%5<2)ctx.fillRect(wx,y,2,1.5);
  const bay=ctx.createLinearGradient(0,HORIZON,0,SCREEN_H);bay.addColorStop(0,'rgba(6,92,130,.9)');bay.addColorStop(1,'rgba(3,38,64,.95)');
  ctx.fillStyle=bay;ctx.fillRect(0,HORIZON,SCREEN_W,SCREEN_H-HORIZON);
  ctx.fillStyle='rgba(255,255,255,.18)';
  for(let i=0;i<14;i++){const y=HORIZON+6+i*5, x=(i*67+t*(8+i))%(SCREEN_W+60)-30;ctx.fillRect(x,y,26+i*2,1);}
 }
 // Black Ops II: Nuketown (scaled to cover once, then reused), shaded darker on the menu side, like the game's
 // menus over a map. Until the image arrives the theme gradient shows.
 bo2Background(){
  const ctx=this.backdrop, entry=this.photo(NUKETOWN);
  if(entry.ok){
   if(!this.nuketown){
    const {naturalWidth:w,naturalHeight:h}=entry.image, scale=Math.max(SCREEN_W/w,SCREEN_H/h), cover=document.createElement('canvas');
    cover.width=SCREEN_W;cover.height=SCREEN_H;
    cover.getContext('2d').drawImage(entry.image,(SCREEN_W-w*scale)/2,(SCREEN_H-h*scale)/2,w*scale,h*scale);
    this.nuketown=cover;
   }
   ctx.drawImage(this.nuketown,0,0);
  }
  const shade=ctx.createLinearGradient(0,0,SCREEN_W,0);
  shade.addColorStop(0,'rgba(0,0,0,.78)');shade.addColorStop(.55,'rgba(0,0,0,.55)');shade.addColorStop(1,'rgba(0,0,0,.3)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,SCREEN_W,SCREEN_H);
 }
 // A black jagged plate with a white offset shadow, like the page wheel's tag, behind a focused P5 label.
 p5Plate(x,y,width,height){
  const ctx=this.ctx, shape=(dx,dy)=>{
   ctx.beginPath();ctx.moveTo(x+dx,y-height*.55+dy);ctx.lineTo(x+width+dx,y-height*.62+dy);ctx.lineTo(x+width-4+dx,y+dy);ctx.lineTo(x+width+3+dx,y+height*.55+dy);ctx.lineTo(x+3+dx,y+height*.5+dy);ctx.closePath();
  };
  ctx.save();this.noShadow();
  ctx.fillStyle=BRIGHT;shape(2.5,2.5);ctx.fill();
  ctx.fillStyle='#000';shape(0,0);ctx.fill();
  ctx.restore();
 }
 shadow(blur=3){const ctx=this.ctx;ctx.shadowColor='rgba(0,0,0,.65)';ctx.shadowBlur=blur*SCALE;ctx.shadowOffsetX=ctx.shadowOffsetY=SCALE;}
 noShadow(){const ctx=this.ctx;ctx.shadowColor='transparent';ctx.shadowBlur=ctx.shadowOffsetX=ctx.shadowOffsetY=0;}
 status(alpha){
  if(alpha<=0)return;
  const ctx=this.ctx, now=new Date();
  const hours=now.getHours()%12||12, label=`${now.getMonth()+1}/${now.getDate()}  ${hours}:${String(now.getMinutes()).padStart(2,'0')} ${now.getHours()<12?'AM':'PM'}`;
  ctx.globalAlpha=alpha;ctx.font=`10px ${FONT}`;ctx.textBaseline='middle';ctx.textAlign='left';
  const width=ctx.measureText(label).width, x=SCREEN_W-width-44, y=9;
  this.shadow(2);ctx.strokeStyle='rgba(218,218,218,.8)';ctx.lineWidth=.8;
  ctx.beginPath();ctx.moveTo(SCREEN_W,y);ctx.lineTo(x+3,y);ctx.arcTo(x,y,x,y+3,3);ctx.lineTo(x,y+13);ctx.arcTo(x,y+16,x+3,y+16,3);ctx.lineTo(SCREEN_W,y+16);ctx.stroke();
  ctx.fillStyle=TEXT;ctx.fillText(label,x+7,y+8.5);
  const bx=SCREEN_W-30;ctx.strokeRect(bx,y+4.5,17,8);ctx.fillRect(bx+17.5,y+6.5,1.6,4);ctx.fillRect(bx+2,y+6.5,13,4);
  this.noShadow();ctx.globalAlpha=1;
 }
 menu(alpha,interactive){
  if(alpha<=0)return;
  const ctx=this.ctx, state=this.state, shown=this.shown, open=shown.folder;
  ctx.textBaseline='middle';
  categories.forEach((category,c)=>{
   // Until a theme is picked only Settings shows. An open folder slides its column left and fades the others.
   const visible=alpha*(c===SETTINGS?1:shown.reveal)*(c===state.cat?1:1-open);
   const offset=c-shown.cat, x=CAT_X+offset*CAT_W-open*FOLDER_SHIFT, near=clamp01(1-Math.abs(offset));
   if(visible<=.01||x<-CAT_W||x>SCREEN_W+CAT_W)return;
   const live=interactive&&(c===SETTINGS||state.unlocked);
   ctx.globalAlpha=visible*(.6+.35*near);
   if(live&&this.hovering(x-CAT_W/2,CAT_Y-24,CAT_W,46))this.glow(x,CAT_Y,26);
   ctx.strokeStyle=BRIGHT;this.shadow(3);
   drawIcon(ctx,category.icon,x,CAT_Y,30*(.8+.2*near));
   if(near>0){
    ctx.globalAlpha=visible*near;ctx.fillStyle=TEXT;ctx.textAlign='center';
    if(this.p5){ctx.font=`13px ${P5_FONT}`;ctx.fillText(category.label.toUpperCase(),x,CAT_Y+28);}
    else if(this.gta){ctx.font=`bold 11px ${FONT}`;ctx.fillStyle=BRIGHT;this.outlined(ctx,category.label,x,CAT_Y+27);}
    else if(this.bo2){ctx.font=`bold 11px ${FONT}`;ctx.fillStyle=BRIGHT;ctx.fillText(category.label.toUpperCase(),x,CAT_Y+27);}
    else{ctx.font=`11px ${FONT}`;ctx.fillText(category.label,x,CAT_Y+27);}
   }
   if(live)this.hits.push({x:x-CAT_W/2,y:CAT_Y-24,w:CAT_W,h:46,action:{type:'FOCUS',cat:c}});
   const column=clamp01(1-Math.abs(offset)*1.6);
   if(column>0)this.items(category,c,x,visible*column,live&&c===state.cat,c===state.cat?open:0);
  });
  this.noShadow();ctx.globalAlpha=1;
 }
 // open is how far this column's folder is open: the other items fade and the folder keeps only its icon.
 items(category,c,x,alpha,interactive,open=0){
  const position=this.shown.items[c], focused=this.state.item[c];
  category.items.forEach((item,i)=>{
   const d=i-position;
   // Items above the focused one tuck in above the category bar, crossing it with a fade.
   const y=d>=0?ITEM_Y+d*ROW_H:d>-1?ITEM_Y+d*(ITEM_Y-ABOVE_Y):ABOVE_Y+(d+1)*ROW_H;
   if(y<-ROW_H||y>SCREEN_H+ROW_H)return;
   const near=clamp01(1-Math.abs(d)), fade=d<0&&d>-1?Math.abs(d+.5)*2:1, keep=i===focused?1:1-open;
   if(keep<=.01)return;
   this.row(item,x,y,{near,alpha:alpha*fade*(.7+.3*near)*keep,subAlpha:alpha*fade*near,labelAlpha:i===focused?1-open:1,focused:i===focused&&near>.5,
    hit:interactive&&fade>.5?(i===focused?{type:'CONFIRM'}:{type:'FOCUS',cat:c,item:i}):null});
  });
 }
 // An open folder lists its entries to the right of its icon, the focused one level with it, like the PSP's.
 folder(alpha,interactive){
  const open=this.shown.folder, entries=currentItem(this.state)?.folder;
  if(alpha<=0||open<=.01||!entries)return;
  const ctx=this.ctx, state=this.state, x=CAT_X-FOLDER_SHIFT+FOLDER_GAP+(1-open)*24;
  entries.forEach((entry,i)=>{
   const d=i-this.shown.sub, y=ITEM_Y+d*ROW_H, near=clamp01(1-Math.abs(d));
   if(y<CAT_Y-ROW_H||y>SCREEN_H+ROW_H)return;
   this.row(entry,x,y,{near,alpha:alpha*open*(.7+.3*near),subAlpha:alpha*open*near,focused:i===state.sub&&near>.5,
    hit:interactive?(i===state.sub?{type:'CONFIRM'}:{type:'FOCUS',sub:i}):null});
  });
  if(interactive){
   // The folder icon itself closes it again.
   this.hits.push({x:0,y:ITEM_Y-ROW_H/2,w:x-22,h:ROW_H,action:{type:'BACK'}});
   ctx.globalAlpha=alpha*open;this.hint('✕ Apply   ○ Back',true);
  }
  this.noShadow();ctx.globalAlpha=1;
 }
 // One menu row: icon, label (pulsing when focused) and subtitle, plus its hit box when hit is an action.
 row(item,x,y,{near,alpha,subAlpha,labelAlpha=1,focused,hit}){
  const ctx=this.ctx;
  ctx.globalAlpha=alpha;
  if(hit&&this.hovering(x-18,y-ROW_H/2,SCREEN_W-x+18,ROW_H))this.glow(x,y,22);
  ctx.strokeStyle=BRIGHT;this.shadow(3);
  drawIcon(ctx,item.icon,x,y,24*(.7+.3*near));
  if(labelAlpha>.01){
   ctx.globalAlpha=alpha*labelAlpha;ctx.textAlign='left';ctx.fillStyle=near>.5?BRIGHT:TEXT;
   ctx.font=this.p5?`${13+2*near}px ${P5_FONT}`:`${this.gta||this.bo2?'bold ':''}${11+near}px ${FONT}`;
   // Persona 5's taller label and its plate (with the plate's offset shadow) need more room above the subtitle.
   const sub=itemSub(this.state,item), lift=this.p5?8:5, labelY=sub?y-lift*near:y, subY=y+(this.p5?3+7*near:8);
   const label=this.p5?item.label.toUpperCase():item.label;
   if(focused){
    if(this.p5)this.p5Plate(x+20,labelY,ctx.measureText(label).width+14,sub?16:20);
    this.pulses.push({text:label,x:x+26,y:labelY,font:ctx.font,alpha:ctx.globalAlpha,outline:this.gta,color:this.bo2?BO2_ORANGE:undefined});
   }
   else if(this.gta)this.outlined(ctx,label,x+26,labelY);
   else ctx.fillText(label,x+26,labelY);
   if(sub&&near>0){this.shadow(2);ctx.globalAlpha=subAlpha*labelAlpha;ctx.fillStyle=TEXT;ctx.font=`8.5px ${FONT}`;ctx.fillText(sub,x+26,subY);}
  }
  if(hit)this.hits.push({x:x-18,y:y-ROW_H/2,w:SCREEN_W-x+18,h:ROW_H,action:hit});
 }
 detail(alpha,interactive){
  const ctx=this.ctx, state=this.state, item=categories[state.cat].items[state.item[state.cat]], {title,links=[]}=item.detail??{};
  if(!title)return;
  ctx.globalAlpha=alpha;ctx.fillStyle=this.p5?'rgba(12,0,0,.72)':'rgba(0,0,0,.5)';ctx.fillRect(0,0,SCREEN_W,SCREEN_H);
  if(this.p5){ctx.fillStyle=P5_RED;ctx.beginPath();ctx.moveTo(0,14);ctx.lineTo(SCREEN_W*.62,10);ctx.lineTo(SCREEN_W*.58,50);ctx.lineTo(0,52);ctx.closePath();ctx.fill();}
  ctx.strokeStyle=BRIGHT;this.shadow(3);drawIcon(ctx,item.icon,38,34,22);
  ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=BRIGHT;
  if(this.p5){ctx.font=`18px ${P5_FONT}`;ctx.fillText(title.toUpperCase(),58,30);}
  else{ctx.font=`bold 15px ${FONT}`;ctx.fillText(title,58,31);}
  const sub=item.detail.sub??item.sub;
  if(sub){ctx.fillStyle=TEXT;ctx.font=`8.5px ${FONT}`;ctx.fillText(sub,58,45);}
  this.noShadow();ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(28,54,SCREEN_W-56,.6);
  const key=`${item.id}:${this.skin}`;
  if(!this.wrapped.has(key))this.wrapped.set(key,layoutPage(ctx,item.detail,SCREEN_W-68,{
   accent:this.p5?P5_RED:this.bo2?BO2_ORANGE:BRIGHT, headFont:this.p5?`13px ${P5_FONT}`:`bold 9px ${FONT}`, headH:this.p5?17:12}));
  const page=this.wrapped.get(key), view=BODY_BOTTOM-BODY_TOP+(links.length?0:20), total=page.height;
  this.maxScroll=Math.ceil(Math.max(0,total-view)/SCROLL_STEP);
  ctx.save();ctx.beginPath();ctx.rect(0,BODY_TOP,SCREEN_W,view);ctx.clip();
  this.shadow(2);ctx.textBaseline='top';ctx.textAlign='left';
  this.drawPage(page.ops,30,BODY_TOP+4-this.shown.scroll*SCROLL_STEP,BODY_TOP,BODY_TOP+view);
  ctx.restore();this.noShadow();
  if(this.maxScroll>0){
   const track=view-8, thumb=Math.max(16,track*view/total), progress=Math.min(1,this.shown.scroll/this.maxScroll);
   ctx.fillStyle='rgba(255,255,255,.15)';ctx.fillRect(SCREEN_W-24,BODY_TOP+4,2,track);
   ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(SCREEN_W-24,BODY_TOP+4+(track-thumb)*progress,2,thumb);
  }
  ctx.textBaseline='middle';ctx.font=`10px ${FONT}`;
  let x=30;const y=238;
  links.forEach((link,i)=>{
   const width=ctx.measureText(link.label).width+30, selected=i===state.link;
   if(interactive&&this.hovering(x,y-12,width,24))this.glow(x+width/2,y,width*.7);
   if(selected)this.pulses.push({link:true,text:link.label,icon:link.icon,x,y,width,alpha:ctx.globalAlpha});
   else{
    ctx.beginPath();ctx.roundRect(x,y-10,width,20,10);ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=.8;ctx.stroke();
    ctx.strokeStyle=ctx.fillStyle=TEXT;drawIcon(ctx,link.icon??'link',x+12,y,10);
    ctx.textAlign='left';ctx.fillText(link.label,x+21,y+.5);
   }
   if(interactive)this.hits.push({x,y:y-12,w:width,h:24,action:{type:'CONFIRM',link:i}});
   x+=width+8;
  });
  this.hint(links.length?'✕ Open   ○ Back':'○ Back',interactive);
  ctx.globalAlpha=1;
 }
 // Draws a laid-out page at (x, y), skipping ops outside the visible band from top to bottom.
 drawPage(ops,x,y,top,bottom){
  const ctx=this.ctx;
  for(const op of ops){
   if(op.rail){ctx.fillStyle='rgba(255,255,255,.3)';ctx.fillRect(x+op.x-.4,y+op.y1,.8,op.y2-op.y1);continue;}
   const at=y+op.y;
   if(at<top-16||at>bottom+4)continue;
   if(op.rule){ctx.fillStyle=op.color;ctx.globalAlpha*=.7;ctx.fillRect(x+op.x,at,op.w,1);ctx.globalAlpha/=.7;}
   else if(op.dot){
    ctx.beginPath();ctx.arc(x+op.x,at,op.r,0,Math.PI*2);
    if(op.ring){ctx.strokeStyle=op.color;ctx.lineWidth=1.1;ctx.stroke();}else{ctx.fillStyle=op.color;ctx.fill();}
   }
   else{ctx.font=op.font;ctx.fillStyle=op.color;ctx.fillText(op.text,x+op.x,at);}
  }
 }
 hint(label,interactive){
  const ctx=this.ctx;
  ctx.font=`9px ${FONT}`;ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillStyle=TEXT;this.shadow(2);
  ctx.fillText(label,SCREEN_W-28,258);this.noShadow();
  if(interactive)this.hits.push({x:SCREEN_W-90,y:248,w:70,h:20,action:{type:'BACK'}});
 }
 photoView(alpha,interactive){
  const ctx=this.ctx, state=this.state, items=categories[state.cat].items, index=state.item[state.cat], item=items[index];
  if(!item.photo)return;
  ctx.globalAlpha=alpha;ctx.fillStyle='rgba(0,0,0,.92)';ctx.fillRect(0,0,SCREEN_W,SCREEN_H);
  const entry=this.photo(item.photo), area={x:20,y:10,w:SCREEN_W-40,h:224};
  if(entry.ok){
   const {naturalWidth:w,naturalHeight:h}=entry.image, scale=Math.min(area.w/w,area.h/h);
   ctx.drawImage(entry.image,area.x+(area.w-w*scale)/2,area.y+(area.h-h*scale)/2,w*scale,h*scale);
  }else{
   ctx.strokeStyle=TEXT;drawIcon(ctx,'camera',SCREEN_W/2,area.y+area.h/2-12,40);
   ctx.fillStyle=TEXT;ctx.font=`9px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.fillText(entry.failed?`Add a photo at public${item.photo}`:'Loading…',SCREEN_W/2,area.y+area.h/2+24);
  }
  ctx.font=`11px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=BRIGHT;this.shadow(2);
  ctx.fillText(item.caption??item.label,SCREEN_W/2,248);
  ctx.font=`9px ${FONT}`;ctx.fillStyle=TEXT;ctx.textAlign='left';ctx.fillText(`${index+1} / ${items.length}`,28,258);
  if(items.length>1){ctx.font=`20px ${FONT}`;ctx.textAlign='center';ctx.fillText('‹',10,area.y+area.h/2);ctx.fillText('›',SCREEN_W-10,area.y+area.h/2);}
  this.noShadow();
  if(interactive){
   this.hits.push({x:0,y:0,w:SCREEN_W,h:SCREEN_H,action:{type:'BACK'}});
   if(items.length>1)this.hits.push({x:0,y:0,w:70,h:SCREEN_H-30,action:{type:'LEFT'}},{x:SCREEN_W-70,y:0,w:70,h:SCREEN_H-30,action:{type:'RIGHT'}});
  }
  this.hint('○ Back',interactive);
  ctx.globalAlpha=1;
 }
 dispose(){this.texture.dispose();}
}
