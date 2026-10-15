import { createBackup, parseBackup } from './backup-format.js?v=0.55.5';

export const CHECKPOINT_KEY = 'last-signal-checkpoint-v1';
const INTERVAL = 60000;
let lastAttempt = -Infinity, lastSave = null;
const listeners = new Set();
function notify(ok) {
  for (const listener of listeners) { try { listener(ok); } catch { /* Presentation cannot break saving. */ } }
}
export function onCheckpointChange(listener) { listeners.add(listener); }
export function readCheckpoint() {
  const text = localStorage.getItem(CHECKPOINT_KEY);
  return text ? parseBackup(text) : null;
}
// The optional copy must not occupy space needed by a growing primary save.
// Only a confirmed quota error allows reclaiming our own secondary slot.
export function retryWithoutCheckpoint(error, key, rawSave) {
  if (!['QuotaExceededError','NS_ERROR_DOM_QUOTA_REACHED'].includes(error?.name)) return false;
  let previous = null;
  try {
    previous = localStorage.getItem(CHECKPOINT_KEY);
    if (!previous) return false;
    localStorage.removeItem(CHECKPOINT_KEY);
    localStorage.setItem(key, rawSave);
    lastSave = null; lastAttempt = Date.now();
    notify(false);
    return true;
  } catch {
    // Failed setItem leaves the prior primary intact; put the copy back too.
    if (previous) { try { localStorage.setItem(CHECKPOINT_KEY, previous); } catch { /* Storage unavailable. */ } }
    notify(false);
    return false;
  }
}
// Runs only after a successful primary save. No timer or extra per-frame work:
// ordinary saves are throttled; menu/background saves force a fresh checkpoint.
export function captureCheckpoint(state, rawSave, force = false) {
  if (rawSave === lastSave || !force && Date.now() - lastAttempt < INTERVAL) return false;
  lastAttempt = Date.now();
  let ok = false;
  try {
    const text = createBackup(state);
    localStorage.setItem(CHECKPOINT_KEY, text);
    lastSave = rawSave;
    ok = true;
  } catch { /* A failed secondary write must not invalidate the primary save. */ }
  notify(ok);
  return ok;
}
