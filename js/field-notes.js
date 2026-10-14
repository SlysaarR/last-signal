import { siteDistance, createSiteLayout, siteGuide } from '../data/site-layout.js?v=0.45.0';
import { currentLocation } from './world.js?v=0.45.0';
import { s,save } from './storage.js?v=0.45.0';
import { $ } from './dom.js?v=0.45.0';
import { busy,render } from './ui.js?v=0.45.0';
export const MAX_FIELD_MARKS=8;
export function nearbyMark() {
  return (s.fieldMarks||[]).findIndex(p=>siteDistance(p,s)<=.035);
}
export function renderMarkControls() {
  const count=s.fieldMarks?.length||0,near=nearbyMark();
  $('markSpot').textContent=near>=0?'Прибрати мітку '+(near+1):'Позначити місце';
  $('markSpot').disabled=s.atCamp||!!s.pending||near<0&&count>=MAX_FIELD_MARKS;
  $('openFieldNotes').textContent='Мітки · '+count+' / '+MAX_FIELD_MARKS;
  $('openFieldNotes').disabled=s.atCamp||!!s.pending;
}
export function toggleFieldMark() {
  if(s.atCamp||$('search').hidden||busy())return false;
  const marks=s.fieldMarks||[],near=nearbyMark();
  if(near>=0)s.fieldMarks=marks.filter((_,i)=>i!==near);
  else if(marks.length<MAX_FIELD_MARKS)s.fieldMarks=[...marks,{x:s.x,y:s.y}];
  else return false;
  save();render();
  $('log').textContent=near>=0?'Мітку '+(near+1)+' прибрано. Залишилося '+s.fieldMarks.length+' / '+MAX_FIELD_MARKS+'.':'Мітку '+s.fieldMarks.length+' збережено. Повернутися до неї можна через «Мітки».';
  return true;
}
export function renderFieldNotes() {
  $('siteGuide').textContent=s.site?siteGuide(createSiteLayout(currentLocation().terrain,s.site.seed)):'Це збережена ділянка попередньої версії. Її знахідки та розташування залишилися на своїх місцях.';
  $('fieldNoteList').innerHTML=(s.fieldMarks||[]).map((p,i)=>`<div class="field-note-row"><span class="field-note-number">${i+1}</span><button class="secondary" data-marker-go="${i}">До мітки ${i+1}</button><button class="quiet" data-marker-remove="${i}" aria-label="Прибрати мітку ${i+1}">Прибрати</button></div>`).join('')||'<p class="camp-note">Підведи котушку до потрібного місця й натисни «Позначити місце». Мітка — твоя нотатка, вона не підтверджує наявність знахідки.</p>';
}
export function initFieldNotes() {
  $('markSpot').onclick=toggleFieldMark;
  $('openFieldNotes').onclick=()=>{if(s.atCamp||busy())return;$('fieldNotesStatus').textContent='';renderFieldNotes();$('fieldNotes').showModal();};
  $('fieldNoteList').addEventListener('click',e=>{
    if(!$('fieldNotes').open||s.atCamp||busy('fieldNotes'))return;
    const go=e.target.closest('[data-marker-go]'),remove=e.target.closest('[data-marker-remove]'),b=go||remove;
    if(!b)return;
    const index=Number(go?b.dataset.markerGo:b.dataset.markerRemove),mark=s.fieldMarks?.[index];if(!mark)return;
    if(go){s.x=mark.x;s.y=mark.y;$('fieldNotes').close();save();render();$('log').textContent='Котушка біля мітки '+(index+1)+'. Можна продовжувати пошук.';$('field').focus?.({preventScroll:true});}
    else{s.fieldMarks=s.fieldMarks.filter((_,i)=>i!==index);save();render();renderFieldNotes();$('fieldNotesStatus').textContent='Мітку '+(index+1)+' прибрано. Залишилося '+s.fieldMarks.length+' / '+MAX_FIELD_MARKS+'.';$('fieldNotesStatus').focus?.({preventScroll:true});}
  });
}
