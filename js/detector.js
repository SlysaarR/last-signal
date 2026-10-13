import { types } from '../data/items.js?v=0.40.0';
import { detectorAt, detectorFeatures } from '../data/gear.js?v=0.40.0';
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export const distanceTo=(o,x,y)=>Math.hypot(o.x-x,(o.y-y)*720/880);
export function nearestTarget(objects,x,y) {
  let obj=null,d=Infinity;
  for(const target of objects) {
    if(target.dug)continue;
    const distance=distanceTo(target,x,y);
    if(distance<d){obj=target;d=distance;}
  }
  return {obj,d};
}
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
  const closeness=clamp(1-d/radius,0,1);
  // A rounded response has a peak over the target and fades at the footprint's
  // boundary. Its shape depends on distance, never pointer speed or frame rate.
  const envelope=closeness*closeness*(3-2*closeness);
  const power=Math.round(100*response*envelope);
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
  const readings=objects.filter(o=>!o.dug).map(o=>readTarget(o,x,y,level,0,options)).filter(r=>r.power>0);
  // A weak nearby target must not blank a stronger, slightly more distant one.
  // Canonical tie breaks keep readings independent of the save's array order.
  readings.sort((a,b)=>b.power-a.power||a.d-b.d||a.obj.x-b.obj.x||a.obj.y-b.obj.y||a.obj.type-b.obj.type);
  if(!readings.length)return {obj:null,d:Infinity,power:0,id:null,stability:0,mode:options.mode||'search',focus:0,quiet:false,pinpoint:false,tone:'none',interference:false};
  const primary=readings[0],others=readings.slice(1).filter(r=>r.power>5);
  const influence=others.reduce((sum,r)=>sum+r.power*r.power,0);
  const interference=clamp(Math.sqrt(influence)/100,0,1),features=detectorFeatures(level);
  const result=readTarget(primary.obj,x,y,level,interference,options);
  if(influence>0) {
    // Symmetric weights avoid an artificial ID/tone jump when two targets
    // exchange dominance. Separation favours the stronger response more.
    const exponent=features.separation?5:2;
    let total=1,id=primary.id;
    for(const other of others){const weight=(other.power/primary.power)**exponent;total+=weight;id+=other.id*weight;}
    const groundWave=Math.sin(x*83+y*47)*interference*(features.separation?1:4);
    result.id=clamp(Math.round(id/total+groundWave),0,99);
    result.tone=result.id<35?'low':result.id<65?'mid':'high';
    result.quiet=!!options.ironQuiet&&features.ironQuiet&&result.id<35&&result.stability>=35&&result.power>=20;
  }
  return result;
}
export function signalDescription(reading,level) {
  if(reading.power<5)return 'Проведи котушкою над ґрунтом';
  const tone={low:'Низький тон',mid:'Середній тон',high:'Високий тон'}[reading.tone];
  if(level<2)return tone+' · метал ще невизначений';
  if(reading.power<25||reading.stability<35)return tone+' · нечіткий відгук';
  return tone+' · '+(reading.id<35?'ймовірно чорний метал':reading.id<45?'змішаний відгук':'ймовірно кольоровий');
}
