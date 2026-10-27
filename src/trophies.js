// Trophies, earned once per visitor and remembered in localStorage. Award one from anywhere with awardTrophy(id);
// the TrophyToast on the page shows the card and plays the unlock sound. grade picks the trophy's colour.
// Fields: title (the card's headline), description (what it was for, for screen readers and any future list), grade,
// and requires: a list of trophy ids that award this one as soon as the last of them is earned (the platinum).
// What earns each one is decided by trophiesFor() in src/xmb/state.js.
export const trophies={
 'about-me':{title:'Getting to know me!',description:'Open About me.',grade:'gold'},
 'experience':{title:'Potential employer?',description:'Open Experience.',grade:'silver'},
 'skills':{title:'Hard-worker',description:'Open Skills.',grade:'bronze'},
 'education':{title:'um.. actually',description:'Open Education.',grade:'bronze'},
 'first-game':{title:'clicky clicky',description:'Play Button Rush for the first time.',grade:'bronze'},
 'projects':{title:'Earnest Interest',description:'Open a project.',grade:'silver'},
 'new-theme':{title:'Switchin\' it up',description:'Pick a second theme.',grade:'bronze'},
 'button-rush':{title:'Fastest fingers on the PSP',description:'Clear all four rounds of Button Rush.',grade:'gold'},
 'goat':{title:'G.O.A.T',description:'Earn every other trophy on the list.',grade:'platinum',
  requires:['about-me','experience','skills','education','first-game','projects','new-theme']},
};
export const GRADES=['bronze','silver','gold','platinum'];

const STORAGE_KEY='trophies-earned';
const listeners=new Set();

export function earnedTrophies(){
 try{return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)??'[]'));}catch{return new Set();}
}

// Awards a trophy the visitor doesn't have yet; returns whether it was newly earned. Unknown ids are ignored. Earning
// the last trophy another one requires awards that one straight after, so its card queues up behind this one.
export function awardTrophy(id){
 const trophy=trophies[id];
 if(!trophy)return false;
 const earned=earnedTrophies();
 if(earned.has(id))return false;
 earned.add(id);
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify([...earned]));}catch{}
 const {requires,...card}=trophy;
 listeners.forEach(listener=>listener({id,...card}));
 for(const [next,{requires:needs}] of Object.entries(trophies))
  if(needs?.includes(id)&&needs.every(need=>earned.has(need)))awardTrophy(next);
 return true;
}

// Calls listener({id, title, description, grade}) for every trophy earned from now on; returns an unsubscribe.
export function onTrophy(listener){
 listeners.add(listener);
 return ()=>listeners.delete(listener);
}
