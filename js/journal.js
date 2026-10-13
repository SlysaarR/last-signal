import { routes, goals, conditions, chosenRoute } from '../data/expeditions.js?v=0.32.0';
import { locations } from '../data/locations.js?v=0.32.0';
import { $ } from './dom.js?v=0.32.0';
import { s,save } from './storage.js?v=0.32.0';
import { progress,goalValue,claimGoal } from './progression.js?v=0.32.0';
import { render,busy } from './ui.js?v=0.32.0';
let key='';
export function renderJournal(){
 const next=JSON.stringify([s.progress,s.route,s.collection,s.best,s.atCamp,s.coins,!!s.pending]);if(key===next)return;key=next;
 const p=progress(),route=chosenRoute(s),ready=goals.filter(g=>!p.claimed.includes(g.id)&&goalValue(g)>=g.target).length;
 $('journalBadge').textContent=ready?ready+' нагород чекають у таборі':s.collection.length+' позицій · '+p.visited.length+' / 8 місцевостей';
 $('routeName').textContent=route.name+' · '+route.cost+' купонів';
 $('routeCards').innerHTML=routes.map(r=>`<button class="route-card ${r.id===route.id?'selected':''}" data-route="${r.id}" aria-pressed="${r.id===route.id}" ${!s.atCamp||s.pending||s.collection.length<r.need?'disabled':''}><span class="route-icon" aria-hidden="true">${r.icon}</span><b>${r.name}</b><small>${r.text}</small><strong>${s.collection.length<r.need?'Потрібно '+r.need+' позицій в альбомі':r.cost+' купонів за дорогу'}</strong></button>`).join('');
 $('careerStats').innerHTML=[['Оглянуто',p.finds],['Порожніх ямок',p.empty],['Результативних ділянок',p.trips],['Цілей виконано',p.claimed.length+' / '+goals.length]].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
 $('goalCards').innerHTML=goals.map(g=>{const v=Math.min(goalValue(g),g.target),done=p.claimed.includes(g.id);return `<article class="goal-card ${done?'complete':''}"><div class="goal-head"><h3>${g.name}</h3><span>${done?'✓':g.reward+' куп.'}</span></div><p>${g.text}</p><div class="goal-meter"><progress aria-label="${g.name}" value="${v}" max="${g.target}"></progress><small>${v} / ${g.target}</small></div><button class="${v===g.target&&!done?'primary':'secondary'}" data-claim="${g.id}" ${done||v<g.target||!s.atCamp||s.pending?'disabled':''}>${done?'Нагороду отримано':v===g.target?(s.atCamp?'Отримати '+g.reward+' купонів':'Забрати нагороду в таборі'):'У процесі'}</button></article>`}).join('');
 $('visitedPlaces').innerHTML=locations.map((l,i)=>`<div class="place-row ${p.visited.includes(i)?'visited':''}"><span aria-hidden="true">${l.icon}</span><div><b>${l.name}</b><small>${p.visited.includes(i)?'Місцевість відвідана':'Ще попереду'}</small></div><span>${p.visited.includes(i)?'✓':'—'}</span></div>`).join('');
 $('tripHistory').innerHTML=p.history.map(a=>`<article class="history-card"><div class="goal-head"><h3>${a.emergency?'Бідне узбіччя':locations[a.location]?.name||'Попередня ділянка'}</h3><span>№ ${a.day}</span></div><p>${conditions[a.condition].name} · дорога ${a.travel} куп.</p><div class="history-numbers"><span><b>${a.found}</b> оглянуто</span><span><b>${a.kept}</b> забрано</span><span><b>${a.empty}</b> порожніх ямок</span></div><small>${a.newTypes} нових для альбому типів помічено${a.found>=3?' · результативна ділянка':''}</small></article>`).join('')||'<div class="empty-state"><b>Історія починається з наступного виїзду</b><p>Після повернення або зміни ділянки тут залишиться запис. Зберігаються останні 12 ділянок.</p></div>';
}
export function initJournal(){
 $('routeCards').addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(!b||!s.atCamp||busy())return;const r=routes.find(r=>r.id===b.dataset.route);if(!r||s.collection.length<r.need)return;s.route=r.id;save();render();});
 $('goalCards').addEventListener('click',e=>{const b=e.target.closest('[data-claim]');if(!b||busy())return;if(claimGoal(b.dataset.claim)){$('journalNotice').textContent='Нагороду отримано. Купони додано до балансу.';render();}});
}
