import { setPane, currentPane } from './layout.js?v=0.55.1';
import { t as localize } from './i18n.js?v=0.55.1';
import { selectScreen, focusScreen } from './interface.js?v=0.55.1';
import { renderMenu } from './menu.js?v=0.55.1';
import { renderGuide } from './guide-ui.js?v=0.55.1';
import { syncWeatherEffects } from './environment-ui.js?v=0.55.1';
import { currentEnvironment, environmentName } from '../data/environment.js?v=0.55.1';
import { renderCareer, renderAlbumSets, renderMainObjective } from './career-ui.js?v=0.55.1';
import { renderAtlas, openAtlas } from './atlas-ui.js?v=0.55.1';
import { activeSite, siteName } from '../data/atlas.js?v=0.55.1';
import { detectorFeatures, detectorSettings } from '../data/gear.js?v=0.55.1';
import { initDetectorControls, renderDetectorControls } from './detector-controls.js?v=0.55.1';
import { signalDescription } from './detector.js?v=0.55.1';
import { renderOrders, renderOrderSummary } from './orders-ui.js?v=0.55.1';
import { renderMarkControls } from './field-notes.js?v=0.55.1';
import { renderCoinThumbnails } from './graphics/ukrainian-coins.js?v=0.55.1';
import { renderJournal } from './journal.js?v=0.55.1';
import { conditions } from '../data/expeditions.js?v=0.55.1';
// Shared navigation, detector readout and quick sheets. Rendering functions never award items.
import { renderCamp } from './camp.js?v=0.55.1';
import { foods } from '../data/balance.js?v=0.55.1';
import { renderCollection } from './collection.js?v=0.55.1';
import { $ } from './dom.js?v=0.55.1';
import { draw } from './graphics/field.js?v=0.55.1';
import { renderInventory } from './inventory.js?v=0.55.1';
import { bagCapacity, bagUsed, canLeave, emergencyAllowed, foodAmount, foodAvailable, foodFits, maxEnergy, minDig, travelCost } from './rules.js?v=0.55.1';
import { digInfo, signal } from './search.js?v=0.55.1';
import { eatFood, renderShop } from './shop.js?v=0.55.1';
import { s } from './storage.js?v=0.55.1';
import { currentLocation } from './world.js?v=0.55.1';
export function renderFieldChrome() {
  const choices = document.getElementById('quickFoodChoices');
  if (!choices) return;
  choices.replaceChildren();
  const count = s.food.reduce((a, b) => a + b, 0);
  $('fieldFood').textContent = localize('Їжа: ' + count + ' · спожито ' + s.foodUsed + '/50% за виїзд');
  document.getElementById('foodQuick').textContent = localize('Їжа · ' + count);
  if (!count) {
    const p = document.createElement('p');
    p.textContent = localize('У рюкзаку немає їжі. Поповни запас у таборі перед наступним виїздом.');
    choices.append(p);
    return;
  }
  foods.forEach((f, i) => {
    if (!s.food[i]) return;
    const b = document.createElement('button');
    b.className = 'secondary food-option';
    b.disabled = !foodFits(i) || !!s.pending;
    const text = document.createElement('span'),
      name = document.createElement('b'),
      note = document.createElement('small'),
      amount = document.createElement('span');
    name.textContent = localize(f.name + ' × ' + s.food[i]);
    note.textContent = localize(foodFits(i) ? 'Відновити ' + foodAmount(i) + ' енергії' : s.foodUsed + f.percent > 50 ? 'Ліміт їжі на цей виїзд' : 'Зараз забагато енергії');
    amount.textContent = localize('+' + f.percent + '%');
    text.append(name, note);
    b.append(text, amount);
    b.onclick = () => {
      document.getElementById('quickFood').close();
      eatFood(i);
    };
    choices.append(b);
  });
}
export function busy(except=null) {
  return !!s.pending || ['helpDialog', 'appUpdateDialog', 'backupDialog', 'tripMenu', 'fieldNotes', 'quickFood', 'packDialog', 'inventoryReview', 'modal', 'excavate', 'coinDetail', 'coachDialog', 'routeDialog', 'gearHelpDialog', 'albumHelpDialog', 'journalHelpDialog', 'visitedDialog', 'atlasInfoDialog', 'fieldToolsDialog', 'objectiveInfoDialog'].some(id => id!==except&&$(id).open);
}
export function showTab(tab, {focus = true} = {}) {
  if (tab === 'search' && s.atCamp) tab = 'camp';
  if (!selectScreen(tab)) return;
  render();
  window.scrollTo(0,0);
  renderCoinThumbnails();
  if (focus) focusScreen(tab);
}
export function render() {
  document.documentElement.dataset.atCamp=String(s.atCamp);
  if(!s.atCamp&&['stash','pantry'].includes(currentPane('inventory')))setPane('inventory','bag');
  if (!$('menu').hidden || !$('settings').hidden) renderMenu();
  renderGuide();
  syncWeatherEffects();
  const loc = currentLocation();
  const site=activeSite(s);
  $('locationName').textContent = localize(site?siteName(site):loc.name);
  $('locationRarity').hidden = false;
  const soil = conditions[s.progress?.active?.condition] || conditions[0];
  $('locationRarity').textContent = localize(currentEnvironment(s)?environmentName(currentEnvironment(s)):soil.name + (soil.factor===1?'':soil.factor<1?' · −10% сил':' · +20% сил'));
  $('locationRarity').style.color = loc.accent;
  $('potential').hidden = true;
  $('potential').style.color = loc.accent;
  $('locationHint').textContent = localize('Що приховує ця ділянка — дізнаєшся під час пошуку.');
  $('finish').disabled=!!s.pending;
  $('finish').textContent=localize('Карта · обрати інше місце');
  $('tripGate').textContent=localize('Ділянка й мітки збережуться. Переїзд не відновлює сили та ліміт їжі; повернення до табору безкоштовне.');
  renderResource('energy',s.energy,'Енергія: '+s.energy+' / '+maxEnergy());
  renderResource('coins',compactResource(s.coins),'Купони: '+s.coins);
  renderResource('day',compactResource(s.day),'Виїзд: '+s.day);
  // Hidden screens catch up when opened; a find must not scan the whole stash
  // or rebuild hundreds of album canvases while the player is in the field.
  if (!$('gear').hidden) renderShop();
  if (!$('inventory').hidden) renderInventory();
  if (!$('camp').hidden) {renderCamp();renderJournal('camp');renderOrderSummary('camp');renderMainObjective('camp');}
  if (!$('atlas').hidden) renderAtlas();
  if (!$('journal').hidden) {renderJournal('journal');renderOrders();renderCareer();}
  if (!$('collection').hidden) {renderCollection();renderAlbumSets();}
  if (!$('search').hidden) {
    $('fieldBag').textContent = localize('Рюкзак: ' + bagUsed() + ' / ' + bagCapacity());
    const reading=signal();
    renderDetector(reading);renderFieldChrome();renderOrderSummary('search');renderMainObjective('search');
    $('openFieldTools').hidden=$('fieldPanel').hidden;draw(reading);
  }
}
// Moving the coil must not rebuild inventory cards, shop controls or album art.
export function renderDetector(n=signal()) {
  renderMarkControls();
  const features=detectorFeatures(s.level),settings=detectorSettings(s);
  const meter=settings.mode==='pinpoint'?n.focus:n.power;
  $('strength').textContent = localize(String(meter).padStart(2, '0'));
  renderDetectorControls(n);
  $('metal').hidden = false;
  $('metal').textContent = localize(signalDescription(n,s.level));
  $('targetId').textContent = localize(s.level<2 ? 'Зі ступеня 2' : n.power<25 ? '—' : '≈ '+n.id);
  $('signalStability').textContent = localize(n.power<5 ? '—' : n.stability>=70 ? 'Стабільний' : n.stability>=40 ? 'Мінливий' : 'Нечіткий');
  $('signalStability').dataset.quality = n.power<5?'none':n.stability>=70?'clear':'mixed';
  [...$('bars').children].forEach((b, i) => b.style.background = i < meter / 5 ? n.pinpoint ? '#b5792b' : '#327d8d' : '#9aafb9');
  const info = digInfo(n);
  $('dig').textContent = localize('Копати · ' + info.cost + ' сил');
  $('hint').textContent = localize(s.energy < minDig() ? 'Сили вичерпано. Час завершити виїзд.' : n.pinpoint ? 'Центр відгуку. Можна копати.' : n.power > 5 ? 'Проведи навхрест: шукай найсильніший відгук.' : 'Веди металошукачем і слухай сигнал.');
  if (s.energy >= minDig() && s.energy < info.cost) $('hint').textContent = localize('На цю розкопку бракує енергії. Перевір їжу або пошукай інший сигнал.');
  $('dig').disabled = s.energy < info.cost || !!s.pending;
  const exhausted=s.energy<minDig();
  $('dig').hidden=exhausted;
  $('fieldExit').hidden=!exhausted;
  $('fieldExit').disabled=!!s.pending||s.atCamp;
  $('fieldExit').title=localize('Сили вичерпано. Повернення до табору безкоштовне.');
  $('dig').title=localize(s.energy<info.cost?'Бракує енергії для цієї розкопки. Можна пошукати легший сигнал або поїсти.':'');
  if(features.depth&&n.obj&&n.power>25) $('hint').textContent+=localize(' '+(features.depthRange&&n.stability>=60?['Приблизно 5–15 см.','Приблизно 15–30 см.','Приблизно 30–50 см.'][n.depth]:['Орієнтовно неглибоко.','Орієнтовно середня глибина.','Орієнтовно глибоко.'][n.depth]));

}
export function initUI() {
  initDetectorControls();
  document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => {
    const sheet=b.closest?.('dialog');if(busy(sheet?.id))return;sheet?.close();
    if(b.dataset.openPane)setPane(b.dataset.open,b.dataset.openPane);
    b.dataset.open==='atlas'?openAtlas():showTab(b.dataset.open);
  });
  document.querySelectorAll('[data-tab]').forEach(btn => btn.onclick = () => showTab(btn.dataset.tab));
  document.getElementById('tripMenuButton').onclick = () => {
    if (!busy()) document.getElementById('tripMenu').showModal();
  };
  document.getElementById('foodQuick').onclick = () => {
    if (!busy()) {
      renderFieldChrome();
      document.getElementById('quickFood').showModal();
    }
  };
  document.querySelectorAll('[data-close]').forEach(b => b.onclick = () => document.getElementById(b.dataset.close).close());
  for (const id of ['returnHome', 'finish']) document.getElementById(id).addEventListener('click', () => document.getElementById('tripMenu').close(), true);
  new ResizeObserver(() => {
    if (!document.getElementById('search').hidden) draw();
  }).observe(document.getElementById('field'));
  renderFieldChrome();
}


// Abbreviate only large counters. Focus/hover and assistive labels retain the exact value.
export function compactResource(value) {
  if(value>=1e6)return Math.floor(value/1e5)/10+'M';
  if(value>=1e5)return Math.floor(value/1000)+'k';
  return value;
}
function renderResource(id,value,label) {
  $(id).textContent=localize(value);
  const stat=$(id+'Stat'),description=localize(label);
  stat.title=description;stat.setAttribute('aria-label',description);stat.dataset.tooltip=description;
}
