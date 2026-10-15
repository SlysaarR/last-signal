import { pageWindow, layoutRevision } from './layout.js?v=0.55.1';
import { t as localize, translateHTML, dateLocale } from './i18n.js?v=0.55.1';
import { drawDetectorPreview } from './graphics/detector-art.js?v=0.55.1';
import { MAX_GEAR_LEVEL, creditFor, detectorMilestones, detectorLook } from '../data/gear.js?v=0.55.1';
import { chosenRoute } from '../data/expeditions.js?v=0.55.1';
// shop responsibilities for Last Signal.
import { foods } from '../data/balance.js?v=0.55.1';
import { $ } from './dom.js?v=0.55.1';
import { bagCapacity, bagUsed, detectorStats, foodAmount, foodFits, maxEnergy, shovelFactor, upgradeCost } from './rules.js?v=0.55.1';
import { s, save } from './storage.js?v=0.55.1';
import { busy, render } from './ui.js?v=0.55.1';
export let shopRenderKey = '';
export function purchaseBudgetNote(cost) {
  if(!s.atCamp||s.pending||cost>s.coins)return '';
  const remaining=s.coins-cost,fare=chosenRoute(s).cost;
  return 'Після покупки: '+remaining+' купонів. '+(remaining<25?'Доступне безкоштовне бідне узбіччя.':remaining<fare?'На вибраний напрямок бракуватиме '+(fare-remaining)+'. Дешевша дорога коштує 25.':'На вибраний виїзд залишиться '+fare+' купонів і ще '+(remaining-fare)+'.');
}
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
  $('log').textContent = localize(foods[i].name + ': +' + foodAmount(i) + ' сил.');
}
export function upgradeGear(kind) {
  if (busy() || !s.atCamp || !['detector', 'shovel', 'backpack'].includes(kind)) return;
  const key = kind === 'detector' ? 'level' : kind,
    cost = upgradeCost(kind);
  if (s[key] >= MAX_GEAR_LEVEL || s.coins < cost) return;
  s.coins -= cost;
  s.gearCredit[kind] = 0;
  s[key]++;
  save();
  render();
}
export function renderShop() {
  const key = JSON.stringify([s.level, s.shovel, s.backpack, s.atCamp, s.coins, s.energy, s.food, s.pantry, s.foodUsed, s.bag.length, s.gearCredit, s.route, s.collection.length, !!s.pending, layoutRevision()]);
  if (key === shopRenderKey) return;
  shopRenderKey = key;
  const fmt = n => Number(n.toFixed(1)).toLocaleString(dateLocale());
  const row = (name, current, next, unit = '') => `<div class="gear-stat"><span>${name}</span><strong>${current}${next === null ? '' : ' <span aria-label="після покращення">→</span> <em>' + next + '</em>'} ${unit}</strong></div>`;
  const nextDetector = Math.min(MAX_GEAR_LEVEL, s.level + 1), nextShovel = Math.min(MAX_GEAR_LEVEL, s.shovel + 1), nextBag = Math.min(MAX_GEAR_LEVEL, s.backpack + 1);
  const detector=detectorStats(),next=detectorStats(nextDetector);
  $('level').textContent = localize('Металошукач');
  $('detectorInfo').innerHTML = translateHTML(row('Бонус зони відгуку', '+'+fmt((detector.radius/.205-1)*100), s.level<MAX_GEAR_LEVEL?'+'+fmt((next.radius/.205-1)*100):null,'%') + row('Відгук глибокої цілі',fmt(detector.deepResponse*100),s.level<MAX_GEAR_LEVEL?fmt(next.deepResponse*100):null,'%') + row('Базова похибка індексу','±'+fmt(detector.noise),s.level<MAX_GEAR_LEVEL?'±'+fmt(next.noise):null));
  const look=detectorLook(s.level);
  $('detectorModelName').textContent=localize(look.name);
  $('detectorPreview').setAttribute('aria-label',localize(look.name+' · вигляд металошукача на ступені '+s.level));
  drawDetectorPreview($('detectorPreview'),s.level);
  $('detectorMilestones').innerHTML = translateHTML(detectorMilestones.map(([level,name,description]) => `<li class="${s.level >= level ? 'unlocked' : ''}"><span>${s.level >= level ? '✓' : level}</span><div><b>${name}</b><small>${description}</small></div></li>`).join(''));
  const upcoming=detectorMilestones.find(([level])=>level>s.level);
  $('detectorNextFeature').textContent=localize(upcoming?'Ступінь '+upcoming[0]+' відкриє: '+upcoming[1]+'.':'Усі функції відкрито. Режими можна перемикати на екрані пошуку.');
  $('shovelLevel').textContent = localize('Лопата');
  const saving = level => fmt((1 - shovelFactor(level)) * 100);
  $('shovelInfo').innerHTML = translateHTML(row('Економія енергії', saving(s.shovel), s.shovel < MAX_GEAR_LEVEL ? saving(nextShovel) : null, '%') + row('Ямка на 10 сил у звичайному ґрунті', fmt(Math.round(10 * shovelFactor() * 10) / 10), s.shovel < MAX_GEAR_LEVEL ? fmt(Math.round(10 * shovelFactor(nextShovel) * 10) / 10) : null));
  $('shovelNote').textContent = localize('Кожен ступінь зменшує витрати на всі глибини. Щільність ґрунту також впливає на копання.');
  $('backpackLevel').textContent = localize('Рюкзак');
  $('backpackInfo').innerHTML = translateHTML(row('Місткість', bagCapacity(), s.backpack < MAX_GEAR_LEVEL ? bagCapacity(nextBag) : null, 'місць'));
  $('backpackNote').textContent = localize((s.backpack === MAX_GEAR_LEVEL ? 'Максимальна місткість досягнута.' : 'Наступне покращення: +'+(bagCapacity(nextBag)-bagCapacity())+' місця для знахідок або їжі.')+' Великий рюкзак корисний для кількох ділянок за один виїзд.');
  for (const [kind, id, level] of [['detector', 'upgrade', s.level], ['shovel', 'upgradeShovel', s.shovel], ['backpack', 'upgradeBackpack', s.backpack]]) {
    const cost = upgradeCost(kind), credit=creditFor(s,kind);
    $(kind + 'Badge').textContent = localize('Ступінь ' + level + ' / '+MAX_GEAR_LEVEL);
    $(id).textContent = localize(level === MAX_GEAR_LEVEL ? 'Максимальний ступінь' : 'Покращити · ' + cost + ' купонів');
    $(id).disabled = !s.atCamp || level >= MAX_GEAR_LEVEL || s.coins < cost || !!s.pending;
    $(kind + 'Reason').textContent = localize((level === MAX_GEAR_LEVEL ? 'Усі покращення відкриті.' : !s.atCamp ? 'Покращення доступні в таборі.' : s.pending ? 'Спершу заверши розкопку.' : s.coins < cost ? 'Бракує ' + (cost - s.coins) + ' купонів' : 'Перехід на ступінь ' + (level + 1)) + (credit?' · Враховано '+credit+' купонів попередніх покращень.':''));
    if(level<MAX_GEAR_LEVEL&&s.coins>=cost)$(kind+'Reason').textContent+=localize(' '+purchaseBudgetNote(cost));
  }
  $('workshopStatus').textContent = localize(s.atCamp ? 'Твій бюджет: ' + s.coins + ' купонів. 10 ступенів: кожен змінює характеристики. Стрілка показує наступне покращення.' : 'Ти в полі. Характеристики можна переглядати, а покупки й покращення доступні в таборі.');
  $('foodBudget').textContent = localize('Покупка → домашні запаси → рюкзак. Кожна порція займає одне місце. За виїзд можна з’їсти до 50% від максимальної енергії.');
  $('foodShop').innerHTML = translateHTML(pageWindow('foodShopList',foods.map((f,i)=>({f,i})),{size:(window.innerWidth||360)>=960?3:1}).map(({f,i}) => `<article class="food-card"><div class="food-title"><h3>${f.name}</h3><strong>+${foodAmount(i)}<small> енергії</small></strong></div><p>${f.percent}% від максимуму · одноразова порція</p><div class="food-stock"><span>Вдома <b>${s.pantry[i]}</b></span><span>У рюкзаку <b>${s.food[i]}</b></span></div><div class="food-buttons"><button class="secondary" data-buy="${i}" ${!s.atCamp || s.coins < f.price || s.pending ? 'disabled' : ''}>Купити · ${f.price}</button><button class="secondary" data-packfood="${i}" ${!s.atCamp || !s.pantry[i] || bagUsed() >= bagCapacity() || s.pending ? 'disabled' : ''}>У рюкзак</button></div><small class="food-note">${!s.atCamp ? 'Магазин доступний у таборі.' : bagUsed() >= bagCapacity() ? 'Рюкзак повний. Покупка залишиться вдома.' : 'Ціна в купонах. Куплена порція з’явиться вдома.'}</small></article>`).join(''));
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

