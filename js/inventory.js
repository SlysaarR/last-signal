import { artifactMarkup, renderArtifactThumbnails } from './graphics/thumbnails.js?v=0.47.0';
import { isUkrainianCoin, coinMarkup, renderCoinThumbnails } from './graphics/ukrainian-coins.js?v=0.47.0';
// inventory responsibilities for Last Signal.
import { foods } from '../data/balance.js?v=0.47.0';
import { types } from '../data/items.js?v=0.47.0';
import { modal } from './dialogs.js?v=0.47.0';
import { $ } from './dom.js?v=0.47.0';
import { bagCapacity, bagUsed, foodAmount, foodFits, maxEnergy, priceFor } from './rules.js?v=0.47.0';
import { eatFood, transferFood } from './shop.js?v=0.47.0';
import { s, save } from './storage.js?v=0.47.0';
import { inventoryEntries, inventorySummary, sortedInventory, bulkPlan, samePlan } from './inventory-plan.js?v=0.47.0';
import { busy, render } from './ui.js?v=0.47.0';
export let inventoryRenderKey = '';
export const INVENTORY_PAGE_SIZE=24,REVIEW_PAGE_SIZE=40;
let returnedItem = null, review = null;
export const inventoryView={sort:'album',filter:'all',bagPage:0,stashPage:0};
function pageControls(prefix,page,total,size) {
  const pages=Math.max(1,Math.ceil(total/size));
  $(prefix+'Pager').hidden=total<=size;
  $(prefix+'Page').textContent=`Сторінка ${page+1} / ${pages}`;
  $(prefix+'Prev').disabled=page===0;$(prefix+'Next').disabled=page>=pages-1;
}
function clampPage(page,total,size){return Math.max(0,Math.min(page,Math.max(0,Math.ceil(total/size)-1)));}
function resetPages(){inventoryView.bagPage=0;inventoryView.stashPage=0;}
function albumNotice(text, returned = null) {
  returnedItem = returned;
  $('inventoryNoticeText').textContent = text;
  $('inventoryNotice').hidden = !text;
  $('showReturnedItem').hidden = !returned;
}
export function itemLabel(item) {
  return [types[item.type].name, types[item.type].variant, item.condition + '%', priceFor(item.type, item.condition) + ' купонів'].filter(Boolean).join(' · ');
}
export function itemRows(list, place, entries=inventoryEntries(list===s[place]?s:{...s,[place]:list}),pageEntries=null) {
  const sorted=pageEntries||sortedInventory(entries.filter(e=>e.place===place),inventoryView.sort,inventoryView.filter).slice(inventoryView[place+'Page']*INVENTORY_PAGE_SIZE,(inventoryView[place+'Page']+1)*INVENTORY_PAGE_SIZE);
  return sorted.map(entry => {
    const {item,index:i,value,old:best,status,keeper}=entry,t=types[item.type];
    const canAlbum=status==='new'||status==='upgrade';
    const button = (action, label, disabled = false) => `<button class="secondary" data-itemaction="${action}" data-place="${place}" data-index="${i}" ${disabled ? 'disabled' : ''}>${label}</button>`;
    const albumLabel = best === undefined ? 'До альбому' : `Покращити альбом · ${best} → ${item.condition}%`;
    const statusLabel={new:'Нове для альбому',upgrade:'Кращий екземпляр',duplicate:'Дублікат',scrap:'Металобрухт'}[status];
    const note=status==='duplicate'?(best>=item.condition?`В альбомі вже є ${best}%`:`Для альбому залишено ${keeper.condition}% · ${keeper.place==='bag'?'у рюкзаку':'у сховищі'}`):status==='upgrade'?`Альбом: ${best}% → ${item.condition}%`:status==='new'?'Найкраща наявна копія нової позиції':'';
    return `<article class="find-card" data-item-place="${place}" data-item-index="${i}"><div class="find-heading">${isUkrainianCoin(t) ? coinMarkup(item.type, item.condition) : artifactMarkup(item.type, item.condition)}<div><h3>${t.name}</h3>${t.variant ? `<p class="find-variant">${t.variant}</p>` : ''}<span class="item-status ${status}">${statusLabel}</span>${note?`<small class="item-status-note">${note}</small>`:''}</div></div><div class="find-metrics"><div><span>СТАН</span><strong>${item.condition}<small> / 100</small></strong><progress aria-label="Стан предмета" value="${item.condition}" max="100"></progress></div><div><span>ОЦІНКА</span><strong>${value}<small> купонів</small></strong></div></div>${s.atCamp && canAlbum && Number.isFinite(best) ? `<p class="album-return-hint">Попередній екземпляр ${best}% → у сховище</p>` : ''}<div class="find-actions">${s.atCamp ? (canAlbum ? button('album', albumLabel) : '') + button('move', place === 'bag' ? 'До сховища' : 'У рюкзак', place === 'stash' && bagUsed() >= bagCapacity()) + button('sell', 'Продати · ' + value) : button('discard', 'Викинути')}</div></article>`;
  }).join('') || (list.length?'<div class="empty-state"><b>За цим фільтром знахідок немає</b><p>Обери «Усі знахідки», щоб побачити решту.</p></div>':`<div class="empty-state"><b>${place === 'bag' ? 'Місце для нових знахідок' : 'Сховище порожнє'}</b><p>${place === 'bag' ? 'Знахідки з виїзду з’являться тут. Їжа також займає місця в рюкзаку.' : 'Залишай тут предмети, які хочеш зберегти для наступних рішень.'}</p></div>`);
}
export function renderInventory() {
  const key = JSON.stringify([s.backpack, s.atCamp, s.energy, s.level, s.coins, s.bag, s.stash, s.food, s.pantry, s.best, s.lastTrip, !!s.pending, inventoryView]);
  if (key === inventoryRenderKey) return;
  inventoryRenderKey = key;
  $('bagStatus').textContent = bagUsed() + ' / ' + bagCapacity() + ' місць · ступінь ' + s.backpack;
  $('bagCapacity').value = bagUsed();
  $('bagCapacity').max = bagCapacity();
  $('unload').disabled = !s.bag.length && !s.food.some(Boolean);
  const entries=inventoryEntries(),counts=inventorySummary(entries);
  $('inventorySort').value=inventoryView.sort;$('inventoryFilter').value=inventoryView.filter;
  $('inventoryFilterReset').hidden=inventoryView.filter==='all';
  $('inventoryReviewActions').hidden=!s.atCamp;
  $('inventoryFieldNote').hidden=s.atCamp;
  $('inventorySummary').textContent=`Для альбому: ${counts.new} нових · ${counts.upgrade} покращень. Дублікати: ${counts.duplicate} · металобрухт: ${counts.scrap}.`;
  $('reviewAlbum').textContent='Кращі до альбому · '+(counts.new+counts.upgrade);
  $('reviewAlbum').disabled=!counts.new&&!counts.upgrade||!!s.pending;
  $('reviewSale').disabled=!counts.duplicate&&!counts.scrap||!!s.pending;
  for(const place of ['bag','stash']) {
    const all=entries.filter(e=>e.place===place),filtered=sortedInventory(all,inventoryView.sort,inventoryView.filter),total=filtered.length;
    const page=inventoryView[place+'Page']=clampPage(inventoryView[place+'Page'],total,INVENTORY_PAGE_SIZE),start=page*INVENTORY_PAGE_SIZE;
    const visible=filtered.slice(start,start+INVENTORY_PAGE_SIZE);
    $(place==='bag'?'bagShown':'stashShown').textContent=total?`Показано ${start+1}–${start+visible.length} / ${total} за фільтром · усього ${all.length}`:`Показано 0 / ${all.length} знахідок`;
    pageControls(place,page,total,INVENTORY_PAGE_SIZE);
    $(place==='bag'?'bagItems':'warehouseItems').innerHTML=place==='stash'&&!s.atCamp?'':itemRows(s[place],place,entries,visible);
  }
  $('warehousePanel').hidden = !s.atCamp;
  renderCoinThumbnails();renderArtifactThumbnails();
  $('bagFood').innerHTML = foods.flatMap((f, i) => s.food[i] ? '<div class="card">' + f.name + ' × ' + s.food[i] + ' <button class="secondary" data-foodaction="' + (s.atCamp ? 'unpack' : 'eat') + '" data-index="' + i + '" ' + (!s.food[i] || !s.atCamp && !foodFits(i) ? 'disabled' : '') + '>' + (s.atCamp ? 'До сховища' : 'З’їсти · +' + foodAmount(i)) + '</button>' + (!s.atCamp ? ' <button class="quiet" data-foodaction="discard" data-index="' + i + '" ' + (!s.food[i] ? 'disabled' : '') + '>Викинути</button>' : '') + '</div>' : []).join('') || '<p class="camp-note">Їжі в рюкзаку немає.</p>';
  $('pantryItems').innerHTML = foods.flatMap((f, i) => s.pantry[i] ? '<div class="card">' + f.name + ' × ' + s.pantry[i] + ' <button class="secondary" data-foodaction="pack" data-index="' + i + '" ' + (!s.pantry[i] || bagUsed() >= bagCapacity() ? 'disabled' : '') + '>У рюкзак</button></div>' : []).join('') || '<p class="camp-note">Домашні запаси порожні. Провізію можна купити в майстерні.</p>';

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
  albumNotice('');
  if (action === 'sell') {
    const entry=inventoryEntries().find(e=>e.place===place&&e.index===i);
    const sell=()=>{
      if(!s.atCamp||busy()||s[place][i]!==item||item.type!==entry.type||item.condition!==entry.condition)return;
      s.coins+=entry.value;s[place].splice(i,1);
      albumNotice(`Продано: ${types[item.type].name} · ${item.condition}%. Отримано ${entry.value} купонів.`);
      save();render();$('inventoryNotice').scrollIntoView?.({block:'nearest'});
    };
    if(entry.status==='new'||entry.status==='upgrade')modal('ПОТРІБНО ДЛЯ АЛЬБОМУ', '○', types[item.type].name, `Це найкраща наявна копія ${item.condition}%, яка ${entry.old===undefined?'ще не додана до альбому':'покращує альбом зі стану '+entry.old+'%'}. Продати її за ${entry.value} купонів?`, 'Усе одно продати', sell);
    else sell();
    return;
  } else if (action === 'album') {
    if (types[item.type].kind === 'trash' || s.best[item.type] >= item.condition) return;
    const old = s.best[item.type];
    list.splice(i, 1);
    if (Number.isFinite(old)) {
      const returned = {type: item.type, condition: old};
      s.stash.unshift(returned);
      albumNotice(`${types[item.type].name}: в альбомі тепер ${item.condition}%. Попередній екземпляр зі станом ${old}% збережено в домашньому сховищі.`, returned);
    } else {
      s.collection.push(item.type);
      albumNotice(`${types[item.type].name} · ${item.condition}% — додано до альбому.`);
    }
    s.best[item.type] = item.condition;
  } else if (action === 'move') {
    if (place === 'stash' && bagUsed() >= bagCapacity()) return;
    list.splice(i, 1);
    s[place === 'bag' ? 'stash' : 'bag'].push(item);
  } else return;
  save();
  render();
  if (action === 'album') $('inventoryNotice').scrollIntoView?.({block:'nearest', behavior:'smooth'});
}
function renderReviewTotal() {
  if(!review)return;
  const selected=review.entries.filter(e=>review.selected.has(e.key)),total=selected.reduce((sum,e)=>sum+e.value,0);
  $('reviewTotal').textContent=review.mode==='sale'?`До продажу: ${selected.length} · разом ${total} купонів`:`До альбому: ${selected.length} · попередніх екземплярів у сховище: ${selected.filter(e=>e.old!==undefined).length}`;
  $('reviewConfirm').textContent=review.mode==='sale'?`Продати · ${total} купонів`:`Додати до альбому · ${selected.length}`;
  $('reviewConfirm').disabled=!selected.length;
  $('reviewSelectAll').disabled=!review.entries.length;
  $('reviewSelectAll').textContent=review.selected.size===review.entries.length?'Зняти весь вибір':'Вибрати всі · '+review.entries.length;
}
function renderReviewList() {
  if(!review)return;
  review.page=clampPage(review.page,review.entries.length,REVIEW_PAGE_SIZE);
  pageControls('review',review.page,review.entries.length,REVIEW_PAGE_SIZE);
  $('reviewItems').innerHTML=review.ordered.slice(review.page*REVIEW_PAGE_SIZE,(review.page+1)*REVIEW_PAGE_SIZE).map(entry=>{
    const t=types[entry.type],place=entry.place==='bag'?'Рюкзак':'Сховище';
    const effect=review.mode==='sale'?entry.value+' купонів':entry.old===undefined?'Нова позиція':`Альбом: ${entry.old}% → ${entry.condition}%; ${entry.old}% у сховище`;
    return `<label class="review-item"><input type="checkbox" data-review-key="${entry.key}" ${review.selected.has(entry.key)?'checked':''}><span><b>${t.name}</b>${t.variant?`<small>${t.variant}</small>`:''}<small>${place} · стан ${entry.condition}%</small><strong>${effect}</strong></span></label>`;
  }).join('')||'<p class="camp-note">У цьому списку поки немає знахідок.</p>';
  renderReviewTotal();
}
function refreshReview(mode,includeScrap=false,notice='',keepSelection=false) {
  const entries=bulkPlan(mode,includeScrap);
  const choices=new Map(keepSelection&&review?review.choices:[]);
  for(const entry of entries)if(!choices.has(entry.item))choices.set(entry.item,true);
  review={mode,includeScrap,entries,ordered:sortedInventory(entries,'type'),page:keepSelection&&review?review.page:0,choices,selected:new Set(entries.filter(e=>choices.get(e.item)).map(e=>e.key))};
  $('reviewTitle').textContent=mode==='sale'?'Продаж знахідок':'Кращі до альбому';
  $('reviewDescription').textContent=(mode==='sale'?'Підбір з усього рюкзака та сховища. Найкраща копія для нової позиції або покращення альбому залишається у тебе. Зніми позначки з того, що хочеш зберегти.':'Найкраща наявна копія кожної позиції з рюкзака та сховища. Замінені екземпляри повернуться у сховище. Зніми позначки з того, що поки хочеш залишити.')+' Вибір і підсумок охоплюють усі сторінки.';
  $('reviewScrapOption').hidden=mode!=='sale';$('reviewIncludeScrap').checked=includeScrap;
  $('reviewNotice').textContent=notice;
  renderReviewList();
}
export function openInventoryReview(mode) {
  if(!s.atCamp||busy()||!['sale','album'].includes(mode))return;
  refreshReview(mode);$('inventoryReview').showModal();
}
export function confirmInventoryReview() {
  if(!review||!$('inventoryReview').open)return;
  if(!s.atCamp||busy('inventoryReview')) {
    review=null;$('inventoryReview').close();albumNotice('Розбір знахідок доступний у таборі після завершення інших дій.');return;
  }
  const fresh=bulkPlan(review.mode,review.includeScrap);
  if(!samePlan(review.entries,fresh)) {
    refreshReview(review.mode,review.includeScrap,'Знахідки або альбом змінилися. Список оновлено — перевір його ще раз.',true);return;
  }
  const selected=review.entries.filter(e=>review.selected.has(e.key));if(!selected.length)return;
  const mode=review.mode;review=null;$('inventoryReview').close();
  const chosen=new Set(selected.map(e=>e.item));
  s.bag=s.bag.filter(item=>!chosen.has(item));s.stash=s.stash.filter(item=>!chosen.has(item));
  if(mode==='sale') {
    const total=selected.reduce((sum,e)=>sum+e.value,0);s.coins+=total;
    albumNotice(`Продано знахідок: ${selected.length}. Отримано ${total} купонів. Копії для альбому збережені.`);
  } else {
    const returned=[];let added=0,improved=0;
    for(const entry of selected) {
      if(entry.old===undefined){s.collection.push(entry.type);added++;}
      else {returned.push({type:entry.type,condition:entry.old});improved++;}
      s.best[entry.type]=entry.condition;
    }
    s.stash.unshift(...returned);
    albumNotice(`Альбом: нових позицій — ${added}, покращень — ${improved}. Попередніх екземплярів у сховищі: ${returned.length}.`);
  }
  save();render();$('inventoryNotice').scrollIntoView?.({block:'nearest',behavior:'smooth'});
}
export function initInventory() {
  $('inventorySort').onchange=e=>{inventoryView.sort=e.target.value;resetPages();renderInventory();};
  $('inventoryFilter').onchange=e=>{inventoryView.filter=e.target.value;resetPages();renderInventory();};
  $('inventoryFilterReset').onclick=()=>{inventoryView.filter='all';resetPages();renderInventory();};
  for(const place of ['bag','stash'])for(const [suffix,delta] of [['Prev',-1],['Next',1]])$(place+suffix).onclick=()=>{
    inventoryView[place+'Page']=Math.max(0,inventoryView[place+'Page']+delta);renderInventory();
    $(place==='bag'?'bagShown':'stashShown').scrollIntoView?.({block:'start'});
  };
  for(const [suffix,delta] of [['Prev',-1],['Next',1]])$('review'+suffix).onclick=()=>{
    if(!review)return;review.page+=delta;renderReviewList();$('reviewItems').scrollTop=0;
  };
  $('reviewAlbum').onclick=()=>openInventoryReview('album');
  $('reviewSale').onclick=()=>openInventoryReview('sale');
  $('reviewIncludeScrap').onchange=()=>{if(review)refreshReview(review.mode,$('reviewIncludeScrap').checked,'',true);};
  $('reviewItems').addEventListener('change',e=>{
    const key=e.target.dataset?.reviewKey,entry=review?.entries.find(entry=>entry.key===key);if(!entry)return;
    review.choices.set(entry.item,e.target.checked);
    e.target.checked?review.selected.add(key):review.selected.delete(key);renderReviewTotal();
  });
  $('reviewSelectAll').onclick=()=>{
    if(!review)return;
    review.selected=review.selected.size===review.entries.length?new Set():new Set(review.entries.map(e=>e.key));
    for(const entry of review.entries)review.choices.set(entry.item,review.selected.has(entry.key));
    renderReviewList();
  };
  $('reviewConfirm').onclick=confirmInventoryReview;
  $('reviewCancel').onclick=$('reviewClose').onclick=()=>{review=null;$('inventoryReview').close();};
  $('inventoryReview').addEventListener('cancel',()=>{review=null;});
  $('inventoryReview').addEventListener('close',()=>{if(!$('inventoryReview').open)review=null;});
  $('showReturnedItem').onclick = () => {
    const index = s.stash.indexOf(returnedItem);
    if (index < 0) return;
    inventoryView.filter='all';
    const ordered=sortedInventory(inventoryEntries().filter(e=>e.place==='stash'),inventoryView.sort,'all');
    inventoryView.stashPage=Math.floor(ordered.findIndex(e=>e.item===returnedItem)/INVENTORY_PAGE_SIZE);
    renderInventory();
    const card = $('warehouseItems').querySelector(`[data-item-place="stash"][data-item-index="${index}"]`);
    card?.scrollIntoView?.({block:'center', behavior:'smooth'});
    card?.setAttribute('tabindex', '-1');
    card?.focus?.({preventScroll:true});
  };
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
    const count=s.bag.length,portions=s.food.reduce((a,b)=>a+b,0);
    s.stash.push(...s.bag);
    s.bag = [];
    for (let i = 0; i < 3; i++) {
      s.pantry[i] += s.food[i];
      s.food[i] = 0;
    }
    albumNotice(`Перекладено додому: знахідок — ${count}, порцій їжі — ${portions}. Альбом і купони не змінені.`);
    save();
    render();
  };
}

