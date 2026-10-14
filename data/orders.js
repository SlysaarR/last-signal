import { types } from './items.js?v=0.49.0';

// Stable IDs: saves contain the offer ID and bounded counters, never a reward.
export const fieldOrders = [
  {id:'kop10',group:'coins',name:'Десятки з обігу',text:'Чотири українські монети по 10 копійок. Рік і різновид — будь-які.',reward:24,needs:[{label:'10 копійок',count:4,value:10,unit:'коп'}]},
  {id:'kop25',group:'coins',name:'Чверть гривні',text:'Чотири українські монети по 25 копійок. Повторні роки теж підходять.',reward:28,needs:[{label:'25 копійок',count:4,value:25,unit:'коп'}]},
  {id:'hryvnia',group:'coins',name:'Гривні з різних кишень',text:'Чотири українські монети по 1 гривні. Можна одного року.',reward:28,needs:[{label:'1 гривня',count:4,value:1,unit:'гр'}]},
  {id:'everyday',group:'sets',name:'Сліди повсякдення',text:'Монети та побутові знахідки: ґудзики, пряжки, ключі й інші реліквії.',reward:30,needs:[{label:'Монети',count:3,kind:'coin'},{label:'Реліквії / побутові предмети',count:2,kind:'relic'}]},
  {id:'pockets',group:'sets',name:'Що губили дорогою',text:'Монети, побутові речі та одна прикраса для польового звіту.',reward:42,needs:[{label:'Монети',count:3,kind:'coin'},{label:'Реліквії / побутові предмети',count:2,kind:'relic'},{label:'Прикраси',count:1,kind:'jewel'}]},
  {id:'small_change',group:'sets',name:'Дрібні гроші',text:'По дві українські монети трьох номіналів. Роки — будь-які.',reward:36,needs:[{label:'10 копійок',count:2,value:10,unit:'коп'},{label:'25 копійок',count:2,value:25,unit:'коп'},{label:'50 копійок',count:2,value:50,unit:'коп'}]},
  {id:'preserved',group:'condition',name:'Час був лагідним',text:'П’ять монет, реліквій або прикрас зі станом від 70%.',reward:30,needs:[{label:'Знахідки зі станом 70%+',count:5,min:70}]},
  {id:'clear_coins',group:'condition',name:'Читкі монети',text:'Чотири монети зі станом від 80%. Номінал і рік — будь-які.',reward:32,needs:[{label:'Монети зі станом 80%+',count:4,kind:'coin',min:80}]},
  {id:'good_relics',group:'condition',name:'Речі з історією',text:'Чотири побутові реліквії зі станом від 60%: підійдуть і нові різновиди.',reward:32,needs:[{label:'Реліквії зі станом 60%+',count:4,kind:'relic',min:60}]},
];
const groups=['coins','sets','condition'].map(group=>fieldOrders.filter(order=>order.group===group));
export function orderOffers(completed=0) {
  // No RNG and no refresh on reload/travel: this must not affect buried loot.
  return groups.map(group=>group[completed%group.length]);
}
export function matchesOrderNeed(item,need) {
  const type=types[item.type];
  return !!type&&type.kind!=='trash'&&item.condition>=(need.min||0)
    &&(!need.kind||type.kind===need.kind)
    &&(need.value===undefined||type.country==='Україна'&&type.value===need.value&&type.unit?.startsWith(need.unit));
}
export function validOrders(value) {
  const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
  if(!object(value)||!Number.isSafeInteger(value.completed)||value.completed<0)return false;
  if(value.active===null)return true;
  if(!object(value.active))return false;
  const order=orderOffers(value.completed).find(order=>order.id===value.active.id);
  return !!order&&Array.isArray(value.active.counts)&&value.active.counts.length===order.needs.length
    &&value.active.counts.every((count,i)=>Number.isSafeInteger(count)&&count>=0&&count<=order.needs[i].count);
}
