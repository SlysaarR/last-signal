import { t as localize } from './i18n.js?v=0.55.5';
import { captureCheckpoint } from './checkpoint.js?v=0.55.5';
import { GEAR_VERSION, migrateGear } from '../data/gear.js?v=0.55.5';
import { routes, validProgress } from '../data/expeditions.js?v=0.55.5';
// Save loading, legacy migration and persistence. Keep KEY and the version-1 envelope compatible.
import { surveyCols, surveyRows } from '../data/balance.js?v=0.55.5';
import { locations } from '../data/locations.js?v=0.55.5';
import { $ } from './dom.js?v=0.55.5';
import { bagCapacity, bagUsed, maxEnergy, rollCondition } from './rules.js?v=0.55.5';
import { currentLocation, rollDepth, rollLocation } from './world.js?v=0.55.5';
import { validateBackupState } from './backup-format.js?v=0.55.5';
export const KEY = 'last-signal-v1';
export function fresh() {
  return {
    coins: 0,
    energy: 100,
    day: 1,
    level: 1,
    shovel: 1,
    backpack: 1,
    gearVersion: GEAR_VERSION,
    gearCredit: {detector:0,shovel:0,backpack:0},
    energyCapacity: 100,
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
// A bad/unknown save must never be replaced by the startup autosave.
let protectedSave = false;
export function save(options = {}) {
  if (protectedSave) {
    storage = false;
    $('saveNote').hidden = false;
    return false;
  }
  try {
    const rawSave = JSON.stringify({
      version: 1,
      state: s
    });
    localStorage.setItem(KEY, rawSave);
    storage = true;
    captureCheckpoint(s, rawSave, options?.checkpoint === true);
  } catch (e) {
    storage = false;
  }
  $('saveNote').hidden = storage;
  return storage;
}
export function loadGame() {
  let raw = null;
  try {
    raw = localStorage.getItem(KEY);
    if (raw !== null) {
      const v = JSON.parse(raw);
      if (!v || v.version !== 1 || !v.state || !Array.isArray(v.state.objects) || !Array.isArray(v.state.collection) || !Array.isArray(v.state.holes) || !Number.isFinite(v.state.coins) || !Number.isInteger(v.state.level) || v.state.level < 1 || v.state.level > 100) throw new Error('Invalid save');
      s = v.state;
    }
    migrateState();
    // Historical saves may omit these unused counters. Do not rewrite their shape.
    validateBackupState({...s, earned:s.earned ?? 0, found:s.found ?? 0});
  } catch (e) {
    storage = false;
    protectedSave = raw !== null;
    s = fresh();
    migrateState();
    if (protectedSave) $('saveNote').textContent = localize('Не вдалося прочитати збереження. Початкові дані залишено без змін. Тимчасова гра не записується — віднови справну JSON-копію в налаштуваннях.');
  }
}
function migrateState() {
  if (!Number.isInteger(s.location) || s.location < -1 || s.location >= locations.length) s.location = s.objects.length ? -1 : rollLocation();
  if(s.progress && !validProgress(s.progress,locations.length)) throw new Error('Invalid journal');
  if(s.route !== undefined && !routes.some(r=>r.id===s.route)) throw new Error('Invalid route');
  s.best = s.best || {};
  s.shovel = Number.isInteger(s.shovel) ? Math.max(1, Math.min(100, s.shovel)) : 1;
  s.food = Array.isArray(s.food) ? s.food.slice(0, 3).map(n => Number.isInteger(n) && n > 0 ? n : 0) : [0, 0, 0];
  while (s.food.length < 3) s.food.push(0);
  s.foodUsed = Number.isFinite(s.foodUsed) ? Math.max(0, Math.min(50, s.foodUsed)) : 0;
  s.backpack = Number.isInteger(s.backpack) ? Math.max(1, Math.min(100, s.backpack)) : 1;
  migrateGear(s);
  s.energy = Math.max(0, Math.min(maxEnergy(), s.energy));
  s.bag = Array.isArray(s.bag) ? s.bag : [];
  s.stash = Array.isArray(s.stash) ? s.stash : [];
  s.pantry = Array.isArray(s.pantry) ? s.pantry : [0, 0, 0];
  s.atCamp = typeof s.atCamp === 'boolean' ? s.atCamp : false;
  s.travelSpent = Number.isFinite(s.travelSpent) ? s.travelSpent : 0;
  s.foodSpent = Number.isFinite(s.foodSpent) ? s.foodSpent : 0;
  let overflow = Math.max(0, bagUsed() - bagCapacity());
  for (let i = 0; i < s.food.length && overflow > 0; i++) {
    const amount = Math.min(s.food[i], overflow);
    s.food[i] -= amount;
    s.pantry[i] += amount;
    overflow -= amount;
  }
  if (overflow > 0) s.stash = s.stash.concat(s.bag.splice(Math.max(0, s.bag.length - overflow)).reverse());
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

// Save the previous state first; abort restoration if either write is unavailable.
export const RECOVERY_KEY = 'last-signal-before-restore-v1';
export function installBackupState(next, recoveryText) {
  validateBackupState(next);
  const incoming = JSON.stringify({version:1,state:next});
  localStorage.setItem(RECOVERY_KEY, recoveryText);
  localStorage.setItem(KEY, incoming);
  s = next; // pagehide must save the imported state, never overwrite it with the old one.
  protectedSave = false;
  storage = true;
}

