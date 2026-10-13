import { detectorFeatures, detectorSettings } from '../data/gear.js?v=0.35.0';
import { initDetectorControls, renderDetectorControls } from './detector-controls.js?v=0.35.0';
import { signalDescription } from './detector.js?v=0.35.0';
import { renderJournal } from './journal.js?v=0.35.0';
import { conditions } from '../data/expeditions.js?v=0.35.0';
// Shared navigation, detector readout and quick sheets. Rendering functions never award items.
import { renderCamp } from './camp.js?v=0.35.0';
import { foods } from '../data/balance.js?v=0.35.0';
import { renderCollection } from './collection.js?v=0.35.0';
import { $ } from './dom.js?v=0.35.0';
import { draw } from './graphics/field.js?v=0.35.0';
import { renderInventory } from './inventory.js?v=0.35.0';
import { canLeave, emergencyAllowed, foodAmount, foodAvailable, foodFits, maxEnergy, minDig, travelCost } from './rules.js?v=0.35.0';
import { digInfo, signal } from './search.js?v=0.35.0';
import { eatFood, renderShop } from './shop.js?v=0.35.0';
import { s } from './storage.js?v=0.35.0';
import { currentLocation } from './world.js?v=0.35.0';
export function renderFieldChrome() {
  const choices = document.getElementById('quickFoodChoices');
  if (!choices) return;
  choices.replaceChildren();
  const count = s.food.reduce((a, b) => a + b, 0);
  document.getElementById('foodQuick').textContent = 'Їжа · ' + count;
  if (!count) {
    const p = document.createElement('p');
    p.textContent = 'У рюкзаку немає їжі. Поповни запас у таборі перед наступним виїздом.';
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
    name.textContent = f.name + ' × ' + s.food[i];
    note.textContent = foodFits(i) ? 'Відновити ' + foodAmount(i) + ' енергії' : s.foodUsed + f.percent > 50 ? 'Ліміт їжі на цей виїзд' : 'Зараз забагато енергії';
    amount.textContent = '+' + f.percent + '%';
    text.append(name, note);
    b.append(text, amount);
    b.onclick = () => {
      document.getElementById('quickFood').close();
      eatFood(i);
    };
    choices.append(b);
  });
}
export function busy() {
  return !!s.pending || ['modal','excavate','packDialog','tripMenu','quickFood','coinDetail','backupDialog'].some(id => $(id).open);
}
export function showTab(tab) {
  if (tab === 'search' && s.atCamp) tab = 'camp';
  for (const id of ['camp', 'inventory', 'search', 'gear', 'collection', 'journal']) $(id).hidden = id !== tab;
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  render();
  window.scrollTo(0,0);
}
export function render() {
  const loc = currentLocation();
  $('locationName').textContent = loc.name;
  $('locationRarity').hidden = false;
  const soil = conditions[s.progress?.active?.condition] || conditions[0];
  $('locationRarity').textContent = soil.name + (soil.factor===1?'':soil.factor<1?' · −10% сил':' · +20% сил');
  $('locationRarity').style.color = loc.accent;
  $('potential').hidden = true;
  $('potential').style.color = loc.accent;
  $('locationHint').textContent = 'Що приховує ця ділянка — дізнаєшся під час пошуку.';
  $('finish').disabled = !canLeave();
  $('finish').textContent = emergencyAllowed() ? 'Аварійний виїзд · безкоштовно' : 'Нова ділянка · '+travelCost()+' купонів';
  $('tripGate').textContent = canLeave() ? 'Залишену ділянку повернути не можна.' : foodAvailable() ? 'Бракує '+travelCost()+' купонів на дорогу. Можна продовжити пошук або повернутися додому.' : 'Бракує '+travelCost()+' купонів. Повернення додому безкоштовне.';
  $('energy').textContent = s.energy + ' / ' + maxEnergy();
  $('coins').textContent = s.coins;
  $('day').textContent = String(s.day).padStart(2, '0');
  renderDetector();
  renderShop();
  renderInventory();
  renderCamp();
  renderJournal();
  renderCollection();
  renderFieldChrome();
  if (!$('search').hidden) draw();
}
// Moving the coil must not rebuild inventory cards, shop controls or album art.
export function renderDetector() {
  const n = signal();
  const features=detectorFeatures(s.level),settings=detectorSettings(s);
  const meter=settings.mode==='pinpoint'?n.focus:n.power;
  $('strength').textContent = String(meter).padStart(2, '0');
  renderDetectorControls(n);
  $('metal').hidden = false;
  $('metal').textContent = signalDescription(n,s.level);
  $('targetId').textContent = s.level<2 ? 'Зі ступеня 2' : n.power<25 ? '—' : '≈ '+n.id;
  $('signalStability').textContent = n.power<5 ? '—' : n.stability>=70 ? 'Стабільний' : n.stability>=40 ? 'Мінливий' : 'Нечіткий';
  $('signalStability').dataset.quality = n.power<5?'none':n.stability>=70?'clear':'mixed';
  [...$('bars').children].forEach((b, i) => b.style.background = i < meter / 5 ? n.pinpoint ? '#d2e58e' : '#81ad84' : '#2b403a');
  const info = digInfo();
  $('dig').textContent = 'Копати · ' + info.cost + ' сил';
  $('hint').textContent = s.energy < minDig() ? 'Сили вичерпано. Час завершити виїзд.' : n.pinpoint ? 'Центр відгуку. Можна копати.' : n.power > 5 ? 'Проведи навхрест: шукай найсильніший відгук.' : 'Веди металошукачем і слухай сигнал.';
  if (s.energy >= minDig() && s.energy < info.cost) $('hint').textContent = 'На цю розкопку бракує енергії. Перевір їжу або пошукай інший сигнал.';
  $('dig').disabled = s.energy < info.cost || !!s.pending;
  if(features.depth&&n.obj&&n.power>25) $('hint').textContent+=' '+(features.depthRange&&n.stability>=60?['Приблизно 5–15 см.','Приблизно 15–30 см.','Приблизно 30–50 см.'][n.depth]:['Орієнтовно неглибоко.','Орієнтовно середня глибина.','Орієнтовно глибоко.'][n.depth]);

}
export function initUI() {
  initDetectorControls();
  document.querySelectorAll('[data-open]').forEach(b => b.onclick = () => showTab(b.dataset.open));
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

