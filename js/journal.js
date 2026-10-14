import { siteName } from '../data/atlas.js?v=0.46.0';
import { routes, goals, conditions, chosenRoute } from '../data/expeditions.js?v=0.46.0';
import { locations } from '../data/locations.js?v=0.46.0';
import { $ } from './dom.js?v=0.46.0';
import { s,save } from './storage.js?v=0.46.0';
import { progress,goalMetrics,claimGoal } from './progression.js?v=0.46.0';
import { render,busy } from './ui.js?v=0.46.0';
let campKey='',journalKey='';
export function journalGoals(metrics=goalMetrics()){
 const claimed=progress().claimed;
 return goals.map((g,index)=>({...g,index,value:Math.min(metrics[g.metric]||0,g.target),done:claimed.includes(g.id)}))
   .sort((a,b)=>{const rank=g=>g.done?2:g.value===g.target?0:1;return rank(a)-rank(b)||(rank(a)===1?b.value/b.target-a.value/a.target:0)||a.index-b.index;});
}
function goalCard(g){
 const ready=g.value===g.target&&!g.done;
 const action=g.done?'<span class="goal-status">✓ Нагороду отримано</span>':ready&&s.atCamp&&!s.pending?`<button class="primary" data-claim="${g.id}">Отримати ${g.reward} купонів</button>`:`<span class="goal-status">${ready?'Готово · забрати в таборі':'У процесі'}</span>`;
 return `<article class="goal-card ${g.done?'complete':ready?'ready':''}" data-goal="${g.id}"><div class="goal-head"><h3>${g.name}</h3><span>${g.done?'✓':g.reward+' куп.'}</span></div><p>${g.text}</p><div class="goal-meter"><progress aria-label="${g.name}" value="${g.value}" max="${g.target}"></progress><small>${g.value} / ${g.target}</small></div>${action}</article>`;
}
export function renderJournal(scope='all'){
 const next=JSON.stringify([s.progress,s.route,s.collection,s.best,s.atCamp,!!s.pending]);
 const camp=(scope==='all'||scope==='camp')&&campKey!==next;
 const journal=(scope==='all'||scope==='journal')&&journalKey!==next;
 if(!camp&&!journal)return;
 const p=progress(),route=chosenRoute(s),metrics=goalMetrics(),ready=goals.filter(g=>!p.claimed.includes(g.id)&&(metrics[g.metric]||0)>=g.target).length;
 if(camp){
 campKey=next;
 $('journalBadge').textContent=ready?'Готові нагороди: '+ready+' · забери в таборі':s.collection.length+' позицій · '+p.visited.length+' / 8 місцевостей';
 $('routeHint').textContent=s.atCamp?'Натисни, щоб обрати':'Напрямок можна змінити після повернення';
 $('routeName').textContent=route.name+' · '+route.cost+' купонів';
 $('routeCards').innerHTML=routes.map(r=>`<button class="route-card ${r.id===route.id?'selected':''}" data-route="${r.id}" aria-pressed="${r.id===route.id}" ${!s.atCamp||s.pending||s.collection.length<r.need?'disabled':''}><span class="route-icon" aria-hidden="true">${r.icon}</span><b>${r.name}</b><small>${r.text}</small><strong>${s.collection.length<r.need?'Потрібно '+r.need+' позицій в альбомі':r.cost+' купонів за дорогу'}</strong></button>`).join('');
 }
 if(!journal)return;
 journalKey=next;
 $('careerStats').innerHTML=[['Оглянуто',p.finds],['Порожніх ямок',p.empty],['Результативних ділянок',p.trips],['Цілей виконано',(p.claimed.length+ready)+' / '+goals.length]].map(([a,b])=>`<div><span>${a}</span><strong>${b}</strong></div>`).join('');
 const ordered=journalGoals(metrics),finished=ordered.filter(g=>g.done);
 $('goalSummary').textContent=ready?'Готові нагороди: '+ready+(s.atCamp?' · забери нижче':' · можна забрати після повернення до табору'):finished.length===goals.length?'Усі поточні цілі виконано, нагороди отримано.':'Найближчі до виконання цілі — на початку списку.';
 $('goalCards').innerHTML=ordered.filter(g=>!g.done).map(goalCard).join('');
 $('completedGoalCards').innerHTML=finished.map(goalCard).join('');
 $('completedGoals').hidden=!finished.length;
 $('completedGoalCount').textContent=finished.length+' / '+goals.length;
 $('visitedPlaces').innerHTML=locations.map((l,i)=>`<div class="place-row ${p.visited.includes(i)?'visited':''}"><span aria-hidden="true">${l.icon}</span><div><b>${l.name}</b><small>${p.visited.includes(i)?'Місцевість відвідана':'Ще попереду'}</small></div><span>${p.visited.includes(i)?'✓':'—'}</span></div>`).join('');
 $('tripHistory').innerHTML=p.history.map(a=>`<article class="history-card"><div class="goal-head"><h3>${a.siteId?siteName({id:a.siteId,location:a.location,emergency:a.emergency}):a.emergency?'Бідне узбіччя':locations[a.location]?.name||'Попередня ділянка'}</h3><span>№ ${a.day}</span></div><p>${conditions[a.condition].name} · дорога ${a.travel} куп.</p><div class="history-numbers"><span><b>${a.found}</b> оглянуто</span><span><b>${a.kept}</b> забрано</span><span><b>${a.empty}</b> порожніх ямок</span></div><small>${a.newTypes} нових для альбому типів помічено${(a.qualifiedSite??a.found>=3)?' · результативна ділянка':''}</small></article>`).join('')||'<div class="empty-state"><b>Історія починається з наступного виїзду</b><p>Після повернення або зміни ділянки тут залишиться запис. Зберігаються останні 12 ділянок.</p></div>';
}
export function initJournal(){
 $('routeCards').addEventListener('click',e=>{const b=e.target.closest('[data-route]');if(!b||!s.atCamp||busy())return;const r=routes.find(r=>r.id===b.dataset.route);if(!r||s.collection.length<r.need)return;s.route=r.id;if(s.atlas)s.atlas.selectedId=null;save();render();});
 $('goalCards').addEventListener('click',e=>{const b=e.target.closest('[data-claim]');if(!b||busy())return;if(claimGoal(b.dataset.claim)){$('journalNotice').textContent='Нагороду отримано. Купони додано до балансу.';render();const next=$('goalCards').querySelector('[data-claim]')||$('goalSummary');next.focus?.({preventScroll:true});}});
}
