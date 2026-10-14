import { activeSite } from '../data/atlas.js?v=0.50.0';
import { collectorMetrics } from '../data/career.js?v=0.50.0';
import { goals, emptyProgress } from '../data/expeditions.js?v=0.50.0';
import { types } from '../data/items.js?v=0.50.0';
import { s, save } from './storage.js?v=0.50.0';
import { recordOrderFind } from './orders.js?v=0.50.0';
export function progress(){return s.progress||emptyProgress();}
function writable(){return s.progress||(s.progress=emptyProgress());}
export function goalMetrics(){
 return collectorMetrics(s);
}
export function goalValue(goal){return goalMetrics()[goal.metric]||0;}
export function claimGoal(id){
 const goal=goals.find(g=>g.id===id);
 if(!goal||!s.atCamp||s.pending||progress().claimed.includes(id)||goalValue(goal)<goal.target)return false;
 writable().claimed.push(id);s.coins+=goal.reward;save();return true;
}
export function startLeg(travel,condition,environment=null){
 const p=writable();
 if(!p.visited.includes(s.location)&&s.location>=0)p.visited.push(s.location);
 p.active={day:s.day,location:s.location,condition,emergency:!!s.emergency,found:0,kept:0,digs:0,empty:0,newTypes:0,value:0,travel,seen:[]};
 if(environment)p.active.environment={...environment};
 const site=activeSite(s);if(site)p.active.siteId=site.id;
 if(site?.visits>1&&s.fieldMarks?.length)p.active.returnMarks=s.fieldMarks.map(({x,y})=>({x,y}));
}
export function endLeg(){
 const p=s.progress;if(!p?.active)return;
 const site=activeSite(s);
 if(site){site.found+=p.active.found;p.active.qualifiedSite=false;if(!site.productive&&site.found>=3){site.productive=true;p.active.qualifiedSite=true;p.trips++;}}
 else if(p.active.found>=3)p.trips++;
 const history={...p.active,seen:[...p.active.seen]};delete history.returnMarks;
 p.history.unshift(history);p.history=p.history.slice(0,12);p.active=null;
}
export function recordDig(hit){const p=writable();p.digs++;if(!hit)p.empty++;if(p.active){p.active.digs++;if(!hit)p.active.empty++;}}
export function recordFind(item,kept){
 const p=writable();p.finds++;if(kept)p.kept++;
 if(p.active){const a=p.active;a.found++;if(kept){a.kept++;}
 if(!a.seen.includes(item.type)){a.seen.push(item.type);if(!s.collection.includes(item.type)&&types[item.type].kind!=='trash')a.newTypes++;}}
 return recordOrderFind(item,kept);
}
