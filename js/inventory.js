// inventory responsibilities for Last Signal.
import { foods } from '../data/balance.js';
import { types } from '../data/items.js';
import { modal } from './dialogs.js';
import { $ } from './dom.js';
import { bagCapacity, bagUsed, foodAmount, foodFits, maxEnergy, priceFor } from './rules.js';
import { eatFood, transferFood } from './shop.js';
import { s, save } from './storage.js';
import { busy, render } from './ui.js';
export let inventoryRenderKey = '';
export function itemLabel(item) {
  return types[item.type].name + ' · ' + (types[item.type].variant || '') + ' · ' + item.condition + '% · ' + priceFor(item.type, item.condition) + ' купонів';
}
export function itemRows(list, place) {
  return list.map((item, i) => '<div class="card"><b>' + itemLabel(item) + '</b><p>' + (s.atCamp ? '<button class="secondary" data-itemaction="sell" data-place="' + place + '" data-index="' + i + '">Продати</button> <button class="secondary" data-itemaction="album" data-place="' + place + '" data-index="' + i + '" ' + (types[item.type].kind === 'trash' || s.best[item.type] !== undefined && s.best[item.type] >= item.condition ? 'disabled' : '') + '>До альбому</button> <button class="secondary" data-itemaction="move" data-place="' + place + '" data-index="' + i + '" ' + (place === 'stash' && bagUsed() >= bagCapacity() ? 'disabled' : '') + '>' + (place === 'bag' ? 'До сховища' : 'У рюкзак') + '</button>' : '<button class="secondary" data-itemaction="discard" data-place="bag" data-index="' + i + '">Викинути</button>') + '</p></div>').join('') || '<p class="sub">Порожньо.</p>';
}
export function renderInventory() {
  const key = JSON.stringify([s.backpack, s.atCamp, s.energy, s.level, s.coins, s.bag, s.stash, s.food, s.pantry, s.best, s.lastTrip, !!s.pending]);
  if (key === inventoryRenderKey) return;
  inventoryRenderKey = key;
  $('bagStatus').textContent = bagUsed() + ' / ' + bagCapacity() + ' місць · рівень ' + s.backpack;
  $('bagItems').innerHTML = itemRows(s.bag, 'bag');
  $('warehousePanel').hidden = !s.atCamp;
  $('warehouseItems').innerHTML = s.atCamp ? itemRows(s.stash, 'stash') : '';
  $('bagFood').innerHTML = foods.map((f, i) => '<div class="card">' + f.name + ' × ' + s.food[i] + ' <button class="secondary" data-foodaction="' + (s.atCamp ? 'unpack' : 'eat') + '" data-index="' + i + '" ' + (!s.food[i] || !s.atCamp && !foodFits(i) ? 'disabled' : '') + '>' + (s.atCamp ? 'До сховища' : 'З’їсти · +' + foodAmount(i)) + '</button>' + (!s.atCamp ? ' <button class="quiet" data-foodaction="discard" data-index="' + i + '" ' + (!s.food[i] ? 'disabled' : '') + '>Викинути</button>' : '') + '</div>').join('');
  $('pantryItems').innerHTML = foods.map((f, i) => '<div class="card">' + f.name + ' × ' + s.pantry[i] + ' <button class="secondary" data-foodaction="pack" data-index="' + i + '" ' + (!s.pantry[i] || bagUsed() >= bagCapacity() ? 'disabled' : '') + '>У рюкзак</button></div>').join('');
  $('campStatus').textContent = s.atCamp ? 'Вдома · ' + s.energy + ' / ' + maxEnergy() + ' сил' : 'Ти в полі. Повернися до табору, щоб відпочити та скористатися магазином.';
  $('restHome').disabled = !s.atCamp || s.energy === maxEnergy();
  $('startTrip').disabled = !s.atCamp || !!s.pending;
  $('startTrip').textContent = s.coins < 25 ? 'Безкоштовно на бідне узбіччя' : 'Вирушити · 25 купонів';
  if (s.lastTrip) $('tripSummary').textContent = 'Знайдено: ' + s.lastTrip.found + '. Принесено: ' + s.lastTrip.brought + ' предметів. Оцінка принесеного: ' + s.lastTrip.value + ' купонів (ще не продано). Дорога: ' + s.lastTrip.travel + '; з’їдена їжа: ' + s.lastTrip.food + ' купонів.';
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
