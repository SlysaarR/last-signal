import { t as localize, translateHTML } from './i18n.js?v=0.53.0';
import { renderPreparation } from './environment-ui.js?v=0.53.0';
import { environmentName } from '../data/environment.js?v=0.53.0';
import { MAX_SITES, activeSite, selectedSite, siteName, siteLocation, siteRoute, siteAccessible, canScout } from '../data/atlas.js?v=0.53.0';
import { routes, conditions, chosenRoute } from '../data/expeditions.js?v=0.53.0';
import { surveyCols, surveyRows } from '../data/balance.js?v=0.53.0';
import { ensureAtlas, selectSite, forgetSite } from './atlas-state.js?v=0.53.0';
import { s, save } from './storage.js?v=0.53.0';
import { $ } from './dom.js?v=0.53.0';
import { busy, render, showTab } from './ui.js?v=0.53.0';
import { modal } from './dialogs.js?v=0.53.0';
import { canLeave, travelCost, emergencyAllowed } from './rules.js?v=0.53.0';
import { confirmDeparture, departureBlock } from './camp.js?v=0.53.0';
const pins=[[19,20],[73,15],[85,49],[69,81],[20,80],[13,48]];
export function openAtlas() {
  if(busy())return;
  ensureAtlas();save();showTab('atlas');
}
function pick(id) {
  if(busy()||!selectSite(id))return;
  save();render();$('atlasSelected').focus?.({preventScroll:false});
}
function requestForget(id) {
  if(!s.atCamp||busy())return;
  const state=s,atlas=s.atlas,site=atlas?.sites.find(site=>site.id===id);
  if(!site||site.id===atlas.activeId)return;
  modal('ПРИБРАТИ З КАРТИ?','🗺️',siteName(site),
    'Цю ділянку та її мітки буде втрачено. Залишені в землі предмети сюди повернути вже не вдасться. Знахідки у рюкзаку, сховищі й альбомі залишаться. Звільниться одне місце для розвідки.',
    'Прибрати ділянку',()=>{
      if(s!==state||s.atlas!==atlas||!atlas.sites.includes(site)||!forgetSite(id))return;
      save();render();$('atlasNotice').textContent=localize('Ділянку прибрано. Можна розвідати нове місце.');$('atlasNotice').focus?.({preventScroll:true});
    });
}
export function renderAtlas() {
  renderPreparation('atlasConditions');
  const atlas=s.atlas,sites=atlas?.sites||[],target=selectedSite(s),route=chosenRoute(s),current=activeSite(s);
  const here=target&&target.id===current?.id;
  $('atlasCount').textContent=localize(sites.length+' / '+MAX_SITES+' ділянок');
  $('atlasBack').textContent=localize(s.atCamp?'← До табору':'← До поточного пошуку');
  $('atlasPins').innerHTML=translateHTML(sites.map((site,i)=>`<button class="atlas-pin ${site===target?'selected':''} ${site===current?'current':''}" style="left:${pins[i][0]}%;top:${pins[i][1]}%" data-atlas-pick="${site.id}" aria-label="Обрати: ${siteName(site)}, ділянка ${site.id}${site===current?', ти тут':''}" aria-pressed="${site===target}" ${siteAccessible(s,site)?'':'disabled'}><span aria-hidden="true">${siteLocation(site).icon}</span><b>${site.id}</b></button>`).join(''));
  $('atlasPinsEmpty').hidden=!!sites.length;
  $('atlasTarget').textContent=localize(target?siteName(target):emergencyAllowed()?'Розвідка бідного узбіччя':'Розвідка · '+route.name);
  $('atlasTargetNote').textContent=localize(here?'Ти вже тут. Пошук можна продовжити з тієї самої позиції.':target?'Ділянка № '+target.id+' · '+(target.environment?environmentName(target.environment):conditions[target.condition].name)+'. Ями, мітки та здобич залишаються на своїх місцях.':emergencyAllowed()?'Коли купонів менше 25, із табору доступна безкоштовна розвідка бідного узбіччя.':route.text+' Погода й ґрунт показані у прогнозі нижче; конкретне місце відкриється після прибуття.');
  $('atlasFare').textContent=localize(here?'Ти на ділянці':'Дорога · '+travelCost()+' купонів');
  $('atlasTravel').textContent=localize(here?'Продовжити пошук':target?'Повернутися на ділянку':'Вирушити на розвідку');
  $('atlasTravel').disabled=!here&&!canLeave();
  $('atlasTravelNote').textContent=localize(here?'Мітки позначають твої спостереження, а не підтверджену здобич.':departureBlock() || 'Після оплати залишиться '+(s.coins-travelCost())+' купонів. Дорога не відновлює сили'+(!s.atCamp?' і не скидає ліміт їжі.':'.'));
  $('atlasSites').innerHTML=translateHTML(sites.map(site=>{
    const field=site===current?s:site.field,loc=siteLocation(site),isCurrent=site===current;
    const explored=Math.floor((field.survey?.length||0)/(surveyCols*surveyRows)*100),marks=field.fieldMarks?.length||0;
    const locked=!siteAccessible(s,site),fare=site.emergency&&s.atCamp&&s.coins<25?0:siteRoute(site).cost;
    return `<article class="atlas-card ${site===target?'selected':''}"><div class="atlas-card-head"><span class="atlas-number">${site.id}</span><div><h3>${siteName(site)}</h3><small>${loc.name}${isCurrent?' · ти тут':''}</small></div><span aria-hidden="true">${loc.icon}</span></div><p>${site.emergency?'Бідне узбіччя з великою кількістю сміття.':loc.hint}</p><div class="atlas-facts"><span>${site.environment?environmentName(site.environment):conditions[site.condition].name}</span><span>Дорога: ${fare} куп.</span><span>Пройдено: ${explored}%</span><span>Міток: ${marks} / 8</span></div><p class="atlas-history">Відвідувань: ${site.visits} · останній виїзд № ${site.lastDay}${site.productive?' · результативна ділянка':''}</p><div class="atlas-card-actions"><button class="${site===target?'primary':'secondary'}" data-atlas-pick="${site.id}" aria-pressed="${site===target}" ${locked?'disabled':''}>${locked?'Потрібно '+siteRoute(site).need+' позицій в альбомі':site===target?'Обрано':isCurrent?'Поточне місце':'Обрати ділянку'}</button><button class="quiet" data-atlas-forget="${site.id}" ${!s.atCamp||isCurrent?'disabled':''} aria-label="Прибрати з карти: ${siteName(site)}">Прибрати</button></div></article>`;
  }).join('')||'<div class="empty-state"><b>Твоя карта поки порожня</b><p>Обери напрямок розвідки нижче. Після прибуття ділянка збережеться тут.</p></div>');
  $('atlasScout').textContent=localize(!target?'Обрано розвідку нового місця':'Обрати розвідку нового місця');
  $('atlasScout').setAttribute('aria-pressed',String(!target));
  $('atlasScout').disabled=!canScout(s);
  $('atlasCapacity').textContent=localize(canScout(s)?'Місць для нових ділянок: '+(MAX_SITES-sites.length)+'. Кожна розвідка відкриває інше місце.':'Усі '+MAX_SITES+' місць зайняті. Прибрати ділянку можна в таборі — тільки після підтвердження.');
  $('atlasRoute').innerHTML=translateHTML(routes.map(r=>`<option value="${r.id}" ${r.id===route.id?'selected':''} ${s.collection.length<r.need?'disabled':''}>${r.name} · ${r.cost} куп.${s.collection.length<r.need?' · від '+r.need+' позицій':''}</option>`).join(''));
  $('atlasRoute').value=route.id;$('atlasRoute').disabled=!s.atCamp;
  $('atlasRouteNote').textContent=localize(s.atCamp?'Напрямок звужує вибір місцевостей. Бідна ділянка можлива всюди.':'Змінити напрямок розвідки можна в таборі. На знайому ділянку можна переїхати зараз за її тарифом.');
}
export function initAtlas() {
  $('atlasBack').onclick=()=>showTab(s.atCamp?'camp':'search');
  $('atlasTravel').onclick=()=>{
    if(busy())return;
    if(selectedSite(s)?.id===activeSite(s)?.id && activeSite(s)){showTab('search');return;}
    confirmDeparture();
  };
  $('atlasScout').onclick=()=>{if(canScout(s))pick(null);};
  $('atlasRoute').onchange=e=>{
    if(!s.atCamp||busy())return;
    const route=routes.find(r=>r.id===e.target.value);if(!route||s.collection.length<route.need)return;
    s.route=route.id;selectSite(null);save();render();
  };
  for(const id of ['atlasPins','atlasSites'])$(id).addEventListener('click',e=>{
    const choose=e.target.closest('[data-atlas-pick]'),remove=e.target.closest('[data-atlas-forget]');
    if(choose){const site=s.atlas?.sites.find(site=>site.id===Number(choose.dataset.atlasPick));if(site&&siteAccessible(s,site))pick(site.id);}
    else if(remove)requestForget(Number(remove.dataset.atlasForget));
  });
}
