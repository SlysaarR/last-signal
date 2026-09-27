// Save loading, legacy migration and persistence. Keep KEY and the version-1 envelope compatible.
import { surveyCols, surveyRows } from '../data/balance.js?v=0.19.0';
import { locations } from '../data/locations.js?v=0.19.0';
import { $ } from './dom.js?v=0.19.0';
import { bagCapacity, bagUsed, maxEnergy, rollCondition } from './rules.js?v=0.19.0';
import { currentLocation, rollDepth, rollLocation } from './world.js?v=0.19.0';
export const KEY = 'last-signal-v1';
export function fresh() {
  return {
    coins: 0,
    energy: 100,
    day: 1,
    level: 1,
    collection: [],
    objects: [],
    holes: [],
    earned: 0,
    found: 0,
    x: .5,
    y: .52,
    atCamp: true
  };
}
export let s = fresh(),
  storage = true;
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      version: 1,
      state: s
    }));
  } catch (e) {
    storage = false;
  }
  $('saveNote').hidden = storage;
}
export function loadGame() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    if (v && v.version === 1 && v.state && Array.isArray(v.state.objects) && Array.isArray(v.state.collection) && Array.isArray(v.state.holes) && Number.isFinite(v.state.coins) && v.state.level >= 1 && v.state.level <= 100) s = v.state;
  } catch (e) {
    storage = false;
  }
  if (!Number.isInteger(s.location) || s.location < -1 || s.location >= locations.length) s.location = s.objects.length ? -1 : rollLocation();
  s.best = s.best || {};
  s.shovel = Number.isInteger(s.shovel) ? Math.max(1, Math.min(100, s.shovel)) : 1;
  s.food = Array.isArray(s.food) ? s.food.slice(0, 3).map(n => Number.isInteger(n) && n > 0 ? n : 0) : [0, 0, 0];
  while (s.food.length < 3) s.food.push(0);
  s.foodUsed = Number.isFinite(s.foodUsed) ? Math.max(0, Math.min(50, s.foodUsed)) : 0;
  s.energy = Math.max(0, Math.min(maxEnergy(), s.energy));
  s.backpack = Number.isInteger(s.backpack) ? Math.max(1, Math.min(100, s.backpack)) : 1;
  s.bag = Array.isArray(s.bag) ? s.bag : [];
  s.stash = Array.isArray(s.stash) ? s.stash : [];
  s.pantry = Array.isArray(s.pantry) ? s.pantry : [0, 0, 0];
  s.atCamp = typeof s.atCamp === 'boolean' ? s.atCamp : false;
  s.travelSpent = Number.isFinite(s.travelSpent) ? s.travelSpent : 0;
  s.foodSpent = Number.isFinite(s.foodSpent) ? s.foodSpent : 0;
  while (bagUsed() > bagCapacity()) {
    const i = s.food.findIndex(n => n > 0);
    if (i >= 0) {
      s.food[i]--;
      s.pantry[i]++;
    } else {
      s.stash.push(s.bag.pop());
    }
  }
  for (const id of s.collection) if (!Number.isFinite(s.best[id])) s.best[id] = 50;
  for (const o of s.objects) if (!Number.isFinite(o.condition)) o.condition = rollCondition();
  s.survey = Array.isArray(s.survey) ? [...new Set(s.survey.filter(n => Number.isInteger(n) && n >= 0 && n < surveyCols * surveyRows))] : [];
  for (const o of s.objects) if (!Number.isInteger(o.depth) || o.depth < 0 || o.depth > 2) o.depth = rollDepth(currentLocation());
  if (s.pending) {
    if (!Number.isFinite(s.pending.condition)) s.pending.condition = 50;
    delete s.pending.phase;
  }
  for (const o of s.objects) delete o.mark;
}
