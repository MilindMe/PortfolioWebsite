import {themeColors} from './themes';

const FONT='Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
const DISPLAY='Anton, Impact, "Arial Narrow", sans-serif';
const WIDTH=1280, HEIGHT=800;

// Figma's 1280 × 800 composition lives in the screen's logical coordinates. All
// assets retain their intrinsic geometry, including the wave edge's stroke bleed.
export const ABOUT_ASSETS=[
 ['ambient-wave',0,551,1280,124],
 ['wave-ribbon',0,584,1280,94],
 ['wave-edge',0,588.5,1280.33,84.9986],
 ['file-user',72,31,23,26],
 ['battery-full',1178,34,30,20],
 ['resume',1044,221,18,20],
 ['arrow-up-right',1141,223,16,16],
 ['cross',1068,748.5,15,15],
 ['circle',1155,750,12,12],
];

export function drawAboutPage(renderer,detail,alpha,interactive,width,height){
 const {ctx,state}=renderer, p5=renderer.p5, gta=renderer.gta, bo2=renderer.bo2;
 const classic=!p5&&!gta&&!bo2;
 const colors=themeColors(state.theme), crimson=state.theme==='crimson';
 const ink=classic?'#fff5f1':'#fff';
 const muted=classic?'#dac0c1':gta?'#c6dce2':bo2?'#bac8c8':'#ddd';
 const accent=classic?'#f3d7d4':p5?'#e5191c':gta?'#ec6fae':'#f47b20';
 const headings=detail.blocks.filter(block=>block.type==='h');
 const practices=detail.blocks.find(block=>block.type==='grid').items;
 const principles=detail.blocks.find(block=>block.type==='list').items;
 ctx.save();renderer.noShadow();
 ctx.scale(width/WIDTH,height/HEIGHT);ctx.globalAlpha=alpha;
 ctx.textAlign='left';ctx.textBaseline='top';
 if(classic){
  const gradient=ctx.createLinearGradient(0,0,0,HEIGHT);
  gradient.addColorStop(0,crimson?'#642a30':colors[0]);
  gradient.addColorStop(.52,crimson?'#26090f':colors[1]);
  gradient.addColorStop(1,crimson?'#17080e':'#080b12');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,WIDTH,HEIGHT);
 }else{
  // Keep each experience's live background visible beneath a readable scrim.
  ctx.fillStyle=p5?'rgba(10,0,0,.86)':'rgba(0,0,0,.8)';ctx.fillRect(0,0,WIDTH,HEIGHT);
  ctx.fillStyle=accent;ctx.fillRect(0,0,8,HEIGHT);
 }
 const asset=([name,x,y,w,h])=>{
  // The renderer also runs without an Image implementation in server tests.
  if(typeof Image==='undefined')return;
  const entry=renderer.photo(`/about/${name}.svg`);
  if(entry.ok)ctx.drawImage(entry.image,x,y,w,h);
 };
 if(classic)ABOUT_ASSETS.slice(0,3).forEach(asset);
 const text=(value,x,y,size,color=ink,weight=400,display=false,tracking=0)=>{
  ctx.font=`${weight} ${size}px ${display?DISPLAY:FONT}`;ctx.fillStyle=color;
  ctx.letterSpacing=`${tracking}px`;
  ctx.fillText(value,x,y);ctx.letterSpacing='0px';
 };
 const label=(value,x,y)=>text(value.toUpperCase(),x,y,13,classic?accent:gta?'#76d9ec':bo2?accent:ink,600,p5,1.5);
 const paragraph=(value,x,y,maxWidth,size=19,lineHeight=28.5,color=ink)=>{
  ctx.font=`400 ${size}px ${FONT}`;
  let line='';
  for(const word of value.split(' ')){
   const next=line?`${line} ${word}`:word;
   if(line&&ctx.measureText(next).width>maxWidth){text(line,x,y,size,color);y+=lineHeight;line=word;}else line=next;
  }
  if(line){text(line,x,y,size,color);y+=lineHeight;}
  return y;
 };
 asset(ABOUT_ASSETS[3]);
 text('About me',107,35.5,14,ink,500);
 const now=new Date(), hours=now.getHours()%12||12;
 text(`${now.getMonth()+1}/${now.getDate()}`,1041,35.5,14,muted);
 text(`${hours}:${String(now.getMinutes()).padStart(2,'0')} ${now.getHours()<12?'AM':'PM'}`,1092,35.5,14);
 asset(ABOUT_ASSETS[4]);

 label(detail.sub,100,112);
 if(p5){
  ctx.fillStyle=accent;ctx.beginPath();ctx.moveTo(88,147);ctx.lineTo(646,139);
  ctx.lineTo(630,213);ctx.lineTo(82,219);ctx.closePath();ctx.fill();
 }
 text(p5?detail.title.toUpperCase():detail.title,100,p5?158:140,60,gta?'#ec6fae':ink,p5?400:500,p5,p5?0:-2.4);
 paragraph(detail.blocks[0].text,100,222,881,23,33.35,muted);

 const button={x:1021,y:231,w:159,h:48};
 const hovered=renderer.hovering(button.x*width/WIDTH,(button.y-24)*height/HEIGHT,button.w*width/WIDTH,button.h*height/HEIGHT);
 ctx.beginPath();ctx.roundRect(button.x,button.y-24,button.w,button.h,p5||bo2?0:28);
 ctx.fillStyle=hovered?gta?'#76d9ec':bo2?accent:'#fff':ink;ctx.fill();
 if(p5||bo2){ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.stroke();}
 asset(ABOUT_ASSETS[5]);text(detail.links[0].label,1074,222.5,14,'#26090f',600);asset(ABOUT_ASSETS[6]);

 ctx.fillStyle=classic?'rgba(255,255,255,.15)':accent;ctx.fillRect(100,287,1080,1);
 label(headings[0].text,100,320);label(headings[1].text,720,320);
 practices.forEach((practice,index)=>{
  const y=360+index*72;
  text(practice.title,100,y,19,ink,500);
  paragraph(practice.text,100,y+30,540,16,22.4,muted);
 });
 let y=360;
 principles.forEach(principle=>{
  ctx.fillStyle=classic?'rgba(243,215,212,.55)':accent;ctx.fillRect(720,y,3,18);
  y=paragraph(principle,737,y,443)+26;
 });
 text(classic?'Classic':p5?'Persona 5':gta?'Grand Theft Auto':'Black Ops II',72,748,13,classic?'#b7979d':muted,400,false,.3);
 asset(ABOUT_ASSETS[7]);text('Open',1091,747.5,14);asset(ABOUT_ASSETS[8]);text('Back',1175,747.5,14,muted);
 ctx.restore();
 renderer.maxScroll=0;
 if(interactive){
  const hit=(x,y,w,h,action)=>renderer.hits.push({x:x*width/WIDTH,y:y*height/HEIGHT,w:w*width/WIDTH,h:h*height/HEIGHT,action});
  hit(button.x,button.y-24,button.w,button.h,{type:'CONFIRM',link:0});
  hit(1052,732,84,48,{type:'CONFIRM',link:0});
  hit(1140,732,84,48,{type:'BACK'});
 }
}
