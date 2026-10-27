// Saved for a later feature; not wired into the page right now.
// To use it again (see docs/xmb.md, "Saved effects"):
//  1. Render <canvas className="pulse-backdrop" aria-hidden="true"/> inside .memories-stage, before the WebGL canvas,
//     styled position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1.
//  2. In MemoriesScene: const pulses=createPulseBackground(canvas,reducedMotionQuery); call pulses.resize(w,h) in the
//     ResizeObserver and pulses.dispose() on cleanup.
//  3. In act(action,origin): project origin (a THREE.Vector3; input.js already passes one, and input.origin(type) gives one
//     for keys) with origin.clone().project(camera), convert NDC to CSS px, and call pulses.emit(x,y,[r,g,b]).
// Soft shockwaves on the page background behind the PSP: each button press sends out a glow, two rings and a
// scatter of sparks from where it happened. Drawn on a 2D canvas that only animates while a pulse is alive.
const LIFE=1400, MAX_PULSES=6, SPARKS=12;

const easeOut=t=>1-Math.pow(1-t,3);

export function createPulseBackground(canvas,reducedMotion){
 const ctx=canvas.getContext('2d');
 let width=0, height=0, pulses=[], frame=0;
 function draw(now){
  ctx.clearRect(0,0,width,height);
  ctx.globalCompositeOperation='lighter';
  pulses=pulses.filter(pulse=>now-pulse.born<LIFE);
  for(const pulse of pulses){
   const t=(now-pulse.born)/LIFE, reach=Math.max(width,height)*.55, [r,g,b]=pulse.color;
   const radius=reach*easeOut(t), fade=1-t;
   const glow=ctx.createRadialGradient(pulse.x,pulse.y,0,pulse.x,pulse.y,Math.max(1,radius*.9));
   glow.addColorStop(0,`rgba(${r},${g},${b},${.22*fade*fade})`);glow.addColorStop(1,`rgba(${r},${g},${b},0)`);
   ctx.fillStyle=glow;ctx.fillRect(pulse.x-radius,pulse.y-radius,radius*2,radius*2);
   // A wide faint stroke under a thin bright one reads as a soft ring without canvas shadows.
   for(const [lag,strength] of [[0,1],[.14,.55]]){
    const ringT=Math.max(0,t-lag)/(1-lag);
    if(ringT<=0)continue;
    const ringRadius=reach*easeOut(ringT), ringFade=Math.pow(1-ringT,1.6)*strength;
    ctx.beginPath();ctx.arc(pulse.x,pulse.y,ringRadius,0,Math.PI*2);
    ctx.strokeStyle=`rgba(${r},${g},${b},${.16*ringFade})`;ctx.lineWidth=14*(1-ringT)+2;ctx.stroke();
    ctx.strokeStyle=`rgba(255,${Math.min(255,g+120)},${Math.min(255,b+120)},${.5*ringFade})`;ctx.lineWidth=1.2;ctx.stroke();
   }
   for(const spark of pulse.sparks){
    const distance=reach*spark.speed*easeOut(t), size=spark.size*(1-t*.6);
    ctx.beginPath();ctx.arc(pulse.x+Math.cos(spark.angle)*distance,pulse.y+Math.sin(spark.angle)*distance,size,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,${Math.min(255,g+90)},${Math.min(255,b+90)},${.7*fade*fade})`;ctx.fill();
   }
  }
  ctx.globalCompositeOperation='source-over';
  frame=pulses.length?requestAnimationFrame(draw):0;
 }
 return {
  resize(w,h){
   width=w;height=h;
   const dpr=Math.min(devicePixelRatio,1.5);
   canvas.width=w*dpr;canvas.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
   if(!frame)ctx.clearRect(0,0,w,h);
  },
  // x, y in CSS px; color as [r, g, b].
  emit(x,y,color){
   if(reducedMotion.matches)return;
   const sparks=Array.from({length:SPARKS},(_,i)=>({angle:(i/SPARKS)*Math.PI*2+Math.random()*.4,speed:.35+Math.random()*.5,size:1+Math.random()*1.8}));
   pulses=[...pulses.slice(-(MAX_PULSES-1)),{x,y,color,born:performance.now(),sparks}];
   if(!frame)frame=requestAnimationFrame(draw);
  },
  dispose(){cancelAnimationFrame(frame);},
 };
}
