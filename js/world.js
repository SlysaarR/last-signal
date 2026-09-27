// world responsibilities for Last Signal.
import { rarities, signalRanges, surveyCols, surveyRows } from '../data/balance.js?v=0.16.0';
import { types } from '../data/items.js?v=0.16.0';
import { legacyLocation, locations } from '../data/locations.js?v=0.16.0';
import { rollCondition } from './rules.js?v=0.16.0';
import { s, save } from './storage.js?v=0.16.0';
export function rollLocation() {
  let roll = Math.random() * 100;
  for (let i = 0; i < locations.length; i++) {
    roll -= locations[i].chance;
    if (roll < 0) return i;
  }
  return locations.length - 1;
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
    if (loc.terrain === 'beach' || loc.terrain === 'road') weight *= t.year >= 2018 ? 4 : 1;else if (['field', 'fair', 'trail'].includes(loc.terrain)) weight *= t.year >= 2018 ? .2 : 1.3;
  }
  if (loc.terrain === 'beach' && t.kind === 'trash') weight *= [8, 9, 10].includes(id) ? 3 : 1;
  return weight;
}
export function pickType(kind, loc = currentLocation()) {
  const pool = types.map((t, id) => ({
      id,
      t
    })).filter(x => x.t.kind === kind && !x.t.legacy),
    total = pool.reduce((sum, x) => sum + itemWeight(x.t, x.id, loc), 0);
  let roll = Math.random() * total;
  for (const x of pool) {
    roll -= itemWeight(x.t, x.id, loc);
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
    shallow = loc.terrain === 'beach' || loc.terrain === 'road' ? .6 : .3;
  return r < shallow ? 0 : r < .85 ? 1 : 2;
}
export function exploredPercent() {
  return Math.floor(s.survey.length / (surveyCols * surveyRows) * 100);
}
export function generate() {
  s.objects = [];
  s.holes = [];
  s.survey = [];
  const loc = currentLocation(),
    range = signalRanges[loc.terrain] || signalRanges.grass,
    count = range[0] + Math.floor(Math.random() * (range[1] - range[0] + 1));
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
  save();
}
