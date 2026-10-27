// Trophies, earned once per visitor and remembered in localStorage. Award one from anywhere with awardTrophy(id);
// the TrophyToast on the page shows the card and plays the unlock sound. grade picks the trophy's colour.
// Fields: title (the card's headline), description (what it was for, for screen readers and any future list) and grade.
export const trophies={
 // Example; award it with awardTrophy('first-steps') wherever it should be earned.
 'first-steps':{title:'1 down, lots more to go!',description:'Earn your first trophy.',grade:'bronze'},
 'button-rush':{title:'Fastest fingers on the PSP',description:'Clear all four rounds of Button Rush.',grade:'gold'},
};
export const GRADES=['bronze','silver','gold','platinum'];

const STORAGE_KEY='trophies-earned';
const listeners=new Set();

export function earnedTrophies(){
 try{return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)??'[]'));}catch{return new Set();}
}

// Awards a trophy the visitor doesn't have yet; returns whether it was newly earned. Unknown ids are ignored.
export function awardTrophy(id){
 const trophy=trophies[id];
 if(!trophy)return false;
 const earned=earnedTrophies();
 if(earned.has(id))return false;
 earned.add(id);
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify([...earned]));}catch{}
 listeners.forEach(listener=>listener({id,...trophy}));
 return true;
}

// Calls listener({id, title, description, grade}) for every trophy earned from now on; returns an unsubscribe.
export function onTrophy(listener){
 listeners.add(listener);
 return ()=>listeners.delete(listener);
}
