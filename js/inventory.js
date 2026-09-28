import { isUkrainianCoin, coinMarkup, renderCoinThumbnails } from './graphics/ukrainian-coins.js?v=0.27.0';
// inventory responsibilities for Last Signal.
import { foods } from '../data/balance.js?v=0.27.0';
import { types } from '../data/items.js?v=0.27.0';
import { modal } from './dialogs.js?v=0.27.0';
import { $ } from './dom.js?v=0.27.0';
import { bagCapacity, bagUsed, foodAmount, foodFits, maxEnergy, priceFor } from './rules.js?v=0.27.0';
import { eatFood, transferFood } from './shop.js?v=0.27.0';
import { s, save } from './storage.js?v=0.27.0';
import { busy, render } from './ui.js?v=0.27.0';
export let inventoryRenderKey = '';
export function itemLabel(item) {
  return types[item.type].name + ' · ' + (types[item.type].variant || '') + ' · ' + item.condition + '% · ' + priceFor(item.type, item.condition) + ' купонів';
}
export function itemRows(list, place) {
  return list.map((item, i) => {
    const t = types[item.type], value = priceFor(item.type, item.condition);
    const best = s.best[item.type], canAlbum = t.kind !== 'trash' && (best === undefined || best < item.condition);
    const button = (action, label, disabled = false) => `<button class="secondary" data-itemaction="${action}" data-place="${place}" data-index="${i}" ${disabled ? 'disabled' : ''}>${label}</button>`;
    const albumLabel = t.kind === 'trash' ? 'Не для альбому' : best === undefined ? 'До альбому' : canAlbum ? 'Покращити альбом' : 'В альбомі кращий або такий';
    return `<article class="find-card"><div class="find-heading">${isUkrainianCoin(t) ? coinMarkup(item.type, item.condition) : `<span class="item-symbol" aria-hidden="true">${t.icon}</span>`}<div><h3>${t.name}</h3>${t.variant ? `<p class="find-variant">${t.variant}</p>` : ''}<small>${t.kind === 'trash' ? 'Металобрухт' : canAlbum ? (best === undefined ? 'Нова позиція для альбому' : 'Кращий стан для альбому') : 'Є в альбомі'}</small></div></div><div class="find-metrics"><div><span>СТАН</span><strong>${item.condition}<small> / 100</small></strong><progress aria-label="Стан предмета" value="${item.condition}" max="100"></progress></div><div><span>ОЦІНКА</span><strong>${value}<small> купонів</small></strong></div></div><div class="find-actions">${s.atCamp ? button('album', albumLabel, !canAlbum) + button('move', place === 'bag' ? 'До сховища' : 'У рюкзак', place === 'stash' && bagUsed() >= bagCapacity()) + button('sell', 'Продати · ' + value) : button('discard', 'Викинути')}</div></article>`;
  }).join('') || `<div class="empty-state"><b>${place === 'bag' ? 'Місце для нових знахідок' : 'Сховище порожнє'}</b><p>${place === 'bag' ? 'Знахідки з виїзду з’являться тут. Їжа також займає місця в рюкзаку.' : 'Залишай тут предмети, які хочеш зберегти для наступних рішень.'}</p></div>`;
}
export function renderInventory() {
  const key = JSON.stringify([s.backpack, s.atCamp, s.energy, s.level, s.coins, s.bag, s.stash, s.food, s.pantry, s.best, s.lastTrip, !!s.pending]);
  if (key === inventoryRenderKey) return;
  inventoryRenderKey = key;
  $('bagStatus').textContent = bagUsed() + ' / ' + bagCapacity() + ' місць · рівень ' + s.backpack;
  $('bagCapacity').value = bagUsed();
  $('bagCapacity').max = bagCapacity();
  $('unload').disabled = !s.bag.length && !s.food.some(Boolean);
  $('bagItems').innerHTML = itemRows(s.bag, 'bag');
  $('warehousePanel').hidden = !s.atCamp;
  $('warehouseItems').innerHTML = s.atCamp ? itemRows(s.stash, 'stash') : '';
  renderCoinThumbnails();
  $('bagFood').innerHTML = foods.map((f, i) => '<div class="card">' + f.name + ' × ' + s.food[i] + ' <button class="secondary" data-foodaction="' + (s.atCamp ? 'unpack' : 'eat') + '" data-index="' + i + '" ' + (!s.food[i] || !s.atCamp && !foodFits(i) ? 'disabled' : '') + '>' + (s.atCamp ? 'До сховища' : 'З’їсти · +' + foodAmount(i)) + '</button>' + (!s.atCamp ? ' <button class="quiet" data-foodaction="discard" data-index="' + i + '" ' + (!s.food[i] ? 'disabled' : '') + '>Викинути</button>' : '') + '</div>').join('');
  $('pantryItems').innerHTML = foods.map((f, i) => '<div class="card">' + f.name + ' × ' + s.pantry[i] + ' <button class="secondary" data-foodaction="pack" data-index="' + i + '" ' + (!s.pantry[i] || bagUsed() >= bagCapacity() ? 'disabled' : '') + '>У рюкзак</button></div>').join('');

}
export function inventoryAction(action, place, i) {
  if (busy() || !['bag', 'stash'].includes(place)) return;
  const list = s[place],
    item = list[i];
  if (!item) return;
  if (action === 'discard' && !s.atCamp && place === 'bag') {
    modal('ВИКИНУТИ?', '🎒', types[item.type].name, 'Цю знахідку буде втрачено.', 'Викинути', () => {
      if (s.bag[i] !== item) return;
      s.bag.splice(i, 1);
      save();
      render();
    });
    return;
  }
  if (!s.atCamp) return;
  if (action === 'sell') {
    s.coins += priceFor(item.type, item.condition);
    list.splice(i, 1);
  } else if (action === 'album') {
    if (types[item.type].kind === 'trash' || s.best[item.type] >= item.condition) return;
    const old = s.best[item.type];
    list.splice(i, 1);
    if (Number.isFinite(old)) s.stash.push({
      type: item.type,
      condition: old
    });else s.collection.push(item.type);
    s.best[item.type] = item.condition;
  } else if (action === 'move') {
    if (place === 'stash' && bagUsed() >= bagCapacity()) return;
    list.splice(i, 1);
    s[place === 'bag' ? 'stash' : 'bag'].push(item);
  } else return;
  save();
  render();
}
export function initInventory() {
  $('inventory').addEventListener('click', e => {
    const b = e.target.closest('[data-itemaction]'),
      f = e.target.closest('[data-foodaction]');
    if (b) inventoryAction(b.dataset.itemaction, b.dataset.place, Number(b.dataset.index));
    if (f) {
      const i = Number(f.dataset.index),
        act = f.dataset.foodaction;
      if (act === 'pack' || act === 'unpack') transferFood(i, act === 'pack');else if (act === 'eat') eatFood(i);else if (act === 'discard' && !busy() && s.food[i] > 0) modal('ВИКИНУТИ ЇЖУ?', '🎒', foods[i].name, 'Продукт буде втрачено.', 'Викинути', () => {
        if (s.food[i] > 0) s.food[i]--;
        save();
        render();
      });
    }
  });
  $('unload').onclick = () => {
    if (!s.atCamp || busy()) return;
    s.stash.push(...s.bag);
    s.bag = [];
    for (let i = 0; i < 3; i++) {
      s.pantry[i] += s.food[i];
      s.food[i] = 0;
    }
    save();
    render();
  };
}
