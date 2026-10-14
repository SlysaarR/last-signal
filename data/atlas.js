import { validEnvironment, groundTypes, environmentKey } from './environment.js?v=0.49.0';
import { routes, chosenRoute } from './expeditions.js?v=0.49.0';
import { locations, legacyLocation } from './locations.js?v=0.49.0';
export const MAX_SITES = 6;
export const activeSite = state => state.atlas?.sites.find(site => site.id === state.atlas.activeId) || null;
export const selectedSite = state => state.atlas?.sites.find(site => site.id === state.atlas.selectedId) || null;
export const siteRoute = site => routes.find(route => route.id === site.route) || routes[0];
export const siteCount = state => state.atlas?.sites.length ?? (state.atCamp ? 0 : 1);
export const canScout = state => siteCount(state) < MAX_SITES && (state.atlas?.nextId || 1) < Number.MAX_SAFE_INTEGER;
export const siteAccessible = (state,site) => state.collection.length >= siteRoute(site).need;
const names = [
 ['У розвилки','Дорога за посадкою','Край сільської дороги'],
 ['Поле біля старої межі','Поле за хутором','Дальня рілля'],
 ['Піщаний спуск','Пляж за поворотом','Смуга біля причалу'],
 ['Старий ярмарковий майдан','Місце торгових рядів','Площа біля переправи'],
 ['Забута купецька дорога','Шлях за пагорбом','Стара дорога до переправи'],
 ['Галявина за посадкою','Лісова стежка','Тиха галявина'],
 ['Яблуневий сад','Сад біля старої садиби','Край покинутого саду'],
 ['Берег за вербами','Річковий вигин','Стежка до річки']
];
export function siteName(site) {
  if(site.emergency)return 'Бідне узбіччя';
  return names[site.location]?.[(site.id-1)%3] || legacyLocation.name;
}
export function siteLocation(site) { return site.emergency ? {...locations[0],name:'Бідне узбіччя'} : locations[site.location] || legacyLocation; }
export function routeForCurrent(state) {
  if(state.emergency)return routes[0];
  const route=chosenRoute(state);
  return route.pool.includes(state.location)?route:routes[0];
}
// Metadata has no stored copy of an active field. Its authoritative state stays
// in the existing top-level properties so excavation/save compatibility is kept.
export function validAtlas(a,state,validField) {
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
  const int=(v,min=0)=>Number.isSafeInteger(v)&&v>=min;
  if(!obj(a)||a.version!==1||!int(a.nextId,1)||!Array.isArray(a.sites)||a.sites.length>MAX_SITES)return false;
  const ids=new Set();
  for(const site of a.sites) {
    if(!obj(site)||!int(site.id,1)||site.id>=a.nextId||ids.has(site.id))return false;ids.add(site.id);
    const route=routes.find(r=>r.id===site.route);
    if(!route||!Number.isInteger(site.location)||site.location < -1||site.location>=locations.length||typeof site.emergency!=='boolean')return false;
    if(site.location===-1?site.route!=='wander':!route.pool.includes(site.location))return false;
    if(site.emergency&&(site.location!==0||site.route!=='wander'))return false;
    if(!int(site.createdDay,1)||!int(site.lastDay,site.createdDay)||site.lastDay>state.day||!int(site.visits,1)||!int(site.found)||typeof site.productive!=='boolean'||site.productive&&site.found<3)return false;
    if(!Number.isInteger(site.condition)||site.condition<0||site.condition>2)return false;
    if(site.environment!==undefined&&(!validEnvironment(site.environment)||groundTypes[site.environment.ground].condition!==site.condition))return false;
    if(site.id===a.activeId){
      if(site.field!==null||state.atCamp||site.location!==state.location||site.emergency!==!!state.emergency)return false;
      if(state.progress?.active && state.progress.active.condition!==site.condition)return false;
      if(environmentKey(state.progress?.active?.environment)!==environmentKey(site.environment))return false;
    } else if(!validField(site.field))return false;
  }
  if(a.selectedId!==null&&!ids.has(a.selectedId))return false;
  if(state.atCamp ? a.activeId!==null : !ids.has(a.activeId))return false;
  return true;
}
