import { validEnvironment, groundTypes } from './environment.js?v=0.51.0';
// Directions choose a landscape pool, never its luck or the items under the soil.
export const routes = [
 {id:'wander',name:'Куди виведе дорога',cost:25,need:0,icon:'↗',text:'Усі 8 місцевостей. Найдешевша дорога, найбільше невідомого.',pool:[0,1,2,3,4,5,6,7]},
 {id:'rural',name:'За місто',cost:35,need:6,icon:'♧',text:'Поле, старий сад або лісова галявина. Ранні монети та побутові речі.',pool:[1,5,6]},
 {id:'water',name:'Ближче до води',cost:35,need:12,icon:'≈',text:'Пляж або річковий берег. Сучасні монети, прикраси й чимало сміття.',pool:[2,7]},
 {id:'distant',name:'Далекі дороги',cost:50,need:24,icon:'◇',text:'Поле, ярмарок або торговий шлях. Дорога дорожча, результат непевний.',pool:[1,3,4]}
];
export const conditions = [
 {name:'Звичайний ґрунт',factor:1,text:'Звична витрата енергії на розкопку.'},
 {name:'М’який ґрунт',factor:.9,text:'Розкопка забирає на 10% менше енергії.'},
 {name:'Щільний ґрунт',factor:1.2,text:'Розкопка забирає на 20% більше енергії.'}
];
export const goals = [
 {id:'album3',name:'Перші сторінки',text:'Збережи 3 різні позиції в альбомі.',metric:'album',target:3,reward:25},
 {id:'find30',name:'Польова практика',text:'Оглянь 30 знахідок після оновлення.',metric:'finds',target:30,reward:35},
 {id:'album10',name:'Колекція набирає форму',text:'Збери 10 різних позицій.',metric:'album',target:10,reward:50},
 {id:'visit5',name:'Знайомі стежки',text:'Відвідай 5 різних місцевостей.',metric:'places',target:5,reward:45},
 {id:'coins6',name:'Шість номіналів',text:'Збережи монети 6 різних номіналів.',metric:'denoms',target:6,reward:60},
 {id:'rare3',name:'Непрості знахідки',text:'Збери 3 рідкісні або виняткові позиції.',metric:'rare',target:3,reward:75},
 {id:'trip20',name:'Повертаюся знову',text:'Обстеж 20 різних ділянок: оглянь хоча б 3 знахідки на кожній, за один або кілька виїздів.',metric:'trips',target:20,reward:70},
 {id:'fine10',name:'Вибагливий колекціонер',text:'Збережи 10 позицій зі станом 90 або вище.',metric:'fine',target:10,reward:100},
 {id:'album40',name:'Власний маленький музей',text:'Збери 40 різних позицій.',metric:'album',target:40,reward:120},
 {id:'visit8',name:'Усі горизонти',text:'Відвідай усі 8 місцевостей.',metric:'places',target:8,reward:90},
 {id:'perfect',name:'Без жодної подряпини',text:'Збережи хоча б одну позицію зі станом рівно 100.',metric:'perfect',target:1,reward:140},
 {id:'album80',name:'Тривала історія',text:'Збери 80 різних позицій.',metric:'album',target:80,reward:200}
];
export function chosenRoute(state) { return routes.find(r=>r.id===state.route && state.collection.length>=r.need)||routes[0]; }
export function emptyProgress(){return {finds:0,kept:0,digs:0,empty:0,trips:0,visited:[],claimed:[],history:[],active:null};}
export function validProgress(p,locationCount){
 const obj=x=>x && typeof x==='object' && !Array.isArray(x);
 const int=x=>Number.isSafeInteger(x)&&x>=0;
 const num=x=>Number.isFinite(x)&&x>=0;
 const loc=x=>Number.isInteger(x)&&x>=-1&&x<locationCount;
 const leg=x=>obj(x)&&(x.environment===undefined||validEnvironment(x.environment)&&groundTypes[x.environment.ground].condition===x.condition)&&int(x.day)&&loc(x.location)&&Number.isInteger(x.condition)&&x.condition>=0&&x.condition<conditions.length&&typeof x.emergency==='boolean'&&['found','kept','digs','empty','newTypes'].every(k=>int(x[k]))&&num(x.value)&&num(x.travel)&&Array.isArray(x.seen)&&x.seen.length<=500&&x.seen.every(int)&&new Set(x.seen).size===x.seen.length&&(x.siteId===undefined||int(x.siteId)&&x.siteId>0)&&(x.qualifiedSite===undefined||typeof x.qualifiedSite==='boolean')&&(x.returnMarks===undefined||int(x.siteId)&&x.siteId>0&&Array.isArray(x.returnMarks)&&x.returnMarks.length<=8&&x.returnMarks.every(p=>obj(p)&&Number.isFinite(p.x)&&p.x>=0&&p.x<=1&&Number.isFinite(p.y)&&p.y>=0&&p.y<=1)&&new Set(x.returnMarks.map(p=>p.x+':'+p.y)).size===x.returnMarks.length);
 return obj(p)&&['finds','kept','digs','empty','trips'].every(k=>int(p[k]))&&Array.isArray(p.visited)&&p.visited.length<=locationCount&&p.visited.every(x=>loc(x)&&x>=0)&&new Set(p.visited).size===p.visited.length&&Array.isArray(p.claimed)&&p.claimed.every(x=>goals.some(g=>g.id===x))&&new Set(p.claimed).size===p.claimed.length&&Array.isArray(p.history)&&p.history.length<=12&&p.history.every(leg)&&(p.active===null||leg(p.active));
}
