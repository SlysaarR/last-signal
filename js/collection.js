import { artifactMarkup, renderArtifactThumbnails } from './graphics/thumbnails.js?v=0.51.0';
import { albumSets, setProgress } from '../data/career.js?v=0.51.0';
import { findMaterials } from '../data/finds.js?v=0.51.0';
import { setupInspection, clearInspection } from './coin-flip.js?v=0.51.0';
import { isUkrainianCoin, coinMarkup, renderCoinThumbnails } from './graphics/ukrainian-coins.js?v=0.51.0';
// collection responsibilities for Last Signal.
import { rarities } from '../data/balance.js?v=0.51.0';
import { collectible, types } from '../data/items.js?v=0.51.0';
import { $ } from './dom.js?v=0.51.0';
import { priceFor } from './rules.js?v=0.51.0';
import { s } from './storage.js?v=0.51.0';
import { coinSource, coinEdgeSpec, coinDesign } from '../data/coin-art.js?v=0.51.0';
export let collectionCategory = 'coin',
  denomFilter = 'all',
  yearFilter = 'all',
  missingOnly = false,
  collectionRenderKey = '';
export let setFilter=null;
export function showSetItems(id){
 if(!albumSets.some(set=>set.id===id))return;
 setFilter=id;collectionCategory='coin';denomFilter='all';yearFilter='all';missingOnly=false;
 $('denomFilter').value='all';$('missingFilter').checked=false;updateYearFilter();renderCollection();
}
export const yearKey = t => t.denom + '|' + t.year;
export function categoryItems() {
  const all = types.map((t, id) => ({
    ...t,
    id
  }));
  if (collectionCategory === 'legacy') return all.filter(t => t.legacy && s.collection.includes(t.id));
  if(setFilter){const set=setProgress(albumSets.find(set=>set.id===setFilter),s),rows=set.done?set.slots:set.slots.filter(row=>!row.done),ids=new Set(rows.flatMap(row=>row.ids));return all.filter(t=>ids.has(t.id)).sort((a,b)=>denominations.indexOf(a.denom)-denominations.indexOf(b.denom)||a.year-b.year||a.id-b.id);}
  return all.filter(t => !t.legacy && t.kind === collectionCategory && (collectionCategory !== 'coin' || (denomFilter === 'all' || t.denom === denomFilter) && (yearFilter === 'all' || t.year === Number(yearFilter)) && (!missingOnly || !s.collection.includes(t.id)))).sort((a, b) => collectionCategory === 'coin' ? denominations.indexOf(a.denom) - denominations.indexOf(b.denom) || a.year - b.year || a.id - b.id : a.id - b.id);
}
export function renderCollection() {
  const key = JSON.stringify([collectionCategory, denomFilter, yearFilter, missingOnly, setFilter, s.collection, s.best]);
  if (key === collectionRenderKey) return;
  collectionRenderKey = key;
  const owned = new Set(s.collection),
    found = collectible.filter(t => owned.has(t.id)).length;
  $('collectionCount').textContent = found + ' / ' + collectible.length + ' позицій у колекції';
  $('archiveTab').hidden = !s.collection.some(id => types[id]?.legacy);
  $('coinFilters').hidden = collectionCategory !== 'coin'||!!setFilter;
  $('setFilterBar').hidden=!setFilter;
  if(setFilter){const set=setProgress(albumSets.find(set=>set.id===setFilter),s);$('setFilterText').textContent=set.name+' · '+(set.done?'Набір завершено. Показані всі відповідні позиції.':'Показані варіанти для незаповнених частин набору. Достатньо одного відповідного екземпляра на частину.');}
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
  $('catalogNote').textContent = collectionCategory === 'coin' ? 'Кожен номінал і рік — окрема ціль. Різновиди зберігаються окремо. Монети відтворено за зображеннями реальних зразків. Обертай монету, щоб оглянути обидва боки та гурт. При покращенні альбому попередній екземпляр залишається у сховищі.' : collectionCategory === 'legacy' ? 'Тут збережено умовні монети з ранніх версій.' : 'У колекції залишається найкращий стан кожного виду. Попередній екземпляр при заміні зберігається у сховищі.';
  let previous = '';
  $('items').innerHTML = list.map(t => {
    const has = owned.has(t.id),
      r = rarities[t.rarity];
    let heading = '';
    if (t.country && previous !== t.denom) {
      previous = t.denom;
      heading = '<h3 class="album-heading">' + t.denom + '<small>За роками випуску</small></h3>';
    }
    return heading + `<button class="collect ${has ? 'owned' : 'unfound'}" data-item="${t.id}"><small class="ownership">${has ? '✓ В альбомі' : 'Не знайдено'}</small>${has && isUkrainianCoin(t) ? coinMarkup(t.id, s.best[t.id]) : has ? artifactMarkup(t.id, s.best[t.id]) : '<span class="collection-symbol" aria-hidden="true">○</span>'}<b>${t.country ? t.year + ' рік' : t.name}</b>${t.country ? '<small>' + t.denom + '</small>' : ''}${t.variant ? '<small class="coin-variant">' + t.variant + '</small>' : ''}${t.issue === 'set' ? '<small>Наборний випуск</small>' : ''}<small class="rarity" style="color:${r.color}">${r.name}</small><small class="collection-condition">${has ? 'Стан ' + s.best[t.id] + '/100' : 'Вільне місце в альбомі'}</small>${has ? '<small>' + priceFor(t.id, s.best[t.id]) + ' купонів</small>' : ''}</button>`;
  }).join('') || '<p class="sub">За цими фільтрами позицій немає.</p>';
  renderCoinThumbnails();renderArtifactThumbnails();
}
export function showItem(id) {
  const t = types[id];
  if (!t || t.kind === 'trash') return;
  const found = s.collection.includes(id);
  $('detailTitle').textContent = t.name;
  const lines = [];
  if(t.findDescription)lines.push(t.findDescription,'Матеріал моделі: '+findMaterials[t.findMaterial],t.note);
  if (t.country) lines.push(t.country + ' · ' + t.denom + ' · ' + t.year + ' р.', 'Різновид: ' + t.variant, t.note);else if (t.legacy) lines.push('Умовна монета раннього прототипу. Збережена як твоя попередня знахідка.');
  lines.push('Ігрова рідкість: ' + rarities[t.rarity].name, found ? 'Найкращий стан: ' + s.best[id] + '/100. Ігрова оцінка: ' + priceFor(id, s.best[id]) + ' купонів.' : 'Цю позицію ще треба знайти.');
  if (t.source) lines.push(t.contentPack?'Стан і ціна — ігрові показники.':'Шкала 0–100 — ігровий стан, не нумізматичний грейд. Ціна не є ринковою оцінкою в гривнях.');
  const dimensions=coinDesign(t);
  if(dimensions){const edge=coinEdgeSpec(t);lines.push(`Діаметр: ${dimensions.diameter} мм · товщина: ${dimensions.thickness} мм. Гурт: ${{smooth:'гладкий',reeded:'рифлений',sector:'секторальне рифлення',lettered:'вдавлений напис'}[edge.kind]}${edge.text?' «'+edge.text+'»':''}.`);}
  $('detailText').textContent = lines.join('\n\n');
  $('detailSource').hidden = !t.source;
  $('detailSource').textContent=t.contentPack?'Про цей тип предмета · джерело':'Відкрити статтю каталогу';
  if (t.source) $('detailSource').href = t.source;
  $('detailArtSource').hidden=!coinSource(t);
  if(coinSource(t)){
    $('detailArtSource').href=coinSource(t);
    $('detailArtSource').textContent=coinSource(t).includes('numista')?'Зображення зразка · НБУ / Numista':'Фото різновиду · нумізматичний каталог';
  }
  $('detailArt').hidden = false;
  $('wearExamples').hidden = false;
  const condition = found ? s.best[id] : 75;
  const viewer = setupInspection($('detailArt'), $('detailFlip'), id, condition);
  const slider=$('conditionPreview'), label=$('conditionPreviewValue');
  slider.value=condition;
  $('conditionPreviewReset').textContent=found?'Повернути стан знахідки':'Повернути початковий зразок';
  const updateLabel=()=>{$('conditionPreviewReset').hidden=Number(slider.value)===condition;label.textContent=slider.value+'%';$('conditionPreviewNote').textContent=Number(slider.value)===condition ? (found ? 'Стан твоєї знахідки' : 'Зразок для огляду') : 'Порівняння вигляду · стан знахідки не змінюється';};
  updateLabel();
  slider.oninput=()=>{viewer.setCondition(Number(slider.value));updateLabel();};
  $('conditionPreviewReset').onclick=()=>{slider.value=condition;viewer.setCondition(condition);updateLabel();};
  if (!found) $('detailText').textContent += '\n\nЗображення — зразок для огляду, не знайдений предмет.';
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
  $('coinDetail').addEventListener('close',()=>clearInspection($('detailArt')));
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
    setFilter=null;
    renderCollection();
  });
  $('items').addEventListener('click', e => {
    const b = e.target.closest('[data-item]');
    if (b) showItem(Number(b.dataset.item));
  });
  $('detailClose').onclick = () => $('coinDetail').close();
  $('clearSetFilter').onclick=()=>{setFilter=null;renderCollection();};
}

