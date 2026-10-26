import * as THREE from 'three';
import {categories} from './content';
import {drawIcon} from './icons';
import {itemSub} from './state';
import {themeColors} from './themes';

// The XMB is laid out in PSP-sized logical units and drawn at 2× into a canvas that textures the screen mesh.
// Cache the menu and page overlay separately so animated menu labels stay beneath the incoming page.
// The soft backdrop redraws at 1×; cached text stays at 2× and pulses animate between the appropriate layers.
export const SCREEN_W=480, SCREEN_H=270;
// ~30 fps while the visitor is active or something is easing, ~12 fps for the idle waves.
const ACTIVE_FRAME=32, IDLE_FRAME=80, ACTIVE_FOR=4000;
const SCALE=2, FONT='"Helvetica Neue", Helvetica, Arial, sans-serif';
const CAT_X=118, CAT_Y=74, CAT_W=78, ROW_H=34, ITEM_Y=CAT_Y+64, ABOVE_Y=CAT_Y-44;
const TEXT='#dadada', BRIGHT='#ffffff';
const BODY_TOP=62, BODY_BOTTOM=222, LINE_H=13, SCROLL_STEP=LINE_H*2;

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
  this.shown={cat:0,items:categories.map(()=>0),detail:0,photo:0,scroll:0,top:null,bottom:null};
  this.hits=[];this.maxScroll=0;this.photos=new Map();this.wrapped=new Map();this.hover=null;
 }
 setState(state){this.state=state;this.dirty=true;this.poke();}
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
    ctx.strokeStyle=ctx.fillStyle='#1b1b1f';drawIcon(ctx,'link',p.x+12,p.y,10);
    ctx.font=`10px ${FONT}`;ctx.fillText(p.text,p.x+21,p.y+.5);
   }else{
    ctx.shadowColor=`rgba(255,255,255,${.45+.25*beat})`;ctx.shadowBlur=(4+3*beat)*SCALE;
    ctx.font=p.font;ctx.fillStyle=BRIGHT;ctx.fillText(p.text,p.x,p.y);
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
  const ctx=this.ctx, state=this.state, shown=this.shown;
  ctx.textBaseline='middle';
  categories.forEach((category,c)=>{
   const offset=c-shown.cat, x=CAT_X+offset*CAT_W, near=clamp01(1-Math.abs(offset));
   if(x<-CAT_W||x>SCREEN_W+CAT_W)return;
   ctx.globalAlpha=alpha*(.6+.35*near);
   if(interactive&&this.hovering(x-CAT_W/2,CAT_Y-24,CAT_W,46))this.glow(x,CAT_Y,26);
   ctx.strokeStyle=BRIGHT;this.shadow(3);
   drawIcon(ctx,category.icon,x,CAT_Y,30*(.8+.2*near));
   if(near>0){ctx.globalAlpha=alpha*near;ctx.fillStyle=TEXT;ctx.font=`11px ${FONT}`;ctx.textAlign='center';ctx.fillText(category.label,x,CAT_Y+27);}
   if(interactive)this.hits.push({x:x-CAT_W/2,y:CAT_Y-24,w:CAT_W,h:46,action:{type:'FOCUS',cat:c}});
   const column=clamp01(1-Math.abs(offset)*1.6);
   if(column>0)this.items(category,c,x,alpha*column,interactive&&c===state.cat);
  });
  this.noShadow();ctx.globalAlpha=1;
 }
 items(category,c,x,alpha,interactive){
  const ctx=this.ctx, position=this.shown.items[c], focused=this.state.item[c];
  category.items.forEach((item,i)=>{
   const d=i-position;
   // Items above the focused one tuck in above the category bar, crossing it with a fade.
   const y=d>=0?ITEM_Y+d*ROW_H:d>-1?ITEM_Y+d*(ITEM_Y-ABOVE_Y):ABOVE_Y+(d+1)*ROW_H;
   if(y<-ROW_H||y>SCREEN_H+ROW_H)return;
   const near=clamp01(1-Math.abs(d)), fade=d<0&&d>-1?Math.abs(d+.5)*2:1;
   ctx.globalAlpha=alpha*fade*(.7+.3*near);
   if(interactive&&fade>.5&&this.hovering(x-18,y-ROW_H/2,SCREEN_W-x+18,ROW_H))this.glow(x,y,22);
   ctx.strokeStyle=BRIGHT;this.shadow(3);
   drawIcon(ctx,item.icon,x,y,24*(.7+.3*near));
   ctx.textAlign='left';ctx.fillStyle=near>.5?BRIGHT:TEXT;ctx.font=`${11+near}px ${FONT}`;
   const sub=itemSub(this.state,item), labelY=sub?y-5*near:y;
   if(i===focused&&near>.5)this.pulses.push({text:item.label,x:x+26,y:labelY,font:ctx.font,alpha:ctx.globalAlpha});
   else ctx.fillText(item.label,x+26,labelY);
   if(sub&&near>0){this.shadow(2);ctx.globalAlpha=alpha*fade*near;ctx.fillStyle=TEXT;ctx.font=`8.5px ${FONT}`;ctx.fillText(sub,x+26,y+8);}
   if(interactive&&fade>.5)this.hits.push({x:x-18,y:y-ROW_H/2,w:SCREEN_W-x+18,h:ROW_H,action:i===focused?{type:'CONFIRM'}:{type:'FOCUS',cat:c,item:i}});
  });
 }
 detail(alpha,interactive){
  const ctx=this.ctx, state=this.state, item=categories[state.cat].items[state.item[state.cat]], {title,body,links=[]}=item.detail??{};
  if(!title)return;
  ctx.globalAlpha=alpha;ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(0,0,SCREEN_W,SCREEN_H);
  ctx.strokeStyle=BRIGHT;this.shadow(3);drawIcon(ctx,item.icon,38,34,22);
  ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillStyle=BRIGHT;ctx.font=`bold 15px ${FONT}`;ctx.fillText(title,58,31);
  if(item.sub){ctx.fillStyle=TEXT;ctx.font=`8.5px ${FONT}`;ctx.fillText(item.sub,58,45);}
  this.noShadow();ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(28,54,SCREEN_W-56,.6);
  ctx.font=`10px ${FONT}`;
  if(!this.wrapped.has(item.id))this.wrapped.set(item.id,wrap(ctx,body,SCREEN_W-68));
  const lines=this.wrapped.get(item.id), view=BODY_BOTTOM-BODY_TOP+(links.length?0:20), total=lines.length*LINE_H;
  this.maxScroll=Math.ceil(Math.max(0,total-view)/SCROLL_STEP);
  ctx.save();ctx.beginPath();ctx.rect(0,BODY_TOP,SCREEN_W,view);ctx.clip();
  this.shadow(2);ctx.fillStyle=TEXT;ctx.textBaseline='top';
  lines.forEach((line,i)=>ctx.fillText(line,30,BODY_TOP+4+i*LINE_H-this.shown.scroll*SCROLL_STEP));
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
   if(selected)this.pulses.push({link:true,text:link.label,x,y,width,alpha:ctx.globalAlpha});
   else{
    ctx.beginPath();ctx.roundRect(x,y-10,width,20,10);ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=.8;ctx.stroke();
    ctx.strokeStyle=ctx.fillStyle=TEXT;drawIcon(ctx,'link',x+12,y,10);
    ctx.textAlign='left';ctx.fillText(link.label,x+21,y+.5);
   }
   if(interactive)this.hits.push({x,y:y-12,w:width,h:24,action:{type:'CONFIRM',link:i}});
   x+=width+8;
  });
  this.hint(links.length?'✕ Open   ○ Back':'○ Back',interactive);
  ctx.globalAlpha=1;
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
