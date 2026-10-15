// Deterministic scenarios, not player measurements. Uses the current runtime
// generator, weather, prices, capacities, shovels and collector goals.
const {newRun,root,assert}=require('./harness.cjs');
const fs=require('node:fs');
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const percentile=(xs,p)=>[...xs].sort((a,b)=>a-b)[Math.floor((xs.length-1)*p)];
(async()=>{
 const rows=[];
 for(let sample=0;sample<12;sample++){
  const r=await newRun(),m=n=>r.modules.get(root+'/js/'+n+'.js').namespace,d=n=>r.modules.get(root+'/data/'+n+'.js').namespace,s=m('storage').s;
  const seed=55001+sample*7919,skill=rng(seed^0x5a55a5),world=m('world'),rules=m('rules'),progress=m('progression'),gear=d('gear'),{types}=d('items'),route=d('expeditions').routes[0];
  r.context.Math.random=rng(seed);let firstUpgrade=null,allTier2=null,freeTrips=0,lossTrips=0,misses=0,sold=0,travel=0;
  for(let trip=1;trip<=120;trip++){
   const emergency=s.coins<25,before=s.coins,cost=emergency?0:route.cost,environment=d('environment').forecastEnvironment(s,route,emergency);
   if(emergency)freeTrips++;s.coins-=cost;travel+=cost;s.energy=rules.maxEnergy();s.day++;s.atCamp=false;s.emergency=emergency;s.location=emergency?0:world.rollLocation(route);
   r.context.Math.random();progress.startLeg(cost,d('environment').groundTypes[environment.ground].condition,environment);world.generate({persist:false});
   const finds=[];
   // Geometric strip order does not use hidden value/type/depth to choose targets.
   const targets=[...s.objects].sort((a,b)=>Math.floor(a.y*8)-Math.floor(b.y*8)||a.x-b.x);
   for(const target of targets){
    if(skill()>(.88+(s.level-1)*.01))continue;
    const hit=skill()<(s.level>=3?.95:.80),dig=rules.digCost(hit?d('balance').depthLevels[target.depth].cost:10);
    if(s.energy<dig)continue;
    s.energy=Math.round((s.energy-dig)*10)/10;progress.recordDig(hit);
    if(!hit){misses++;continue;}target.dug=true;finds.push({type:target.type,condition:target.condition});
   }
   // Only recovered finds are compared for the available bag slots.
   const priority=item=>types[item.type].kind!=='trash'&&(!s.collection.includes(item.type)||item.condition>s.best[item.type]);
   finds.sort((a,b)=>Number(priority(b))-Number(priority(a))||rules.priceFor(b.type,b.condition)-rules.priceFor(a.type,a.condition));
   const kept=finds.slice(0,rules.bagCapacity());for(const [i,item]of finds.entries())progress.recordFind(item,i<kept.length);
   progress.endLeg();s.atCamp=true;
   for(const item of kept){
    if(priority(item)){
     if(s.collection.includes(item.type)){const value=rules.priceFor(item.type,s.best[item.type]);sold+=value;s.coins+=value;}else s.collection.push(item.type);
     s.best[item.type]=item.condition;
    }else{const value=rules.priceFor(item.type,item.condition);sold+=value;s.coins+=value;}
   }
   const metrics=progress.goalMetrics();
   for(const goal of d('expeditions').goals)if(!s.progress.claimed.includes(goal.id)&&(metrics[goal.metric]||0)>=goal.target){s.progress.claimed.push(goal.id);s.coins+=goal.reward;}
   if(s.coins<before)lossTrips++;
   for(;;){
    const next=Object.entries(gear.gearKeys).filter(([,key])=>s[key]<10).map(([kind,key])=>({kind,key,cost:rules.upgradeCost(kind)})).sort((a,b)=>a.cost-b.cost)[0];
    if(!next||s.coins<next.cost+route.cost)break;
    s.coins-=next.cost;s[next.key]++;s.gearCredit[next.kind]=0;if(firstUpgrade===null)firstUpgrade=trip;
   }
   if(allTier2===null&&Math.min(s.level,s.shovel,s.backpack)>=2)allTier2=trip;
   assert(s.coins>=0&&s.energy>=0&&Number.isFinite(s.coins));
  }
  rows.push({seed,trips:120,firstUpgrade,allTier2,freeTrips,lossTrips,misses,album:s.collection.length,gear:[s.level,s.shovel,s.backpack],coins:s.coins,sold,travel});
 }
 const out={version:'0.55.0',scope:'Early economy: 12 seeded scenarios, 120 trips each',assumptions:[
  'Actual current world generation, site distribution and weather. Only the cheapest route; no paid food.',
  'Free rest before each trip. New sites each trip; old sites explicitly expendable, no revisit loot regeneration simulated.',
  '88–97% signal coverage and 80% centring success before detector tier 3, then 95%, are unmeasured assumptions.',
  'Geometric strip order; one attempt per target. Values considered only after excavation. Best album copies kept, duplicates sold.',
  'Collector goals claimed once; no career/order payouts included. Cheapest next upgrade purchased with one fare reserved.',
  'This does not measure real play time, complete the career or validate a human difficulty curve.'
 ],summary:{scenarios:rows.length,withUpgrade:rows.filter(x=>x.firstUpgrade!==null).length,firstUpgradeTrips:{p10:percentile(rows.map(x=>x.firstUpgrade??121),.1),median:percentile(rows.map(x=>x.firstUpgrade??121),.5),p90:percentile(rows.map(x=>x.firstUpgrade??121),.9)},allTier2Median:percentile(rows.map(x=>x.allTier2??121),.5),medianAlbum:percentile(rows.map(x=>x.album),.5),medianFreeTrips:percentile(rows.map(x=>x.freeTrips),.5),medianLossTrips:percentile(rows.map(x=>x.lossTrips),.5)},rows};
 const text=JSON.stringify(out,null,2)+'\n';if(process.argv[2])fs.writeFileSync(process.argv[2],text);console.log(JSON.stringify(out.summary));
})().catch(e=>{console.error(e);process.exit(1)});
