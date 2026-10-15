import { t as localize } from './i18n.js?v=0.53.0';
import { currentScreen } from './interface.js?v=0.53.0';
import { resumeGame } from './menu.js?v=0.53.0';
import { firstStepsOffer, startGuide, guideCard } from '../data/guide.js?v=0.53.0';
import { s, save } from './storage.js?v=0.53.0';
import { $ } from './dom.js?v=0.53.0';
import { busy, render, showTab } from './ui.js?v=0.53.0';
import { confirmDeparture, confirmReturnHome } from './camp.js?v=0.53.0';
import { syncWeatherEffects } from './environment-ui.js?v=0.53.0';

let lastCard = '';
export function renderGuide() {
  const card = guideCard(s), key = JSON.stringify(card);
  if (key === lastCard) return;
  lastCard = key;
  $('guideCard').hidden = !card;
  if (!card) return;
  $('guideCount').textContent = localize(card.count);
  $('guideTitle').textContent = localize(card.title);
  $('guideText').textContent = localize(card.text);
  $('guideProgress').value = card.progress;
  $('guideAction').hidden = card.action === 'none';
  $('guideAction').textContent = localize(card.button);
  $('guideDismiss').textContent = localize(firstStepsOffer(s) ? 'Гратиму самостійно' : card.progress === 4 ? 'Завершити підказки' : 'Сховати підказки');
}
function begin() {
  if (!s.guide || s.guide.stage === 4) startGuide(s);
  else s.guide.enabled = true;
  save();
  if (['menu','settings'].includes(currentScreen())) resumeGame(); else render();
  $('guideTitle').focus?.({preventScroll:true});
  $('guideCard').scrollIntoView?.({block:'nearest'});
}
export function openGuide() {
  if (document.querySelector('dialog[open]') || (s.pending && currentScreen() !== 'menu')) return;
  $('guideToggle').disabled = !!s.pending;
  $('guideToggle').textContent = localize(s.guide?.enabled ? 'Сховати покрокові підказки' : s.guide?.stage === 4 ? 'Повторити покрокові підказки' : 'Увімкнути покрокові підказки');
  $('helpDialog').showModal();
  syncWeatherEffects();
}
export function initGuide() {
  $('openHelp').onclick = openGuide;
  $('guideAction').onclick = () => {
    if (busy()) return;
    const action = guideCard(s)?.action;
    if (action === 'begin') {begin(); return;}
    if (action === 'depart') {showTab('camp'); confirmDeparture(); return;}
    if (action === 'home') {confirmReturnHome(); return;}
    if (['search','inventory','journal'].includes(action)) {
      showTab(action);
      const target = $(action === 'search' ? 'field' : action === 'inventory' ? 'inventorySummary' : 'careerTitle');
      target.scrollIntoView?.({block:'start'}); target.focus?.({preventScroll:true});
    }
  };
  $('guideDismiss').onclick = () => {
    if (busy()) return;
    if (!s.guide) startGuide(s);
    s.guide.enabled = false; save(); render();
    $('openMenu').focus?.({preventScroll:true});
  };
  $('guideToggle').onclick = () => {
    if (busy('helpDialog')) return;
    $('helpDialog').close();
    if (s.guide?.enabled) {s.guide.enabled = false; save(); render();}
    else begin();
    syncWeatherEffects();
  };
  $('helpDialog').addEventListener('close', syncWeatherEffects);
}
