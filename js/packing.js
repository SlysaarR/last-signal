// Revealed-find card and the take/swap/leave decision.
import { foods, rarities } from '../data/balance.js?v=0.15.0';
import { types } from '../data/items.js?v=0.15.0';
import { $ } from './dom.js?v=0.15.0';
import { drawArtifact } from './graphics/artifacts.js?v=0.15.0';
import { itemLabel } from './inventory.js?v=0.15.0';
import { bagCapacity, bagUsed, conditionLabel, priceFor } from './rules.js?v=0.15.0';
import { s, save } from './storage.js?v=0.15.0';
import { render } from './ui.js?v=0.15.0';
export function openPacking() {
  if (!s.pending) return;
  const item = s.pending,
    t = types[item.type],
    r = rarities[t.rarity];
  $('packTitle').textContent = t.name;
  $('packDescription').textContent = t.country ? (t.variant || 'Обігова монета') + ' · ' + t.country : t.kind === 'trash' ? 'Польова знахідка · металеве сміття' : t.kind === 'jewel' ? 'Польова знахідка · прикраса' : 'Польова знахідка · предмет';
  $('packRarity').textContent = r.name;
  $('packRarity').style.color = r.color;
  $('packCondition').textContent = item.condition + '%';
  $('packConditionLabel').textContent = conditionLabel(item.condition);
  $('packValue').textContent = priceFor(item.type, item.condition);
  $('packCapacity').textContent = 'Рюкзак ' + bagUsed() + ' / ' + bagCapacity() + ' · витрачено ' + (item.spent || 0) + ' енергії';
  $('packArt').setAttribute('aria-label', t.name + ', стан ' + item.condition + ' відсотків');
  drawArtifact(item.type, $('packArt').getContext('2d'), item.condition, true);
  $('packChoices').innerHTML = bagUsed() < bagCapacity() ? '<button class="primary" data-pack="take">Забрати в рюкзак</button>' : '<p>Рюкзак повний. Залиш знахідку або заміни один предмет:</p>' + s.bag.map((it, i) => '<button class="secondary" style="width:100%;margin:4px 0" data-pack="swap" data-index="' + i + '">Замінити: ' + itemLabel(it) + '</button>').join('') + foods.map((f, i) => s.food[i] ? '<button class="secondary" style="width:100%;margin:4px 0" data-pack="food" data-index="' + i + '">Викинути 1 × ' + f.name + ' і забрати знахідку</button>' : '').join('');
  if (!$('packDialog').open) $('packDialog').showModal();
}
export function resolvePacking(action, index) {
  if (!s.pending || !s.pending.revealed) return;
  const item = {
    type: s.pending.type,
    condition: s.pending.condition
  };
  if (action === 'take') {
    if (bagUsed() >= bagCapacity()) return;
    s.bag.push(item);
  } else if (action === 'swap') {
    if (!s.bag[index]) return;
    s.bag[index] = item;
  } else if (action === 'food') {
    if (!foods[index] || !s.food[index] || bagUsed() > bagCapacity()) return;
    s.food[index]--;
    s.bag.push(item);
  } else if (action !== 'leave') return;
  s.pending = null;
  s.found++;
  save();
  $('packDialog').close();
  render();
  $('log').textContent = action === 'leave' ? 'Знахідку залишено на ділянці.' : types[item.type].name + ' у рюкзаку. Продати чи додати в альбом можна вдома.';
}
export function initPacking() {
  $('packChoices').addEventListener('click', e => {
    const b = e.target.closest('[data-pack]');
    if (b) resolvePacking(b.dataset.pack, Number(b.dataset.index));
  });
  $('leaveFind').onclick = () => resolvePacking('leave');
  $('packDialog').addEventListener('cancel', e => e.preventDefault());
}
