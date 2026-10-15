import { setPane } from './layout.js?v=0.55.5';
import { $ } from './dom.js?v=0.55.5';
import { s, save, KEY } from './storage.js?v=0.55.5';
import { busy, showTab } from './ui.js?v=0.55.5';
import { currentScreen } from './interface.js?v=0.55.5';
import { openExcavation } from './excavation.js?v=0.55.5';
import { openPacking } from './packing.js?v=0.55.5';
import { t as localize, language, changeLanguage } from './i18n.js?v=0.55.5';

let returnScreen = null, started = false;
// A saved field trip/find can resume after an update. Requiring camp here
// would trap a player whose old build cannot finish the pending dialog.
export function canUpdateGame() {
  return ['menu','settings'].includes(currentScreen()) && !document.querySelector('dialog[open]');
}
export function renderMenu() {
  $('continueGame').textContent = localize(started ? 'Продовжити' : 'Грати');
  $('menuStatus').textContent = localize(s.pending ? 'Є незавершена знахідка' : started ? 'Виїзд '+s.day+' · Колекція: '+s.collection.length : 'Твоя перша знахідка попереду.');
  $('language').value = language;
}
export function resumeGame() {
  started = true;
  if(!returnScreen&&s.atCamp&&s.lastTrip&&s.bag.length)setPane('camp','report');
  showTab(s.pending ? (s.atCamp ? 'camp' : 'search') : returnScreen || (s.atCamp ? 'camp' : 'search'), {focus:!s.pending});
  if (s.pending) {
    if (s.pending.revealed) openPacking(); else openExcavation();
  }
}
export function openMainMenu() {
  if (busy()) return;
  if (!['menu','settings'].includes(currentScreen())) returnScreen = currentScreen();
  save({checkpoint:true}); showTab('menu');
}
export function initMenu() {
  try { started = !!localStorage.getItem(KEY); } catch { /* playable without storage */ }
  $('continueGame').onclick = resumeGame;
  $('openMenu').onclick = openMainMenu;
  $('openSettings').onclick = () => showTab('settings');
  $('settingsBack').onclick = () => showTab('menu');
  $('language').onchange = event => {
    const next = event.target.value;
    if (next === language) return;
    if (!['uk','en'].includes(next) || !save()) {
      $('language').value = language;
      $('languageNote').textContent = localize('Не вдалося зберегти прогрес. Збережи резервну копію перед зміною мови.');
      return;
    }
    if (!changeLanguage(next)) {
      $('language').value = language;
      $('languageNote').textContent = localize('Браузер не дозволяє зберегти мову.');
    }
  };
  renderMenu();
}
