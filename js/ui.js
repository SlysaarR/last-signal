// Shared navigation, detector readout and quick sheets. Rendering functions never award items.
import { renderCamp } from './camp.js?v=0.20.0';
import { foods } from '../data/balance.js?v=0.20.0';
import { types } from '../data/items.js?v=0.20.0';
import { renderCollection } from './collection.js?v=0.20.0';
import { $ } from './dom.js?v=0.20.0';
import { draw } from './graphics/field.js?v=0.20.0';
import { renderInventory } from './inventory.js?v=0.20.0';
import { canLeave, emergencyAllowed, foodAmount, foodAvailable, foodFits, maxEnergy, minDig } from './rules.js?v=0.20.0';
import { digInfo, signal } from './search.js?v=0.20.0';
import { eatFood, renderShop } from './shop.js?v=0.20.0';
import { s } from './storage.js?v=0.20.0';
import { currentLocation } from './world.js?v=0.20.0';
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
  return !!s.pending || $('modal').open || $('excavate').open || $('packDialog').open || $('tripMenu').open || $('quickFood').open;
}
export function showTab(tab) {
  if (tab === 'search' && s.atCamp) tab = 'camp';
  for (const id of ['camp', 'inventory', 'search', 'gear', 'collection']) $(id).hidden = id !== tab;
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  render();
}
export function render() {
  const loc = currentLocation();
  $('locationName').textContent = loc.name;
  $('locationRarity').hidden = true;
  $('locationRarity').style.color = loc.accent;
  $('potential').hidden = true;
  $('potential').style.color = loc.accent;
  $('locationHint').textContent = 'Що приховує ця ділянка — дізнаєшся під час пошуку.';
  $('finish').disabled = !canLeave();
  $('finish').textContent = emergencyAllowed() ? 'Аварійний виїзд · безкоштовно' : 'Нова локація · 25 купонів';
  $('tripGate').textContent = canLeave() ? 'Залишену ділянку повернути не можна.' : foodAvailable() ? 'Бракує 25 купонів на дорогу. Можна продовжити пошук або повернутися додому.' : 'Бракує 25 купонів. Повернення додому безкоштовне.';
  const n = signal();
  $('energy').textContent = s.energy + ' / ' + maxEnergy();
  $('coins').textContent = s.coins;
  $('day').textContent = String(s.day).padStart(2, '0');
  $('strength').textContent = String(n.power).padStart(2, '0');
  $('metal').hidden = s.level < 10;
  $('metal').textContent = n.obj && n.power > 50 ? types[n.obj.type].metal === 'iron' ? 'Чорний метал' : 'Кольоровий метал' : 'Метал: наблизься до сигналу';
  [...$('bars').children].forEach((b, i) => b.style.background = i < n.power / 5 ? n.power > 80 ? '#d2e58e' : '#81ad84' : '#2b403a');
  const info = digInfo();
  $('dig').textContent = s.level >= 50 ? 'Копати · до ' + info.cost + ' сил' : 'Копати';
  $('hint').textContent = s.energy < minDig() ? 'Сили вичерпано. Час завершити виїзд.' : n.power > 84 ? 'Чіткий сигнал. Копати чи шукати далі?' : n.power > 35 ? 'Метал поруч. Шукай пік сигналу.' : 'Веди металошукачем і слухай сигнал.';
  if (s.energy >= minDig() && s.energy < info.cost) $('hint').textContent = 'На цю розкопку бракує енергії. Перевір їжу або пошукай інший сигнал.';
  $('dig').disabled = s.energy < info.cost || !!s.pending;
  if (s.level >= 25 && n.obj && n.power > 35) $('hint').textContent += ' ' + (s.level >= 50 ? info.name : ['Неглибокий сигнал.', 'Середня глибина.', 'Глибокий сигнал.'][n.obj.depth]);
  renderShop();
  renderInventory();
  renderCamp();
  renderCollection();
  renderFieldChrome();
  draw();
}
export function initUI() {
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
  document.querySelectorAll('nav button').forEach(b => b.addEventListener('click', () => window.scrollTo(0, 0)));
  new ResizeObserver(() => {
    if (!document.getElementById('search').hidden) draw();
  }).observe(document.getElementById('field'));
  renderFieldChrome();
}
