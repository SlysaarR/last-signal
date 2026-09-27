// collection responsibilities for Last Signal.
import { rarities } from '../data/balance.js';
import { collectible, types } from '../data/items.js';
import { $ } from './dom.js';
import { priceFor } from './rules.js';
import { s } from './storage.js';
export let collectionCategory = 'coin',
  denomFilter = 'all',
  yearFilter = 'all',
  missingOnly = false,
  collectionRenderKey = '';
export const yearKey = t => t.denom + '|' + t.year;
export function categoryItems() {
  const all = types.map((t, id) => ({
    ...t,
    id
  }));
  if (collectionCategory === 'legacy') return all.filter(t => t.legacy && s.collection.includes(t.id));
  return all.filter(t => !t.legacy && t.kind === collectionCategory && (collectionCategory !== 'coin' || (denomFilter === 'all' || t.denom === denomFilter) && (yearFilter === 'all' || t.year === Number(yearFilter)) && (!missingOnly || !s.collection.includes(t.id)))).sort((a, b) => collectionCategory === 'coin' ? denominations.indexOf(a.denom) - denominations.indexOf(b.denom) || a.year - b.year || a.id - b.id : a.id - b.id);
}
export function renderCollection() {
  const key = JSON.stringify([collectionCategory, denomFilter, yearFilter, missingOnly, s.collection, s.best]);
  if (key === collectionRenderKey) return;
  collectionRenderKey = key;
  const owned = new Set(s.collection),
    found = collectible.filter(t => owned.has(t.id)).length;
  $('collectionCount').textContent = found + ' / ' + collectible.length + ' позицій у колекції';
  $('archiveTab').hidden = !s.collection.some(id => types[id]?.legacy);
  $('coinFilters').hidden = collectionCategory !== 'coin';
  document.querySelectorAll('[data-category]').forEach(b => {
    b.classList.toggle('active', b.dataset.category === collectionCategory);
    b.setAttribute('aria-pressed', String(b.dataset.category === collectionCategory));
  });
  const coins = collectible.filter(t => t.kind === 'coin'),
    yearTotal = new Set(coins.map(yearKey)),
    yearFound = new Set(coins.filter(t => owned.has(t.id)).map(yearKey));
  $('albumProgress').innerHTML = denominations.filter(d => denomFilter === 'all' || d === denomFilter).map(d => {
    const total = new Set(coins.filter(t => t.denom === d).map(yearKey)).size,
      done = new Set(coins.filter(t => t.denom === d && owned.has(t.id)).map(yearKey)).size;
    return '<div class="album-row"><b>' + d + '</b><progress aria-label="Роки: ' + d + '" value="' + done + '" max="' + total + '"></progress><small>' + done + ' / ' + total + (done === total ? ' ✓' : '') + '</small></div>';
  }).join('');
  const list = categoryItems();
  $('categoryCount').textContent = collectionCategory === 'coin' ? 'Альбом: ' + yearFound.size + ' / ' + yearTotal.size + ' років за номіналами · Показано ' + list.length + ' позицій' : 'Знайдено: ' + list.filter(t => owned.has(t.id)).length + ' / ' + list.length;
  $('catalogNote').textContent = collectionCategory === 'coin' ? 'Кожен номінал і рік — окрема ціль. Будь-який знайдений різновид зараховує рік; різновиди зберігаються окремо. Натисни монету, щоб відкрити джерело. Ігрові ціни, стан і шанси умовні; малюнки схематичні.' : collectionCategory === 'legacy' ? 'Тут збережено умовні монети з ранніх версій.' : 'У колекції залишається найкращий стан кожного виду.';
  let previous = '';
  $('items').innerHTML = list.map(t => {
    const has = owned.has(t.id),
      r = rarities[t.rarity];
    let heading = '';
    if (t.country && previous !== t.denom) {
      previous = t.denom;
      heading = '<h3 class="album-heading">' + t.denom + '</h3>';
    }
    return heading + '<button class="collect ' + (has ? '' : 'unfound') + '" data-item="' + t.id + '"><span>' + (has ? t.icon : '○') + '</span><b>' + t.name + '</b>' + (t.variant ? '<small>' + t.variant + '</small>' : '') + (t.issue === 'set' ? '<small>✦ Для колекційних наборів</small>' : '') + '<small style="color:' + r.color + '">' + r.name + ' · у грі</small><small>' + (has ? 'Стан ' + s.best[t.id] + '% · ' + priceFor(t.id, s.best[t.id]) + ' купонів' : 'Ще не знайдено') + '</small></button>';
  }).join('') || '<p class="sub">За цими фільтрами позицій немає.</p>';
}
export function showItem(id) {
  const t = types[id];
  if (!t || t.kind === 'trash') return;
  const found = s.collection.includes(id);
  $('detailTitle').textContent = t.name;
  const lines = [];
  if (t.country) lines.push(t.country + ' · ' + t.denom + ' · ' + t.year + ' р.', 'Різновид: ' + t.variant, t.note);else if (t.legacy) lines.push('Умовна монета раннього прототипу. Збережена як твоя попередня знахідка.');
  lines.push('Ігрова рідкість: ' + rarities[t.rarity].name, found ? 'Найкращий стан: ' + s.best[id] + '/100. Ігрова оцінка: ' + priceFor(id, s.best[id]) + ' купонів.' : 'Цю позицію ще треба знайти.');
  if (t.source) lines.push('Шкала 0–100 — ігровий стан, не нумізматичний грейд. Ціна не є ринковою оцінкою в гривнях. Схематичний малюнок не відтворює всі деталі штемпеля.', 'Джерело: ' + (t.source.includes('ucoin.net') ? 'uCoin' : t.source.includes('bank.gov.ua') ? 'НБУ' : 'Монети-Ягідки') + '. Перевірено 20.09.2026.');
  $('detailText').textContent = lines.join('\n\n');
  $('detailSource').hidden = !t.source;
  if (t.source) $('detailSource').href = t.source;
  $('coinDetail').showModal();
}
export const denominations = [...new Set(collectible.filter(t => t.kind === 'coin').map(t => t.denom))];
export function updateYearFilter() {
  const years = [...new Set(collectible.filter(t => t.country && (denomFilter === 'all' || t.denom === denomFilter)).map(t => t.year))].sort((a, b) => a - b);
  if (yearFilter !== 'all' && !years.includes(Number(yearFilter))) yearFilter = 'all';
  $('yearFilter').innerHTML = '<option value="all">Усі роки</option>' + years.map(y => '<option value="' + y + '">' + y + '</option>').join('');
  $('yearFilter').value = yearFilter;
}
export function initCollection() {
  $('denomFilter').innerHTML = '<option value="all">Усі номінали</option>' + denominations.map(d => '<option value="' + d + '">' + d + '</option>').join('');
  updateYearFilter();
  $('denomFilter').onchange = e => {
    denomFilter = e.target.value;
    updateYearFilter();
    renderCollection();
  };
  $('yearFilter').onchange = e => {
    yearFilter = e.target.value;
    renderCollection();
  };
  $('missingFilter').onchange = e => {
    missingOnly = e.target.checked;
    renderCollection();
  };
  document.querySelectorAll('[data-category]').forEach(b => b.onclick = () => {
    collectionCategory = b.dataset.category;
    renderCollection();
  });
  $('items').addEventListener('click', e => {
    const b = e.target.closest('[data-item]');
    if (b) showItem(Number(b.dataset.item));
  });
  $('detailClose').onclick = () => $('coinDetail').close();
}
