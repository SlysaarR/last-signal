import { goals, emptyProgress } from '../data/expeditions.js?v=0.42.0';
import { types } from '../data/items.js?v=0.42.0';
import { s, save } from './storage.js?v=0.42.0';
import { recordOrderFind } from './orders.js?v=0.42.0';
export function progress(){return s.progress||emptyProgress();}
function writable(){return s.progress||(s.progress=emptyProgress());}
export function goalMetrics(){
 const p=progress(),items=s.collection.map(id=>({id,...types[id]}));
 return {album:items.length,finds:p.finds,places:p.visited.length,trips:p.trips,
 denoms:new Set(items.filter(t=>t.country==='Україна').map(t=>t.denom)).size,
 rare:items.filter(t=>t.rarity>=2).length,fine:items.filter(t=>s.best[t.id]>=90).length,
 perfect:items.filter(t=>s.best[t.id]===100).length};
}
export function goalValue(goal){return goalMetrics()[goal.metric]||0;}
export function claimGoal(id){
 const goal=goals.find(g=>g.id===id);
 if(!goal||!s.atCamp||s.pending||progress().claimed.includes(id)||goalValue(goal)<goal.target)return false;
 writable().claimed.push(id);s.coins+=goal.reward;save();return true;
}
export function startLeg(travel,condition){
 const p=writable();
 if(!p.visited.includes(s.location)&&s.location>=0)p.visited.push(s.location);
 p.active={day:s.day,location:s.location,condition,emergency:!!s.emergency,found:0,kept:0,digs:0,empty:0,newTypes:0,value:0,travel,seen:[]};
}
export function endLeg(){
 const p=s.progress;if(!p?.active)return;
 if(p.active.found>=3)p.trips++;
 p.history.unshift({...p.active,seen:[...p.active.seen]});p.history=p.history.slice(0,12);p.active=null;
}
export function recordDig(hit){const p=writable();p.digs++;if(!hit)p.empty++;if(p.active){p.active.digs++;if(!hit)p.active.empty++;}}
export function recordFind(item,kept){
 const p=writable();p.finds++;if(kept)p.kept++;
 if(p.active){const a=p.active;a.found++;if(kept){a.kept++;}
 if(!a.seen.includes(item.type)){a.seen.push(item.type);if(!s.collection.includes(item.type)&&types[item.type].kind!=='trash')a.newTypes++;}}
 return recordOrderFind(item,kept);
}
