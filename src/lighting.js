export const lightingModes = [
 {id:'dusky',label:'Dusky',description:'Deep shadows, amber edges'},
 {id:'golden',label:'Golden',description:'Warm sun, soft cool fill'},
 {id:'daylight',label:'Daylight',description:'Clear light, open shadows'},
];

// Each mode changes the light rig itself; exposure stays fixed in each scene.
const presets = {
 dusky:{
  sky:'#94a5c6',ground:'#25292b',key:'#ffb66e',fill:'#8ba9d1',position:[-4.5,1.8,1.5],
  shop:{ambient:.35,key:2.1,fill:.18},
  memories:{ambient:.45,key:3,fill:.3,rim:1.6,environment:.28},
 },
 golden:{
  sky:'#c4cbd7',ground:'#34392f',key:'#ffd09a',fill:'#a8bacb',position:[-4,2.7,2],
  shop:{ambient:.85,key:2.8,fill:.45},
  memories:{ambient:1.1,key:4,fill:.8,rim:2.1,environment:.55},
 },
 daylight:{
  sky:'#e5efff',ground:'#63685a',key:'#fff2dd',fill:'#c4ddf2',position:[-2.5,4.5,3],
  shop:{ambient:1.5,key:3,fill:1.1},
  memories:{ambient:1.8,key:4.5,fill:1.8,rim:2.5,environment:1},
 },
};

export function applyLighting(mode,sceneType,{hemisphere,key,fill,rim,scene}){
 const preset=presets[mode]??presets.golden;
 const strength=preset[sceneType];
 hemisphere.color.set(preset.sky);
 hemisphere.groundColor.set(preset.ground);
 hemisphere.intensity=strength.ambient;
 key.color.set(preset.key);
 key.intensity=strength.key;
 key.position.set(...preset.position);
 fill.color.set(preset.fill);
 fill.intensity=strength.fill;
 if(rim){rim.color.set(preset.key);rim.intensity=strength.rim;}
 if(sceneType==='memories')scene.environmentIntensity=strength.environment;
}
