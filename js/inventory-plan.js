import { types } from '../data/items.js?v=0.46.0';
import { priceFor } from './rules.js?v=0.46.0';
import { s } from './storage.js?v=0.46.0';
const kindOrder={coin:0,jewel:1,relic:2,trash:3};
const typeOrder=[];
types.map((type,id)=>({type,id})).sort((a,b)=>kindOrder[a.type.kind]-kindOrder[b.type.kind]||a.type.name.localeCompare(b.type.name,'uk')||a.id-b.id).forEach((entry,rank)=>{typeOrder[entry.id]=rank;});

// Presentation records retain the original array index and object identity.
// Sorting these records never reorders the save or redirects an item action.
export function inventoryEntries(state=s) {
  const entries=['bag','stash'].flatMap(place=>state[place].map((item,index)=>({
    item,place,index,key:place+':'+index,type:item.type,condition:item.condition,
    value:priceFor(item.type,item.condition),old:state.best[item.type],
  })));
  const winners=new Map();
  for(const entry of entries) {
    if(types[entry.type].kind==='trash')continue;
    const previous=winners.get(entry.type);
    // One copy wins a tie, consistently: bag first, then original storage order.
    if(!previous||entry.condition>previous.condition)winners.set(entry.type,entry);
  }
  for(const entry of entries) {
    const winner=winners.get(entry.type);
    entry.status=types[entry.type].kind==='trash'?'scrap'
      :entry===winner&&(entry.old===undefined||entry.condition>entry.old)?(entry.old===undefined?'new':'upgrade'):'duplicate';
    entry.keeper=winner?{place:winner.place,condition:winner.condition}:null;
  }
  return entries;
}
export function inventorySummary(entries) {
  const counts={new:0,upgrade:0,duplicate:0,scrap:0,total:0};
  if(entries){
    counts.total=entries.length;
    for(const entry of entries)counts[entry.status]++;
    return counts;
  }
  // Camp needs counts only: retain one condition per catalogue type, with no
  // price calculations or presentation records for every item in a large stash.
  const bestHeld=new Map();
  for(const list of [s.bag,s.stash])for(const item of list){
    counts.total++;
    if(types[item.type].kind==='trash'){counts.scrap++;continue;}
    counts.duplicate++;
    if(!bestHeld.has(item.type)||item.condition>bestHeld.get(item.type))bestHeld.set(item.type,item.condition);
  }
  for(const [type,condition] of bestHeld){
    if(s.best[type]===undefined){counts.new++;counts.duplicate--;}
    else if(condition>s.best[type]){counts.upgrade++;counts.duplicate--;}
  }
  return counts;
}
export function sortedInventory(entries,sort='album',filter='all') {
  const priorities={new:0,upgrade:1,duplicate:2,scrap:3};
  return entries.filter(e=>filter==='all'||filter==='album'&&['new','upgrade'].includes(e.status)||e.status===filter).sort((a,b)=>{
    const order=sort==='condition'?b.condition-a.condition:sort==='price'?b.value-a.value
      :sort==='type'?(typeOrder[a.type]-typeOrder[b.type])
      :sort==='album'?(priorities[a.status]-priorities[b.status]||b.condition-a.condition):0;
    return order||a.index-b.index;
  });
}
export function bulkPlan(mode,includeScrap=false) {
  return inventoryEntries().filter(e=>mode==='album'?['new','upgrade'].includes(e.status):e.status==='duplicate'||includeScrap&&e.status==='scrap');
}
export function samePlan(before,after) {
  return before.length===after.length&&before.every((e,i)=>{
    const next=after[i];return e.item===next.item&&e.key===next.key&&e.type===next.type&&e.condition===next.condition&&e.value===next.value&&e.old===next.old&&e.status===next.status;
  });
}
