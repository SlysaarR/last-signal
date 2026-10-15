import { pageWindow, layoutRevision, setPane, resetPage } from './layout.js?v=0.55.3';
import { journalGoals, openVisitRoute } from './journal.js?v=0.55.3';
import { t as localize, translateHTML } from './i18n.js?v=0.55.3';
import { chapters } from '../data/career.js?v=0.55.3';
import { careerSnapshot, mainObjective, claimChapter, trackFocus } from './career.js?v=0.55.3';
import { showSetItems } from './collection.js?v=0.55.3';
import { activeOrder } from './orders.js?v=0.55.3';
import { s } from './storage.js?v=0.55.3';
import { $ } from './dom.js?v=0.55.3';
import { busy, render, showTab } from './ui.js?v=0.55.3';
const keys={};
const meter=(label,value,total)=>`<div class="career-meter"><progress aria-label="${label}" value="${value}" max="${total}"></progress><span>${value} / ${total}</span></div>`;
export function renderMainObjective(place){
 const objective=mainObjective(),key=JSON.stringify(objective);
 if(keys[place]===key)return;keys[place]=key;
 const prefix=place==='camp'?'campObjective':'fieldObjective';
 $(prefix+'Kind').textContent=localize(objective.kind);
 $(prefix+'Title').textContent=localize(objective.title);
 $(prefix+'Text').textContent=localize(objective.text);
 $(prefix+'Meter').value=objective.value;$(prefix+'Meter').max=objective.total;
 $(prefix+'Count').textContent=localize(objective.value+' / '+objective.total);
}
export function renderCareer(){
 const view=careerSnapshot(),key=JSON.stringify([view,s.career?.focus,s.atCamp,!!s.pending,!!activeOrder(),layoutRevision()]);
 if(keys.career===key)return;keys.career=key;
 $('careerRank').textContent=localize(view.rank);
 $('careerProgress').textContent=localize('Завершено етапів: '+view.completed+' / '+chapters.length+' · наборів: '+view.metrics.sets+' / '+view.sets.length);
 $('careerCards').innerHTML=translateHTML(pageWindow('career',view.stages,{key:String(view.completed),initial:Math.min(view.completed,view.stages.length-1)}).map(chapter=>{
  const action=chapter.done?'<span class="career-stamp">Відзнаку отримано</span>':chapter.unlocked&&chapter.ready?`<button class="primary" data-career-claim="${chapter.id}" ${s.atCamp&&!s.pending?'':'disabled'}>${s.atCamp?'Отримати відзнаку · '+chapter.reward+' куп.':'Відзнака чекає в таборі'}</button>`:`<span class="career-state">${chapter.unlocked?'Поточний етап':'Після етапу «'+chapters[chapter.index-1].name+'»'}</span>`;
  const needs=chapter.needs.map(n=>`<li class="${n.done?'done':''}"><div><b>${n.done?'✓ ':''}${n.label}</b><span>${n.value} / ${n.target}</span></div><details class="need-help"><summary>Умова</summary><p>${n.hint}</p>${n.route?`<button class="quiet" data-career-route ${s.atCamp&&!s.pending?'':'disabled'}>Обрати напрямок →</button>`:''}</details>${n.metric==='sets'?'<button class="quiet" data-career-album>Переглянути набори →</button>':''}</li>`).join('');
  const body=`<p>${chapter.text}</p><ul class="career-needs">${needs}</ul><div class="career-reward"><span>Відзнака «${chapter.rank}» · ${chapter.reward} купонів</span>${action}</div>`;
  return chapter.unlocked?`<article class="career-stage current"><div class="career-stage-head"><span class="career-medal">${chapter.mark}</span><div><small>ЕТАП ${chapter.index+1} / ${chapters.length}</small><h3>${chapter.name}</h3></div></div>${body}</article>`:`<details class="career-stage ${chapter.done?'complete':''}"><summary><span class="career-medal">${chapter.done?'✓':chapter.mark}</span><span>${chapter.name}<small>${chapter.done?chapter.rank:'Прогрес уже враховується'}</small></span></summary>${body}</details>`;
 }).join(''));
 $('trackCareer').textContent=localize(s.career?.focus?'Показувати кар’єру як головну мету':'Головна мета: кар’єра');
 $('trackCareer').setAttribute('aria-pressed',String(!s.career?.focus));
 $('trackOrder').hidden=!activeOrder();$('trackOrder').setAttribute('aria-pressed',String(s.career?.focus==='order'));
}
export function renderAlbumSets(){
 const view=careerSnapshot(),key=JSON.stringify([view.sets,s.career?.focus,layoutRevision()]);
 if(keys.sets===key)return;keys.sets=key;
 $('albumSetCount').textContent=localize(view.metrics.sets+' / '+view.sets.length+' завершено');
 $('albumSetCards').innerHTML=translateHTML(pageWindow('sets',view.sets).map(set=>`<details class="album-set ${set.done?'complete':''}" open><summary><div><h3>${set.done?'✓ ':''}${set.name}</h3><span>${set.value} / ${set.total}${s.career?.focus==='set:'+set.id?' · головна мета':''}</span></div>${meter(set.name,set.value,set.total)}</summary><p>${set.text}</p><ul>${set.slots.map(row=>`<li class="${row.done?'done':''}"><span aria-hidden="true">${row.done?'✓':'○'}</span>${row.label}${row.done?' · в альбомі':''}</li>`).join('')}</ul><div class="set-actions"><button class="secondary" data-focus="set:${set.id}" aria-pressed="${s.career?.focus==='set:'+set.id}">${s.career?.focus==='set:'+set.id?'Відстежується':'Зробити головною метою'}</button><button class="quiet" data-set-browse="${set.id}">${set.done?'Переглянути монети':'Показати потрібні монети'} →</button></div></details>`).join(''));
}
function openObjective(){
 if(busy('tripMenu'))return;
 $('tripMenu').close();
 const objective=mainObjective();showTab(objective.screen);
 if(objective.setId)showSetItems(objective.setId);
 if(objective.screen==='journal'){
  const pane=s.career?.focus==='order'&&activeOrder()?'orders':s.career?.focus?.startsWith('goal:')?'goals':'career';
  const index=pane==='goals'?journalGoals().findIndex(goal=>goal.id===s.career.focus.slice(5)):pane==='career'?Math.min(careerSnapshot().completed,chapters.length-1):0;
  setPane('journal',pane);resetPage(pane,Math.max(0,index));render();
 }
}
export function initCareer(){
 $('campObjectiveOpen').onclick=openObjective;$('fieldObjectiveOpen').onclick=openObjective;
 $('trackCareer').onclick=()=>{if(!busy()&&trackFocus(null))render();};
 $('trackOrder').onclick=()=>{if(!busy()&&trackFocus('order'))render();};
 for(const container of ['journal','collection'])$(container).addEventListener('click',e=>{
  if(busy())return;
  const claim=e.target.closest('[data-career-claim]'),focus=e.target.closest('[data-focus]'),browse=e.target.closest('[data-set-browse]');
  if(claim){if(claimChapter(claim.dataset.careerClaim)){$('careerNotice').textContent=localize('Етап завершено. Відзнаку й купони отримано.');render();$('careerTitle').focus?.({preventScroll:true});}return;}
  if(focus){if(trackFocus(focus.dataset.focus)){$('careerNotice').textContent=localize('Головну мету змінено.');$('albumSetNotice').textContent=localize('Набір відстежується в таборі та на екрані пошуку.');render();}return;}
  if(browse){showSetItems(browse.dataset.setBrowse);$('setFilterBar').scrollIntoView?.({block:'start'});return;}
  if(e.target.closest('[data-career-route]')){openVisitRoute();return;}
  if(e.target.closest('[data-career-album]')){showTab('collection');setPane('collection','sets');$('albumSets').open=true;}
 });
}
