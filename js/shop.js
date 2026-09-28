// shop responsibilities for Last Signal.
import { foods } from '../data/balance.js?v=0.23.2';
import { $ } from './dom.js?v=0.23.2';
import { bagCapacity, bagUsed, foodAmount, foodFits, maxEnergy, shovelFactor, upgradeCost } from './rules.js?v=0.23.2';
import { s, save } from './storage.js?v=0.23.2';
import { busy, render } from './ui.js?v=0.23.2';
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
  const fmt = n => Number(n.toFixed(1)).toLocaleString('uk-UA');
  const row = (name, current, next, unit = '') => `<div class="gear-stat"><span>${name}</span><strong>${current}${next === null ? '' : ' <span aria-label="після покращення">→</span> <em>' + next + '</em>'} ${unit}</strong></div>`;
  const nextDetector = Math.min(100, s.level + 1), nextShovel = Math.min(100, s.shovel + 1), nextBag = Math.min(100, s.backpack + 1);
  $('level').textContent = 'Металошукач';
  $('detectorInfo').innerHTML = row('Максимум енергії', maxEnergy(), s.level < 100 ? maxEnergy(nextDetector) : null) + row('Бонус радіуса пошуку', '+' + fmt((s.level - 1) * 50 / 99), s.level < 100 ? '+' + fmt((nextDetector - 1) * 50 / 99) : null, '%');
  const unlocks = [[10, 'Розрізнення чорного й кольорового металу'], [25, 'Приблизна глибина сигналу'], [50, 'Оцінка глибини та витрат енергії']];
  $('detectorMilestones').innerHTML = unlocks.map(([level, text]) => `<li class="${s.level >= level ? 'unlocked' : ''}"><span>${s.level >= level ? '✓' : level}</span>${text}</li>`).join('');
  $('shovelLevel').textContent = 'Лопата';
  const saving = level => fmt((1 - shovelFactor(level)) * 100);
  $('shovelInfo').innerHTML = row('Економія енергії', saving(s.shovel), s.shovel < 100 ? saving(nextShovel) : null, '%') + row('Розкопка вартістю 10 сил', fmt(Math.round(10 * shovelFactor() * 10) / 10), s.shovel < 100 ? fmt(Math.round(10 * shovelFactor(nextShovel) * 10) / 10) : null);
  $('shovelNote').textContent = 'Витрати округлюються до десятих: окреме покращення може не змінити ціну конкретної розкопки.';
  $('backpackLevel').textContent = 'Рюкзак';
  $('backpackInfo').innerHTML = row('Місткість', bagCapacity(), s.backpack < 100 ? bagCapacity(nextBag) : null, 'місць');
  $('backpackNote').textContent = s.backpack === 100 ? 'Максимальна місткість досягнута.' : bagCapacity(nextBag) > bagCapacity() ? 'Наступне покращення додасть одне місце.' : 'Наступний рівень ще не додає місця. Додаткове місце відкриється на рівні ' + (1 + Math.ceil((bagCapacity() - 7) * 99 / 32)) + '.';
  for (const [kind, id, level] of [['detector', 'upgrade', s.level], ['shovel', 'upgradeShovel', s.shovel], ['backpack', 'upgradeBackpack', s.backpack]]) {
    const cost = upgradeCost(kind);
    $(kind + 'Badge').textContent = 'Рівень ' + level + ' / 100';
    $(id).textContent = level === 100 ? 'Максимальний рівень' : 'Покращити · ' + cost + ' купонів';
    $(id).disabled = !s.atCamp || level >= 100 || s.coins < cost || !!s.pending;
    $(kind + 'Reason').textContent = level === 100 ? 'Усі покращення відкриті.' : !s.atCamp ? 'Покращення доступні в таборі.' : s.pending ? 'Спершу заверши розкопку.' : s.coins < cost ? 'Бракує ' + (cost - s.coins) + ' купонів' : 'Перехід на рівень ' + (level + 1);
  }
  $('workshopStatus').textContent = s.atCamp ? 'Твій бюджет: ' + s.coins + ' купонів. Стрілка показує характеристики після одного покращення.' : 'Ти в полі. Характеристики можна переглядати, а покупки й покращення доступні в таборі.';
  $('foodBudget').textContent = 'Покупка → домашні запаси → рюкзак. Кожна порція займає одне місце. За виїзд можна з’їсти до 50% від максимальної енергії.';
  $('foodShop').innerHTML = foods.map((f, i) => `<article class="food-card"><div class="food-title"><h3>${f.name}</h3><strong>+${foodAmount(i)}<small> енергії</small></strong></div><p>${f.percent}% від максимуму · одноразова порція</p><div class="food-stock"><span>Вдома <b>${s.pantry[i]}</b></span><span>У рюкзаку <b>${s.food[i]}</b></span></div><div class="food-buttons"><button class="secondary" data-buy="${i}" ${!s.atCamp || s.coins < f.price || s.pending ? 'disabled' : ''}>Купити · ${f.price}</button><button class="secondary" data-packfood="${i}" ${!s.atCamp || !s.pantry[i] || bagUsed() >= bagCapacity() || s.pending ? 'disabled' : ''}>У рюкзак</button></div><small class="food-note">${!s.atCamp ? 'Магазин доступний у таборі.' : bagUsed() >= bagCapacity() ? 'Рюкзак повний. Покупка залишиться вдома.' : 'Ціна в купонах. Куплена порція з’явиться вдома.'}</small></article>`).join('');
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
