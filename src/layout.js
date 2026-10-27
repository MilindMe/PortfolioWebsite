// Free rotation is switched off for now; flip this to let visitors drag or Shift+arrow the PSP around again.
// Lives here rather than in MemoriesScene so the page shell can read it without pulling in the lazy three.js chunk.
export const ROTATION_LOCKED=true;

// Space reserved for the page wheel, in px. The PSP is framed in what's left; the wheel fills the reserved strip.
// Wide screens put the wheel on the left; narrow ones give it everything above a strip just tall enough for the PSP.
// Experiences without a wheel reserve nothing.
export function stageInsets(width,height,wheel=true){
 if(!wheel)return {left:0,top:0};
 return width>=760?{left:Math.round(Math.min(width*.28,400)),top:0}:{left:0,top:Math.round(Math.max(height*.32,height-width*.95))};
}
