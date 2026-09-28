// Strict validation for portable backups. Reading a file never changes game state.
import { types } from '../data/items.js?v=0.23.1';
import { locations } from '../data/locations.js?v=0.23.1';
export const MAX_BACKUP_SIZE = 4 * 1024 * 1024;
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const number = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const integer = (v, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isInteger(v) && number(v, min, max);
const array = (v, check, max = 50000) => Array.isArray(v) && v.length <= max && v.every(check);
const id = v => integer(v, 0, types.length - 1);
const collectible = v => id(v) && types[v].kind !== 'trash';
const item = v => object(v) && id(v.type) && number(v.condition, 0, 100);
const point = v => object(v) && number(v.x, 0, 1) && number(v.y, 0, 1);
export function validateBackupState(s) {
  const fail = () => { throw new Error('Файл містить пошкоджений або несумісний прогрес.'); };
  if (!object(s)) fail();
  for (const key of ['level', 'shovel', 'backpack']) if (!integer(s[key], 1, 100)) fail();
  for (const key of ['coins', 'earned', 'found', 'travelSpent', 'foodSpent']) if (!number(s[key])) fail();
  if (!integer(s.day, 1) || !number(s.energy, 0, 100 + Math.round((s.level - 1) * 100 / 99)) || !number(s.foodUsed, 0, 50) || typeof s.atCamp !== 'boolean' || !point(s)) fail();
  if (!integer(s.location, -1, locations.length - 1) || (s.emergency !== undefined && typeof s.emergency !== 'boolean')) fail();
  if (!array(s.bag, item) || !array(s.stash, item) || !array(s.collection, collectible, types.length) || new Set(s.collection).size !== s.collection.length) fail();
  if (!object(s.best) || Object.keys(s.best).length !== s.collection.length || !s.collection.every(i => number(s.best[i], 0, 100))) fail();
  if (!array(s.food, n => integer(n), 3) || s.food.length !== 3 || !array(s.pantry, n => integer(n), 3) || s.pantry.length !== 3) fail();
  if (s.bag.length + s.food.reduce((a,b) => a+b, 0) > 8 + Math.floor((s.backpack - 1) * 32 / 99)) fail();
  if (!array(s.objects, v => item(v) && point(v) && integer(v.depth, 0, 2) && typeof v.dug === 'boolean', 100) || !array(s.holes, point) || !array(s.survey, n => integer(n, 0, 319), 320)) fail();
  if (s.pending != null && (!item(s.pending) || !number(s.pending.spent, 0, 200) || (s.pending.revealed !== undefined && typeof s.pending.revealed !== 'boolean') || s.atCamp)) fail();
  if (s.lastTrip != null && (!object(s.lastTrip) || !['found','brought','value','travel','food'].every(k => number(s.lastTrip[k])))) fail();
  return s;
}
export function createBackup(state, createdAt = new Date().toISOString()) {
  state = JSON.parse(JSON.stringify(state));
  for (const key of ['earned', 'found']) if (state[key] === undefined) state[key] = 0;
  validateBackupState(state);
  const text = JSON.stringify({format:'last-signal-backup',backupVersion:1,saveVersion:1,gameVersion:'0.23.1',createdAt,state});
  if (text.length > MAX_BACKUP_SIZE) throw new Error('Прогрес завеликий для цього формату копії.');
  return text;
}
export function parseBackup(text) {
  if (typeof text !== 'string' || text.length > MAX_BACKUP_SIZE) throw new Error('Файл завеликий. Максимум — 4 МБ.');
  let data;
  try { data = JSON.parse(text, (key, value) => { if (['__proto__','constructor','prototype'].includes(key)) throw new Error(); return value; }); }
  catch { throw new Error('Не вдалося прочитати файл. Вибери JSON-копію, створену грою.'); }
  if (!object(data) || data.format !== 'last-signal-backup' || data.backupVersion !== 1 || data.saveVersion !== 1 || typeof data.createdAt !== 'string' || !Number.isFinite(Date.parse(data.createdAt))) throw new Error('Це не підтримувана резервна копія «Останнього сигналу».');
  validateBackupState(data.state);
  return data;
}
