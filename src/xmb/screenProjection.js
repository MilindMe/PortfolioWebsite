// Map a DOM rectangle onto the four projected UV corners of the PSP screen.
// CSS coordinates stay close to their displayed size so text is rasterised at display density.
export function screenTransform(points){
 const [p0,p1,p2,p3]=points;
 if(points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.z < -1||p.z > 1))return null;
 const cross=(p1.x-p0.x)*(p3.y-p0.y)-(p1.y-p0.y)*(p3.x-p0.x);
 if(cross<=.1)return null; // Back-facing or edge-on during a flip.
 const width=Math.hypot(p1.x-p0.x,p1.y-p0.y),height=Math.hypot(p3.x-p0.x,p3.y-p0.y);
 if(width<1||height<1)return null;
 const dx1=p1.x-p2.x,dx2=p3.x-p2.x,dx3=p0.x-p1.x+p2.x-p3.x;
 const dy1=p1.y-p2.y,dy2=p3.y-p2.y,dy3=p0.y-p1.y+p2.y-p3.y;
 let g=0,h=0;
 if(Math.abs(dx3)+Math.abs(dy3)>.000001){
  const det=dx1*dy2-dx2*dy1;
  if(Math.abs(det)<.000001)return null;
  g=(dx3*dy2-dx2*dy3)/det;h=(dx1*dy3-dx3*dy1)/det;
 }
 const a=p1.x-p0.x+g*p1.x,b=p3.x-p0.x+h*p3.x;
 const d=p1.y-p0.y+g*p1.y,e=p3.y-p0.y+h*p3.y;
 return {width,height,matrix:[a/width,d/width,0,g/width,b/height,e/height,0,h/height,0,0,1,0,p0.x,p0.y,0,1]};
}
