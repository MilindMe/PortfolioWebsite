import {FEATURES} from '../features';

// XMB themes, picked from Settings on the PSP. colors are the backdrop gradient [top, bottom].
// 'monthly' follows the calendar like the original PSP. experience names the page experience the theme belongs to.
// feature names a flag in src/features.js; while it's off the theme is left out of Settings altogether.
export const themes=[
 {id:'crimson',label:'Crimson',colors:['#c8222c','#3b070b'],experience:'classic'},
 {id:'monthly',label:'Monthly',sub:'Changes with the month, like the PSP',colors:null,experience:'classic'},
 {id:'cobalt',label:'Cobalt',colors:['#3274b8','#0b2038'],experience:'classic'},
 {id:'emerald',label:'Emerald',colors:['#2f9150','#0c2a16'],experience:'classic'},
 {id:'violet',label:'Violet',colors:['#7f52ab','#25163b'],experience:'classic'},
 {id:'amber',label:'Amber',colors:['#b9792b','#3a2208'],experience:'classic'},
 {id:'midnight',label:'Midnight',colors:['#3d4049','#0a0b0e'],experience:'classic'},
 {id:'persona5',label:'Persona 5',sub:'Take your heart',colors:['#e5191c','#140000'],experience:'persona5'},
 {id:'gta',label:'Grand Theft Auto',sub:'Follow the damn train',colors:['#ec6fae','#0b6f8f'],experience:'gta'},
 {id:'bo2',label:'Black Ops II',sub:'Main menu',colors:['#3a3f44','#0c0d0e'],experience:'bo2',feature:'bo2Theme'},
].filter(theme=>!theme.feature||FEATURES[theme.feature]);
export const DEFAULT_THEME='crimson';

// Each experience is a whole page treatment. wheel names the page wheel it shows (if any), fill is the fraction of
// the free stage the PSP spans and screen is the XMB skin drawn on the PSP. GTA has no wheel: the PSP stays big and
// centred, with the cash bar in the corner.
export const experiences={
 classic:{id:'classic',wheel:false,fill:{w:.78,h:.8},screen:'xmb'},
 persona5:{id:'persona5',wheel:'persona5',fill:{w:.95,h:.8},screen:'persona5'},
 gta:{id:'gta',wheel:false,fill:{w:.8,h:.78},screen:'gta'},
 bo2:{id:'bo2',wheel:'bo2',fill:{w:.8,h:.74},screen:'bo2'},
};

const months=[
 ['#6b7280','#1c1f25'],['#9a8526','#29230a'],['#64912f','#1a2a0c'],['#b0608f','#351a2b'],
 ['#2f9150','#0c2a16'],['#7f52ab','#25163b'],['#2a9396','#0b2a2c'],['#3274b8','#0b2038'],
 ['#5156b5','#17183b'],['#b9792b','#3a2208'],['#946140','#2b190e'],['#b0353d','#37090d'],
];

const find=id=>themes.find(theme=>theme.id===id)??themes[0];

export function themeColors(id){
 return find(id).colors??months[new Date().getMonth()];
}

export function themeExperience(id){
 return experiences[find(id).experience]??experiences.classic;
}
