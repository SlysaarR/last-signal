import { types } from './items.js?v=0.54.0';
import { goals } from './expeditions.js?v=0.54.0';

const small=['1 копійка','2 копійки','5 копійок','10 копійок','25 копійок','50 копійок'];
const large=['1 гривня','2 гривні','5 гривень','10 гривень'];
const slot=(label,match,min=0)=>({label,min,ids:types.flatMap((t,id)=>t.country==='Україна'&&match(t)?[id]:[])});
// Each slot accepts alternatives already in the catalogue, never invented years.
export const albumSets=[
 {id:'change',name:'Розмінна шістка',text:'По одній монеті кожного копійчаного номіналу. Рік і різновид — на твій вибір.',slots:small.map(d=>slot(d+' · будь-який рік',t=>t.denom===d))},
 {id:'hryvnias',name:'Гривнева четвірка',text:'Чотири гривневі номінали в одному альбомі.',slots:large.map(d=>slot(d+' · будь-який рік',t=>t.denom===d))},
 {id:'year1992',name:'Сторінка 1992 року',text:'П’ять номіналів 1992 року, наявних у каталозі гри. Достатньо одного різновиду кожного.',slots:small.filter(d=>d!=='2 копійки').map(d=>slot(d+' · 1992',t=>t.denom===d&&t.year===1992))},
 {id:'timeline',name:'П’ять дат',text:'Монети різних років: кожна дата — окрема частина набору.',slots:[1992,1996,2003,2010,2018].map(y=>slot(y+' рік · будь-який номінал',t=>t.year===y))},
 {id:'modern',name:'Гривні нового формату',text:'Чотири конкретні поєднання номіналу та року.',slots:large.map((d,i)=>slot(d+' · '+[2018,2018,2019,2020][i],t=>t.denom===d&&t.year===[2018,2018,2019,2020][i]))},
 {id:'tenYears',name:'Десятка крізь роки',text:'П’ять річних випусків 10 копійок. Різновиди одного року взаємозамінні.',slots:[1992,1994,1996,2001,2003].map(y=>slot('10 копійок · '+y,t=>t.denom==='10 копійок'&&t.year===y))},
 {id:'quarterYears',name:'Чверть гривні',text:'П’ять річних випусків 25 копійок у твоєму альбомі.',slots:[1992,1994,1996,2001,2003].map(y=>slot('25 копійок · '+y,t=>t.denom==='25 копійок'&&t.year===y))},
 {id:'fineChange',name:'Добре збережений розмін',text:'Шість копійчаних номіналів зі станом щонайменше 90. Рік довільний.',slots:small.map(d=>slot(d+' · стан 90+',t=>t.denom===d,90))}
];
const goal=id=>({goal:id});
const task=(metric,target,label,hint)=>({metric,target,label,hint});
export const chapters=[
 {id:'first',name:'Перший маршрут',rank:'Шукач',mark:'I',reward:35,text:'Навчися доводити сигнал до знахідки й почни власний альбом.',needs:[goal('album3'),goal('find30')]},
 {id:'paths',name:'Знайомі стежки',rank:'Слідопит',mark:'II',reward:50,text:'Розширюй географію пошуку й виконай перше польове замовлення.',needs:[goal('album10'),goal('visit5'),task('orders',1,'Виконати одне польове замовлення','Візьми замовлення в щоденнику, забери потрібні нові знахідки та отримай нагороду в таборі.')]},
 {id:'signal',name:'Повернення за сигналом',rank:'Знавець сигналів',mark:'III',reward:65,text:'Залиши мітку біля сигналу, повернися в інший виїзд і заверши пошук.',needs:[goal('coins6'),goal('rare3'),task('returns',1,'Забрати знахідку біля мітки після повернення','Постав мітку біля сигналу до виходу з ділянки. Повернися й забери предмет поруч із нею. Рахується з 0.47; нова мітка після прибуття не підходить.')]},
 {id:'explorer',name:'За межами знайомого',rank:'Дослідник',mark:'IV',reward:80,text:'Відвідай усі місцевості, попрацюй із глибокими сигналами й заверши перші набори.',needs:[goal('trip20'),goal('visit8'),task('deep',3,'Забрати три глибокі знахідки','Забери предмети з найглибшого шару. Рахується з 0.47; точну глибину цілі до розкопки карта не показує.'),task('sets',2,'Завершити два тематичні набори','Набори відкриваються з альбому. Зараховуються лише предмети, які ти додав до колекції.')]},
 {id:'collector',name:'Збирач історій',rank:'Колекціонер',mark:'V',reward:110,text:'Упорядкуй колекцію та підбери краще збережені екземпляри.',needs:[goal('fine10'),goal('album40'),task('sets',4,'Завершити чотири тематичні набори','Одна монета може входити до кількох наборів. Дублікати не заповнюють нових позицій.')]},
 {id:'keeper',name:'Власний музей',rank:'Хранитель колекції',mark:'VI',reward:160,text:'Заверши основну кар’єру великою колекцією, наборами й бездоганною знахідкою.',needs:[goal('perfect'),goal('album80'),task('sets',6,'Завершити шість тематичних наборів','Обери будь-які шість із восьми наборів. Решту можна продовжити після фіналу кар’єри.')]}
];
export function collectorMetrics(state){
 const p=state.progress||{},items=state.collection.map(id=>({id,...types[id]}));
 return {album:items.length,finds:p.finds||0,places:p.visited?.length||0,trips:p.trips||0,
  denoms:new Set(items.filter(t=>t.country==='Україна').map(t=>t.denom)).size,
  rare:items.filter(t=>t.rarity>=2).length,fine:items.filter(t=>state.best[t.id]>=90).length,perfect:items.filter(t=>state.best[t.id]===100).length};
}
export function setProgress(set,state,owned=new Set(state.collection)){
 const slots=set.slots.map(row=>({...row,done:row.ids.some(id=>owned.has(id)&&state.best[id]>=row.min)}));
 return {...set,slots,value:slots.filter(row=>row.done).length,total:slots.length,done:slots.every(row=>row.done)};
}
export function careerView(state){
 const owned=new Set(state.collection),sets=albumSets.map(set=>setProgress(set,state,owned));
 const metrics={...collectorMetrics(state),sets:sets.filter(set=>set.done).length,orders:state.orders?.completed||0,deep:state.career?.field.deep||0,returns:state.career?.field.returns||0};
 const claimed=state.career?.claimed||[];
 const stages=chapters.map((chapter,index)=>{
  const needs=chapter.needs.map(need=>{
   const g=need.goal&&goals.find(g=>g.id===need.goal),target=g?.target||need.target;
   const value=Math.min(target,g&&state.progress?.claimed.includes(g.id)?target:metrics[g?.metric||need.metric]||0);
   return {...need,label:g?.name||need.label,hint:g?.text||need.hint,target,value,done:value>=target};
  });
  return {...chapter,index,needs,done:claimed.includes(chapter.id),unlocked:index===claimed.length,ready:needs.every(n=>n.done)};
 });
 return {sets,metrics,stages,current:stages[claimed.length]||null,rank:claimed.length?chapters[claimed.length-1].rank:'Новачок',completed:claimed.length};
}
export const validFocus=value=>value===null||value==='order'||typeof value==='string'&&(value.startsWith('set:')&&albumSets.some(s=>s.id===value.slice(4))||value.startsWith('goal:')&&goals.some(g=>g.id===value.slice(5)));
export function validCareer(c){
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),int=(v,max)=>Number.isInteger(v)&&v>=0&&v<=max;
 return obj(c)&&c.version===1&&Array.isArray(c.claimed)&&c.claimed.length<=chapters.length&&c.claimed.every((id,i)=>id===chapters[i].id)&&validFocus(c.focus)&&obj(c.field)&&int(c.field.deep,3)&&int(c.field.returns,1);
}
