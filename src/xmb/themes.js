// XMB backdrop themes, picked from Settings on the PSP. colors are the backdrop gradient [top, bottom].
// 'monthly' follows the calendar like the original PSP.
export const themes=[
 {id:'crimson',label:'Crimson',colors:['#c8222c','#3b070b']},
 {id:'monthly',label:'Monthly',sub:'Changes with the month, like the PSP',colors:null},
 {id:'cobalt',label:'Cobalt',colors:['#3274b8','#0b2038']},
 {id:'emerald',label:'Emerald',colors:['#2f9150','#0c2a16']},
 {id:'violet',label:'Violet',colors:['#7f52ab','#25163b']},
 {id:'amber',label:'Amber',colors:['#b9792b','#3a2208']},
 {id:'midnight',label:'Midnight',colors:['#3d4049','#0a0b0e']},
];
export const DEFAULT_THEME='crimson';

const months=[
 ['#6b7280','#1c1f25'],['#9a8526','#29230a'],['#64912f','#1a2a0c'],['#b0608f','#351a2b'],
 ['#2f9150','#0c2a16'],['#7f52ab','#25163b'],['#2a9396','#0b2a2c'],['#3274b8','#0b2038'],
 ['#5156b5','#17183b'],['#b9792b','#3a2208'],['#946140','#2b190e'],['#b0353d','#37090d'],
];

export function themeColors(id){
 const theme=themes.find(theme=>theme.id===id)??themes[0];
 return theme.colors??months[new Date().getMonth()];
}

const STORAGE_KEY='xmb-theme';
export function savedTheme(){
 try{const id=localStorage.getItem(STORAGE_KEY);return themes.some(theme=>theme.id===id)?id:DEFAULT_THEME;}
 catch{return DEFAULT_THEME;}
}
export function saveTheme(id){
 try{localStorage.setItem(STORAGE_KEY,id);}catch{}
}
