// Free rotation is switched off for now; flip this to let visitors drag or Shift+arrow the PSP around again.
// Lives here rather than in MemoriesScene so the page shell can read it without pulling in the lazy three.js chunk.
export const ROTATION_LOCKED=true;

// Phones get their own layout: the page is always laid out landscape, with the PSP filling it and a small wheel on
// the left. Held upright, the whole page is turned a quarter turn clockwise (see .page.phone in styles.css), so the
// PSP stands on its side and turning the phone counter-clockwise brings it upright. Touch-first and small, not just
// narrow, so a squeezed desktop window keeps the desktop layout.
export const PHONE=typeof matchMedia==='function'&&matchMedia('(pointer: coarse)').matches&&Math.min(screen.width,screen.height)<600;
// Matches CSS's (orientation: portrait), which is what turns the page.
export const pageTurned=()=>PHONE&&innerHeight>=innerWidth;

// The page's own width and height, before any turn.
export function pageSize(){
 return pageTurned()?{width:innerHeight,height:innerWidth}:{width:innerWidth,height:innerHeight};
}

// A pointer position as fractions (0–1) across an element in the page's own frame, undoing the phone turn.
export function localPoint(element,clientX,clientY){
 const rect=element.getBoundingClientRect();
 return pageTurned()?{x:(clientY-rect.top)/rect.height,y:(rect.right-clientX)/rect.width}:{x:(clientX-rect.left)/rect.width,y:(clientY-rect.top)/rect.height};
}

// A pointer movement in screen pixels, turned into the page's own frame.
export function localDelta(dx,dy){
 return pageTurned()?{dx:dy,dy:-dx}:{dx,dy};
}

// Space reserved for the page wheel, in px. The PSP is framed in what's left; the wheel fills the reserved strip.
// Wide screens put the wheel on the left; narrow ones give it everything above a strip just tall enough for the PSP.
// Phones keep a slim strip on the left so the PSP gets most of the screen. Experiences without a wheel reserve nothing.
export function stageInsets(width,height,wheel=true){
 if(!wheel)return {left:0,top:0};
 if(PHONE)return {left:Math.round(Math.min(width*.22,190)),top:0};
 return width>=760?{left:Math.round(Math.min(width*.28,400)),top:0}:{left:0,top:Math.round(Math.max(height*.32,height-width*.95))};
}
