import { createBackup, parseBackup } from './backup-format.js?v=0.55.5';

export const CHECKPOINT_KEY = 'last-signal-checkpoint-v1';
const INTERVAL = 60000;
let lastAttempt = -Infinity, lastSave = null;
const listeners = new Set();
export function onCheckpointChange(listener) { listeners.add(listener); }
export function readCheckpoint() {
  const text = localStorage.getItem(CHECKPOINT_KEY);
  return text ? parseBackup(text) : null;
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
  for (const listener of listeners) { try { listener(ok); } catch { /* Presentation cannot break saving. */ } }
  return ok;
}
