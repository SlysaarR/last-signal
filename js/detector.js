import { types } from '../data/items.js?v=0.37.0';
import { detectorAt, detectorFeatures } from '../data/gear.js?v=0.37.0';
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export const distanceTo=(o,x,y)=>Math.hypot(o.x-x,(o.y-y)*720/880);
// Conductivity bands deliberately overlap: a bright tone never promises a valuable find.
// This is a game model, not a calibration chart for a real detector.
export function targetProfile(type) {
  const t=types[type];
  if(t.metal==='iron') return {id:t.shape==='cap'?28:t.shape==='coin'?34:17,rough:t.shape==='coin'?5:12,size:t.shape==='sheet'?1.08:1};
  const profiles={foil:[37,14,.87],tab:[48,8,.94],can:[75,10,1.1],band:[48,5,.94],pendant:[48,6,.96],chain:[39,10,.88],earring:[43,8,.88],bracelet:[52,6,1],ring:[78,4,1],gemring:[76,5,.97],button:[62,5,.97],watch:[70,9,1.06]};
  const values=profiles[t.shape] || (t.material==='aluminum'?[43,5,.9]:t.material==='zinc'?[58,5,.93]:[70,4,1]);
  return {id:values[0],rough:values[1],size:values[2]};
}
export function readTarget(obj,x,y,level=1,interference=0,options={}) {
  const d=distanceTo(obj,x,y),gear=detectorAt(level),profile=targetProfile(obj.type);
  const features=detectorFeatures(level),mode=options.mode==='deep'&&features.deep?'deep':options.mode==='pinpoint'&&features.pinpoint?'pinpoint':'search';
  const radius=gear.radius*profile.size*(1-obj.depth*.13)*(mode==='deep'?1.18:mode==='pinpoint'?.75:1);
  const response=mode==='deep'?1:obj.depth===2?gear.deepResponse:obj.depth===1?.84+(level-1)*.1/9:1;
  const power=Math.round(100*response*clamp(1-d/radius,0,1));
  const closeness=clamp(1-d/radius,0,1);
  const soilNoise=options.soil===2?5:options.soil===1?1:0;
  const spread=gear.noise*(1-closeness*.78)+profile.rough*.45+obj.depth*3+interference*13*(features.separation?.3:1)+soilNoise*(features.ground?.25:1)+(mode==='deep'?3:0);
  const phase=obj.x*173+obj.y*131+obj.type*.7;
  const wave=Math.sin((x-obj.x)*96+phase)*.65+Math.sin((y-obj.y)*119-phase)*.35;
  const id=clamp(Math.round(profile.id+wave*spread),0,99);
  const stability=clamp(Math.round(98-spread*2.5-(1-closeness)*20),0,99);
  return {obj,d,power,id,stability,mode,focus:Math.round(100*clamp(1-d/.07,0,1)),quiet:!!options.ironQuiet&&features.ironQuiet&&id<35&&stability>=35&&power>=20,pinpoint:d<=.035 && power>0,
    tone:id<35?'low':id<65?'mid':'high',
    depth:obj.depth,interference:interference>.3};
}
export function sampleSignal(objects,x,y,level=1,options={}) {
  let obj=null,d=Infinity;
  for(const o of objects){if(o.dug)continue;const n=distanceTo(o,x,y);if(n<d){obj=o;d=n;}}
  if(!obj)return {obj:null,d:Infinity,power:0,id:null,stability:0,mode:options.mode||'search',focus:0,quiet:false,pinpoint:false,tone:'none',interference:false};
  let interference=0;
  for(const other of objects){if(other===obj||other.dug)continue;const p=readTarget(other,x,y,level,0,options).power;if(p>15)interference=Math.max(interference,p/100);}
  return readTarget(obj,x,y,level,interference,options);
}
export function signalDescription(reading,level) {
  if(reading.power<5)return 'Проведи котушкою над ґрунтом';
  const tone={low:'Низький тон',mid:'Середній тон',high:'Високий тон'}[reading.tone];
  if(level<2)return tone+' · метал ще невизначений';
  if(reading.power<25||reading.stability<35)return tone+' · нечіткий відгук';
  return tone+' · '+(reading.id<35?'ймовірно чорний метал':reading.id<45?'змішаний відгук':'ймовірно кольоровий');
}
