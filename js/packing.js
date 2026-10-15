import { t as localize, translateHTML } from './i18n.js?v=0.54.1';
import { advanceGuide } from '../data/guide.js?v=0.54.1';
import { recordFind } from './progression.js?v=0.54.1';
import { recordCareerFind } from './career.js?v=0.54.1';
import { orderReady } from './orders.js?v=0.54.1';
import { setupInspection, clearInspection } from './coin-flip.js?v=0.54.1';
// Revealed-find card and the take/swap/leave decision.
import { foods, rarities } from '../data/balance.js?v=0.54.1';
import { types } from '../data/items.js?v=0.54.1';
import { $ } from './dom.js?v=0.54.1';
import { itemLabel } from './inventory.js?v=0.54.1';
import { bagCapacity, bagUsed, conditionLabel, priceFor } from './rules.js?v=0.54.1';
import { s, save } from './storage.js?v=0.54.1';
import { render } from './ui.js?v=0.54.1';
export function openPacking() {
  if (!s.pending) return;
  const item = s.pending,
    t = types[item.type],
    r = rarities[t.rarity];
  $('packTitle').textContent = localize(t.name);
  $('packDescription').textContent = localize(t.country ? (t.variant || 'Обігова монета') + ' · ' + t.country : t.kind === 'trash' ? 'Польова знахідка · металеве сміття' : t.kind === 'jewel' ? 'Польова знахідка · прикраса' : 'Польова знахідка · предмет');
  if(t.findDescription)$('packDescription').textContent=localize(t.findDescription);
  $('packRarity').textContent = localize(r.name);
  $('packRarity').style.color = r.color;
  $('packCondition').textContent = localize(item.condition + '%');
  $('packConditionLabel').textContent = localize(conditionLabel(item.condition));
  $('packValue').textContent = localize(priceFor(item.type, item.condition));
  $('packCapacity').textContent = localize('Рюкзак ' + bagUsed() + ' / ' + bagCapacity());
  $('packCapacity').title=localize('Витрачено енергії: '+(item.spent||0));
  $('packArt').setAttribute('aria-label', localize(t.name + ', стан ' + item.condition + ' відсотків'));
  setupInspection($('packArt'), $('packFlip'), item.type, item.condition);
  const full=bagUsed()>=bagCapacity();
  $('packReplacementField').hidden=!full;
  $('packTake').hidden=full;$('packSwap').hidden=!full;$('packSwap').disabled=true;
  $('packReplacement').innerHTML=full?translateHTML('<option value="">Обери предмет для заміни</option>'+s.bag.map((it,i)=>'<option value="swap:'+i+'">'+itemLabel(it)+'</option>').join('')+foods.map((f,i)=>s.food[i]?'<option value="food:'+i+'">1 × '+f.name+'</option>':'').join('')):'';
  $('packReplacement').value='';
  $('packBody').scrollTop=0;

  $('packBody').querySelector('.inspection-options').open=false;
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
  const orderAdvanced=recordFind(item, action !== 'leave');
  if (action !== 'leave') advanceGuide(s, 'keep');
  recordCareerFind(s.pending,action !== 'leave');
  s.pending = null;
  s.found = (s.found || 0) + 1;
  save();
  $('packDialog').close();
  render();
  $('log').textContent = localize(action === 'leave' ? 'Знахідку залишено. Повторно забрати її не можна.' : types[item.type].name + ' у рюкзаку. Продати чи додати в альбом можна вдома.');
  if(orderAdvanced)$('log').textContent=localize((orderReady()?'Замовлення виконано — нагорода чекає в таборі. ':'+1 до польового замовлення. ')+$('log').textContent);
}
function replacementChoice() {
  const match=/^(swap|food):(\d+)$/.exec($('packReplacement').value);
  if(!match)return null;
  const action=match[1],index=Number(match[2]);
  if(!Number.isSafeInteger(index)||!(action==='swap'?s.bag[index]:foods[index]&&s.food[index]>0))return null;
  return {action,index};
}
export function initPacking() {
  $('packDialog').addEventListener('close',()=>clearInspection($('packArt')));
  $('packReplacement').onchange=()=>{ $('packSwap').disabled=!replacementChoice(); };
  $('packChoices').addEventListener('click', e => {
    const b = e.target.closest('[data-pack]');
    if (!b) return;
    if (b.dataset.pack==='replace') {
      const choice=replacementChoice();if(choice)resolvePacking(choice.action,choice.index);
    } else if (b.dataset.pack==='take') resolvePacking('take');
  });
  $('leaveFind').onclick = () => resolvePacking('leave');
  $('packDialog').addEventListener('cancel', e => e.preventDefault());
}

