import { chapters, careerView, validFocus } from '../data/career.js?v=0.47.0';
import { goals } from '../data/expeditions.js?v=0.47.0';
import { activeOrder, orderReady } from './orders.js?v=0.47.0';
import { s, save } from './storage.js?v=0.47.0';
function writable(){return s.career||(s.career={version:1,claimed:[],focus:null,field:{deep:0,returns:0}});}
let cacheKey='',cache;
export function careerSnapshot(){
 const p=s.progress;
 const key=JSON.stringify([s.collection,s.best,p?.finds,p?.visited,p?.trips,p?.claimed,s.orders?.completed,s.career]);
 if(key!==cacheKey){cacheKey=key;cache=careerView(s);}return cache;
}
export function claimChapter(id){
 const chapter=careerSnapshot().current;
 if(!s.atCamp||s.pending||!chapter||chapter.id!==id||!chapter.ready||s.coins+chapter.reward>Number.MAX_SAFE_INTEGER)return false;
 writable().claimed.push(id);s.coins+=chapter.reward;save();return true;
}
export function trackFocus(focus){
 if(s.pending||!validFocus(focus)||focus==='order'&&!activeOrder())return false;
 writable().focus=focus;save();return true;
}
// Captured at excavation and saved with pending; counted only when packing keeps it.
export function findChallenge(target){
 const deep=target.depth===2;
 const returned=!!s.progress?.active?.returnMarks?.some(mark=>Math.hypot(target.x-mark.x,target.y-mark.y)<=.04);
 return deep||returned?{deep,returned}:null;
}
export function recordCareerFind(pending,kept){
 if(s.atCamp||!kept||!pending?.revealed||!pending.careerFind)return;
 const field=writable().field;
 if(pending.careerFind.deep)field.deep=Math.min(3,field.deep+1);
 if(pending.careerFind.returned)field.returns=1;
}
export function mainObjective(){
 const view=careerSnapshot(),focus=s.career?.focus;
 if(focus?.startsWith('set:')){
  const set=view.sets.find(set=>set.id===focus.slice(4)),next=set.slots.find(row=>!row.done);
  return {kind:'Набір альбому',title:set.name,text:next?next.label:'Набір завершено',value:set.value,total:set.total,screen:'collection',setId:set.id};
 }
 if(focus==='order'&&activeOrder()){
  const order=activeOrder(),value=s.orders.active.counts.reduce((sum,n)=>sum+n,0),total=order.needs.reduce((sum,n)=>sum+n.count,0);
  return {kind:'Польове замовлення',title:order.name,text:orderReady()?'Нагорода чекає в таборі':order.needs.map((n,i)=>n.label+': '+s.orders.active.counts[i]+'/'+n.count).join(' · '),value,total,screen:'journal'};
 }
 if(focus?.startsWith('goal:')){
  const goal=goals.find(g=>g.id===focus.slice(5)),value=Math.min(goal.target,view.metrics[goal.metric]);
  return {kind:'Ціль колекціонера',title:goal.name,text:s.progress?.claimed.includes(goal.id)?'Нагороду отримано':value===goal.target?'Нагорода чекає в таборі':goal.text,value,total:goal.target,screen:'journal'};
 }
 const chapter=view.current;
 if(chapter){const next=chapter.needs.find(n=>!n.done);return {kind:'Кар’єра · етап '+(chapter.index+1)+' / '+chapters.length,title:chapter.name,text:next?next.label+' · '+next.value+' / '+next.target:'Етап виконано — отримай відзнаку в таборі',value:chapter.needs.filter(n=>n.done).length,total:chapter.needs.length,screen:'journal'};}
 const next=view.sets.filter(set=>!set.done).sort((a,b)=>b.value/b.total-a.value/a.total)[0];
 return next?{kind:'Кар’єру завершено · продовжуємо альбом',title:next.name,text:'Залишилося позицій: '+(next.total-next.value),value:next.value,total:next.total,screen:'collection',setId:next.id}:{kind:'Хранитель колекції',title:'Усі етапи й набори завершено',text:'Можна покращувати стан альбому та виконувати польові замовлення.',value:1,total:1,screen:'journal'};
}
