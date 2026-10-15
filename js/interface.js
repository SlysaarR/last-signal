import { refreshLayout } from './layout.js?v=0.54.1';
import { t as localize } from './i18n.js?v=0.54.1';
// Device-local presentation settings; never part of the game save or backup.
export const TEXT_SIZE_KEY = 'last-signal-text-size';
const textSizes = new Set(['normal', 'large', 'largest']);
const screenTargets = {
  menu: 'menuTitle', settings: 'settingsTitle',
  camp: 'campTitle', inventory: 'inventoryTitle', search: 'field',
  gear: 'gearTitle', collection: 'collectionTitle', journal: 'journalTitle', atlas: 'atlasTitle'
};
const get = id => document.getElementById(id);
let selectedScreen = 'menu';
export const currentScreen = () => selectedScreen;

export function setTextSize(value, persist = true) {
  const size = textSizes.has(value) ? value : 'normal';
  document.documentElement.dataset.textSize = size;
  get('textSize').value = size;
  let saved = true;
  if (persist) {
    try { localStorage.setItem(TEXT_SIZE_KEY, size); }
    catch { saved = false; }
  }
  get('textSizeNote').textContent = localize(saved
    ? 'Розмір запам’ятовується на цьому пристрої. Масштаб браузера також працює.'
    : 'Розмір змінено. Браузер не дозволяє зберегти налаштування — після закриття його доведеться вибрати знову.');
  if(persist)refreshLayout();
  return size;
}

export function selectScreen(tab) {
  if (!Object.hasOwn(screenTargets, tab)) return false;
  selectedScreen = tab;
  document.documentElement.dataset.screen = tab;
  for (const id of Object.keys(screenTargets)) get(id).hidden = id !== tab;
  // Atlas and journal are camp subsections; location identifies their parent.
  const parent = tab === 'journal' || tab === 'atlas' ? 'camp' : tab;
  document.querySelectorAll('[data-tab]').forEach(button => {
    const active = button.dataset.tab === parent;
    button.classList.toggle('active', active);
    button.setAttribute('aria-current', active ? (parent === tab ? 'page' : 'location') : 'false');
  });
  get('skipToScreen').href = '#' + screenTargets[tab];
  return true;
}

export function focusScreen(tab) {
  if (!Object.hasOwn(screenTargets, tab)) return;
  // Do not pull keyboard focus out of a modal during a background refresh.
  if (document.querySelector('dialog[open]')) return;
  const target = get(screenTargets[tab]);
  target.focus({preventScroll: true});
  target.scrollIntoView({block: 'nearest'});
}

export function initInterface() {
  let saved;
  try { saved = localStorage.getItem(TEXT_SIZE_KEY); } catch { /* usable without storage */ }
  setTextSize(saved, false);
  get('textSize').onchange = event => setTextSize(event.target.value);
  get('skipToScreen').onclick = event => {
    event.preventDefault();
    const target = get(get('skipToScreen').href.split('#').pop());
    target.focus({preventScroll: true});
    target.scrollIntoView({block: 'start'});
  };
  // The fixed phone navigation can grow with text, wrapping and safe-area insets.
  // Observe only its size; changing bottom clearance does not resize the nav.
  const nav = get('gameNav');
  let previous = -1;
  const measure = () => {
    const height = Math.ceil(nav.getBoundingClientRect().height);
    if (height === previous) return;
    previous = height;
    document.documentElement.style.setProperty('--nav-height', height + 'px');
  };
  new ResizeObserver(measure).observe(nav);
  measure();
}
