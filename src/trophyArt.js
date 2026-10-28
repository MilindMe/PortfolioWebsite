// PlayStation-style trophy art, shared by the XMB's Trophies folder (drawTrophy on its canvas) and the page's trophy
// banner (TrophyIcon.jsx). A cup with handles and the four face-button symbols engraved on it for bronze, silver and
// gold; a glowing blue orb held up on a silver stand for platinum. Paths are in a 64×64 box.
export const CUP=[
 'M16 8H48V17C48 31 41 38 32 39C23 38 16 31 16 17Z',
 'M29 38H35C34 42 34 45 36 48H28C30 45 30 42 29 38Z',
 'M21 48H43V53H21Z','M18 53H46V58H18Z',
];
export const HANDLES='M18 13C8 13 8 30 21 31M46 13C56 13 56 30 43 31';
// △ ○ ✕ □, two by two, as on the PSP's face.
export const CUP_SYMBOLS='M26 14.2L28.7 18.8H23.3ZM40.4 16.5A2.4 2.4 0 1 1 35.6 16.5A2.4 2.4 0 1 1 40.4 16.5M23.8 23.8L28.2 28.2M28.2 23.8L23.8 28.2M35.6 23.6H40.4V28.4H35.6Z';
export const ORB={cx:32,cy:20,r:14};
export const ORB_SYMBOLS='M26 13.6L28.7 18.2H23.3ZM40.4 15.9A2.4 2.4 0 1 1 35.6 15.9A2.4 2.4 0 1 1 40.4 15.9M23.8 22.6L28.2 27M28.2 22.6L23.8 27M35.6 22.4H40.4V27.2H35.6Z';
export const STAND=['M28 37H36L35 48H29Z','M21 48H43V53H21Z','M18 53H46V58H18Z'];
// Two silver petals rising from the stem to cup the orb from below.
export const ARMS=['M31 41C22 40 14 33 14 21C18 30 24 34 31 35Z','M33 41C42 40 50 33 50 21C46 30 40 34 33 35Z'];

// Each grade's metal, top to bottom, and the colour its engraving is cut in. Locked trophies are dull grey.
export const METALS={
 bronze:{stops:['#f6b99c','#c4704e','#7c3b24'],cut:'#6a2e1b'},
 silver:{stops:['#f2f4f7','#a8afb8','#5b626b'],cut:'#4b5159'},
 gold:{stops:['#ffe4a1','#efa63a','#a5621a'],cut:'#844b10'},
 platinum:{stops:['#f2f4f7','#a8afb8','#5b626b'],cut:'#4b5159',orb:['#effcff','#5ccbf6','#0b5aa6']},
 locked:{stops:['#74787f','#50545a','#33363b'],cut:'#2a2c30',orb:['#8c9097','#5b5f66','#3a3d42']},
};

const paths=new Map();
const path=d=>{if(!paths.has(d))paths.set(d,new Path2D(d));return paths.get(d);};

// Draws a trophy centred on (x, y), size across, on a 2D canvas.
export function drawTrophy(ctx,grade,x,y,size,locked=false){
 const metal=METALS[locked?'locked':grade]??METALS.bronze, platinum=grade==='platinum';
 ctx.save();ctx.translate(x-size/2,y-size/2);ctx.scale(size/64,size/64);
 const fill=ctx.createLinearGradient(0,6,0,58);
 metal.stops.forEach((stop,i)=>fill.addColorStop(i/(metal.stops.length-1),stop));
 ctx.fillStyle=ctx.strokeStyle=fill;ctx.lineCap='round';ctx.lineWidth=4;
 if(platinum){
  STAND.forEach(d=>ctx.fill(path(d)));
  const glow=ctx.createRadialGradient(ORB.cx-5,ORB.cy-6,1,ORB.cx,ORB.cy,ORB.r);
  metal.orb.forEach((stop,i)=>glow.addColorStop(i/(metal.orb.length-1),stop));
  if(!locked){ctx.shadowColor='#5ccbf6';ctx.shadowBlur=10;}
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(ORB.cx,ORB.cy,ORB.r,0,Math.PI*2);ctx.fill();
  ctx.shadowBlur=0;ctx.fillStyle=fill;ARMS.forEach(d=>ctx.fill(path(d)));
  ctx.strokeStyle=locked?metal.cut:'#ffffffe0';ctx.lineWidth=1.6;ctx.stroke(path(ORB_SYMBOLS));
 }else{
  ctx.stroke(path(HANDLES));CUP.forEach(d=>ctx.fill(path(d)));
  ctx.strokeStyle=metal.cut;ctx.lineWidth=1.6;ctx.stroke(path(CUP_SYMBOLS));
 }
 ctx.restore();
}
