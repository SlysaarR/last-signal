// world responsibilities for Last Signal.
import { rarities, signalRanges, surveyCols, surveyRows } from '../data/balance.js?v=0.48.0';
import { types } from '../data/items.js?v=0.48.0';
import { legacyLocation, locations } from '../data/locations.js?v=0.48.0';
import { rollCondition } from './rules.js?v=0.48.0';
import { s, save } from './storage.js?v=0.48.0';
import { SITE_VERSION, seedForSite, createSiteLayout, placeSiteObjects } from '../data/site-layout.js?v=0.48.0';
export function rollLocation(route = null) {
  const pool = route ? route.pool : [0,1,2,3,4];
  let roll = Math.random() * pool.reduce((sum,i)=>sum+locations[i].chance,0);
  for (const i of pool) { roll -= locations[i].chance; if(roll<0)return i; }
  return pool[pool.length-1];
}
export function currentLocation() {
  return s.emergency ? {
    ...locations[0],
    name: 'Бідне узбіччя',
    kinds: [.85, .12, .025, .005],
    boost: [1, .6, .2, .05]
  } : locations[s.location] || legacyLocation;
}
export function itemWeight(t, id, loc) {
  let weight = rarities[t.rarity].weight * loc.boost[t.rarity];
  if (t.kind === 'coin') {
    if (['beach','road','river'].includes(loc.terrain)) weight *= t.year >= 2018 ? 4 : 1;else if (['field', 'fair', 'trail','forest','orchard'].includes(loc.terrain)) weight *= t.year >= 2018 ? .2 : 1.3;
  }
  if (loc.terrain === 'beach' && t.kind === 'trash') weight *= [8, 9, 10].includes(id) ? 3 : 1;
  return weight;
}
const pools=new Map();
export function weightedPool(kind,loc=currentLocation()) {
  const key=kind+':'+loc.terrain+':'+loc.boost.join(',');
  if(pools.has(key))return pools.get(key);
  const pool = types.map((t, id) => ({
      id,
      t
    })).filter(x => x.t.kind === kind && !x.t.legacy);
  const weights=pool.map(x=>itemWeight(x.t,x.id,loc)*(x.t.findRegions?.[loc.terrain]??1));
  if(kind==='relic'||kind==='jewel'){
    // Adding variants changes variety, not the total probability of a rarity.
    const oldMass=[0,0,0,0],newMass=[0,0,0,0];
    pool.forEach((x,i)=>{newMass[x.t.rarity]+=weights[i];if(!x.t.contentPack)oldMass[x.t.rarity]+=itemWeight(x.t,x.id,loc);});
    pool.forEach((x,i)=>{weights[i]*=oldMass[x.t.rarity]/newMass[x.t.rarity];});
  }
  const result=pool.map((x,i)=>({id:x.id,weight:weights[i]}));
  pools.set(key,result);if(pools.size>48)pools.delete(pools.keys().next().value);
  return result;
}
export function pickType(kind, loc = currentLocation()) {
  const pool=weightedPool(kind,loc),total=pool.reduce((sum,x)=>sum+x.weight,0);
  let roll = Math.random() * total;
  for (const x of pool) {
    roll -= x.weight;
    if (roll < 0) return x.id;
  }
  return pool[pool.length - 1].id;
}
export function pickKind(loc) {
  let roll = Math.random();
  for (let i = 0; i < 4; i++) {
    roll -= loc.kinds[i];
    if (roll < 0) return ['trash', 'coin', 'jewel', 'relic'][i];
  }
  return 'relic';
}
export function rollDepth(loc) {
  const r = Math.random(),
    shallow = ['beach','road','river'].includes(loc.terrain) ? .6 : .3;
  return r < shallow ? 0 : r < .85 ? 1 : 2;
}
export function exploredPercent() {
  return Math.floor(s.survey.length / (surveyCols * surveyRows) * 100);
}
// Rolled once when a new site is generated; saved objects keep the result on reload.
// Equipment and player history do not change this roll.
export function siteProfile(loc, roll = Math.random()) {
  if (roll >= .25 && roll < .9) return { ...loc, signalFactor: 1 };
  const poor = roll < .25;
  const trash = poor ? Math.max(.94, loc.kinds[0]) : loc.kinds[0] * .65;
  const other = 1 - loc.kinds[0];
  return { ...loc,
    kinds: [trash, ...loc.kinds.slice(1).map(weight => weight / other * (1 - trash))],
    boost: loc.boost.map((weight, rarity) => rarity < 2 ? weight : weight * (poor ? .4 : 1.5)),
    signalFactor: poor ? .6 : 1.15
  };
}
export function generate({persist=true}={}) {
  s.objects = [];
  s.holes = [];
  s.survey = [];
  const loc = siteProfile(currentLocation()),
    range = signalRanges[loc.terrain] || signalRanges.grass,
    count = Math.max(3, Math.round((range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1))) * loc.signalFactor));
  for (let i = 0; i < count; i++) {
    const kind = pickKind(loc),
      type = pickType(kind, loc),
      condition = rollCondition(),
      depth = rollDepth(loc);
    let p;
    for (let n = 0; n < 300; n++) {
      p = {
        x: .08 + Math.random() * .84,
        y: .08 + Math.random() * .84,
        type,
        condition,
        depth,
        dug: false
      };
      if (s.objects.every(o => Math.hypot(o.x - p.x, (o.y - p.y) * 720 / 880) > .085)) break;
    }
    s.objects.push(p);
  }
  // Keep the original loot stream above intact, including its placement draws.
  // Geography uses its own deterministic stream and only changes coordinates.
  s.site={version:SITE_VERSION,seed:seedForSite(s)};
  s.fieldMarks=[];
  placeSiteObjects(s.objects,createSiteLayout(loc.terrain,s.site.seed));
  if(persist)save();
}

