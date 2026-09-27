// shop responsibilities for Last Signal.
import { foods } from '../data/balance.js?v=0.15.0';
import { $ } from './dom.js?v=0.15.0';
import { bagCapacity, bagUsed, foodAmount, foodFits, maxEnergy, shovelFactor, upgradeCost } from './rules.js?v=0.15.0';
import { s, save } from './storage.js?v=0.15.0';
import { busy, render } from './ui.js?v=0.15.0';
export let shopRenderKey = '';
export function buyFood(i) {
  if (!foods[i] || busy() || !s.atCamp || s.coins < foods[i].price) return;
  s.coins -= foods[i].price;
  s.pantry[i]++;
  save();
  render();
}
export function eatFood(i) {
  if (!foods[i] || busy() || s.atCamp || s.food[i] < 1 || !foodFits(i)) return;
  s.food[i]--;
  s.foodUsed += foods[i].percent;
  s.foodSpent += foods[i].price;
  s.energy = Math.round((s.energy + foodAmount(i)) * 10) / 10;
  save();
  render();
  $('log').textContent = foods[i].name + ': +' + foodAmount(i) + ' сил.';
}
export function upgradeGear(kind) {
  if (busy() || !s.atCamp || !['detector', 'shovel', 'backpack'].includes(kind)) return;
  const key = kind === 'detector' ? 'level' : kind,
    cost = upgradeCost(kind);
  if (s[key] >= 100 || s.coins < cost) return;
  s.coins -= cost;
  s[key]++;
  save();
  render();
}
export function renderShop() {
  const key = JSON.stringify([s.level, s.shovel, s.backpack, s.atCamp, s.coins, s.energy, s.food, s.pantry, s.foodUsed, s.bag.length, !!s.pending]);
  if (key === shopRenderKey) return;
  shopRenderKey = key;
  $('level').textContent = 'Детектор · ' + s.level + ' / 100';
  $('detectorInfo').textContent = 'Максимум енергії: ' + maxEnergy() + '. Радіус пошуку: +' + Math.round((s.level - 1) * 50 / 99) + '%.';
  $('shovelLevel').textContent = 'Лопата · ' + s.shovel + ' / 100';
  $('shovelInfo').textContent = 'Економія сил: ' + Math.round((1 - shovelFactor()) * 1000) / 10 + '%.';
  $('backpackLevel').textContent = 'Рюкзак · ' + s.backpack + ' / 100';
  $('backpackInfo').textContent = 'Місткість: ' + bagCapacity() + ' місць. ' + (s.backpack < 100 ? 'На рівні ' + Math.min(100, 1 + Math.ceil((bagCapacity() - 7) * 99 / 32)) + ' відкриється наступне місце.' : 'Максимальна місткість.');
  for (const [kind, id, level] of [['detector', 'upgrade', s.level], ['shovel', 'upgradeShovel', s.shovel], ['backpack', 'upgradeBackpack', s.backpack]]) {
    const cost = upgradeCost(kind);
    $(id).textContent = level === 100 ? 'Максимальний рівень' : 'Покращити · ' + cost + ' купонів';
    $(id).disabled = !s.atCamp || level >= 100 || s.coins < cost || !!s.pending;
  }
  $('foodBudget').textContent = s.atCamp ? 'Куплена їжа зберігається вдома. Візьми її в рюкзак перед виїздом.' : 'Магазин доступний лише в таборі. Їжа з рюкзака — у розділі «Рюкзак».';
  $('foodShop').innerHTML = foods.map((f, i) => '<div class="card"><b>' + f.name + ' · +' + foodAmount(i) + ' сил</b><p>Вдома: ' + s.pantry[i] + ' · у рюкзаку: ' + s.food[i] + '</p><button class="secondary" data-buy="' + i + '" ' + (!s.atCamp || s.coins < f.price ? 'disabled' : '') + '>Купити · ' + f.price + ' купонів</button> <button class="secondary" data-packfood="' + i + '" ' + (!s.atCamp || !s.pantry[i] || bagUsed() >= bagCapacity() ? 'disabled' : '') + '>У рюкзак</button></div>').join('');
  $('fieldFood').textContent = 'Їжа: ' + s.food.reduce((a, b) => a + b, 0) + ' · спожито ' + s.foodUsed + '/50% за виїзд';
  $('fieldBag').textContent = 'Рюкзак: ' + bagUsed() + ' / ' + bagCapacity();
}
export function transferFood(i, toBag) {
  if (busy() || !s.atCamp || !foods[i]) return;
  if (toBag) {
    if (!s.pantry[i] || bagUsed() >= bagCapacity()) return;
    s.pantry[i]--;
    s.food[i]++;
  } else {
    if (!s.food[i]) return;
    s.food[i]--;
    s.pantry[i]++;
  }
  save();
  render();
}
export function initShop() {
  $('foodShop').addEventListener('click', e => {
    const buy = e.target.closest('[data-buy]'),
      pack = e.target.closest('[data-packfood]');
    if (buy) buyFood(Number(buy.dataset.buy));
    if (pack) transferFood(Number(pack.dataset.packfood), true);
  });
  $('upgradeShovel').onclick = () => upgradeGear('shovel');
  $('upgradeBackpack').onclick = () => upgradeGear('backpack');
  $('upgrade').onclick = () => upgradeGear('detector');
}
