// Seeded ECONOMIC SCENARIOS, not measured player behaviour or guaranteed income.
// Uses game prices/loot weights/gear/soil/routes/rewards. No value is used to
// choose a target before excavation; only already-found items can be ranked.
const {newRun,root}=require('./harness.cjs');
const fs=require('node:fs');
const rngFor=seed=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const percentile=(a,p)=>[...a].sort((x,y)=>x-y)[Math.floor((a.length-1)*p)];
(async()=>{
  const r=await newRun(),mod=f=>r.modules.get(root+'/js/'+f+'.js').namespace;
  const data=f=>r.modules.get(root+'/data/'+f+'.js').namespace;
  const {types}=data('items'),{routes,conditions,goals}=data('expeditions'),{locations}=data('locations');
  const {signalRanges,depthLevels,foods}=data('balance'),gear=data('gear'),world=mod('world'),rules=mod('rules');
  const prices=types.map((t,id)=>Array.from({length:101},(_,c)=>rules.priceFor(id,c)));
  const kinds=['trash','coin','jewel','relic'],pools=new Map();
  const emergency={...locations[0],kinds:[.85,.12,.025,.005],boost:[1,.6,.2,.05]};
  function pickType(kind,profile,key,random) {
    const id=key+':'+kind;
    if(!pools.has(id)) {
      let total=0;const entries=[];
      types.forEach((t,i)=>{if(t.kind===kind&&!t.legacy){total+=world.itemWeight(t,i,profile);entries.push([total,i]);}});
      pools.set(id,{total,entries});
    }
    const {total,entries}=pools.get(id),value=random()*total;
    return entries.find(([bound])=>value<bound)[1];
  }
  function run(seed,routeId,improveAlbum) {
    const random=rngFor(seed),state={level:1,shovel:1,backpack:1,gearCredit:{},coins:0};
    const best=new Map(),visited=new Set(),claimed=new Set(),milestones={};
    let finds=0,trips=0,emergencyTrips=0,losses=0,misses=0,spentFood=0,earned=0,spentTravel=0;
    // Supplies persist between trips, just as purchased food does in the game.
    const food=[0,0,0];let completed=null;
    for(let trip=1;trip<=4000;trip++) {
      const requested=routes.find(x=>x.id===routeId),route=best.size>=requested.need?requested:routes[0];
      const free=state.coins<25,cost=free?0:state.coins>=route.cost?route.cost:25;
      const actualRoute=cost===25?routes[0]:route;
      state.coins-=cost;spentTravel+=cost;const before=state.coins+cost;
      // Food is optional. Reserve the next fare before replenishing 20%+30%.
      for(const i of [2,1])if(!food[i]&&state.coins>=foods[i].price+route.cost) {
        state.coins-=foods[i].price;food[i]++;spentFood+=foods[i].price;
      }
      let location=0;
      if(!free){let roll=random()*actualRoute.pool.reduce((n,i)=>n+locations[i].chance,0);for(const i of actualRoute.pool){roll-=locations[i].chance;if(roll<0){location=i;break;}}}
      if(free)emergencyTrips++;
      visited.add(location);
      const soilRoll=random(),soil=free?0:soilRoll<.6?0:soilRoll<.8?1:2,loc=free?emergency:locations[location];
      const luck=random(),bucket=luck<.25?'poor':luck<.9?'normal':'rich',profile=world.siteProfile(loc,luck);
      const range=signalRanges[loc.terrain],count=Math.max(3,Math.round((range[0]+Math.floor(random()*(range[1]-range[0]+1)))*profile.signalFactor));
      let energy=100,foodUsed=0,found=0;const bag=[];
      for(let i=0;i<count;i++) {
        let kindRoll=random(),kind='relic';for(let k=0;k<4;k++){kindRoll-=profile.kinds[k];if(kindRoll<0){kind=kinds[k];break;}}
        const type=pickType(kind,profile,(free?'emergency':location)+':'+bucket,random),condition=Math.floor(random()*101);
        const depthRoll=random(),depth=depthRoll<(['beach','road','river'].includes(loc.terrain)?.6:.3)?0:depthRoll<.85?1:2;
        // Coverage and imperfect centring are explicit scenario assumptions.
        // No rare-item/condition/price oracle decides what is dug.
        if(random()>(.88+(state.level-1)*.01))continue;
        const digCost=Math.round(depthLevels[depth].cost*gear.shovelAt(state.shovel)*conditions[soil].factor*10)/10;
        const hit=random()<(state.level>=3?.95:.80),costNow=hit?digCost:Math.round(10*gear.shovelAt(state.shovel)*conditions[soil].factor*10)/10;
        if(energy<costNow)for(const f of [2,1]) {
          if(food[f]&&foodUsed+foods[f].percent<=50&&energy+foods[f].percent<=100){food[f]--;foodUsed+=foods[f].percent;energy+=foods[f].percent;}
          if(energy>=costNow)break;
        }
        if(energy<costNow)continue;
        energy=Math.round((energy-costNow)*10)/10;
        if(!hit){misses++;continue;}
        found++;finds++;bag.push({type,condition,value:prices[type][condition]});
      }
      if(found>=3)trips++;
      const priority=item=>types[item.type].kind!=='trash'&&(!best.has(item.type)||improveAlbum&&item.condition>best.get(item.type));
      bag.sort((a,b)=>Number(priority(b))-Number(priority(a))||b.value-a.value);
      const capacity=gear.capacityAt(state.backpack)-food.reduce((a,b)=>a+b,0);
      for(const item of bag.slice(0,capacity)) {
        if(priority(item)) {
          if(best.has(item.type)){const value=prices[item.type][best.get(item.type)];state.coins+=value;earned+=value;}
          best.set(item.type,item.condition);
        }else{state.coins+=item.value;earned+=item.value;}
      }
      const entries=[...best],metrics={album:best.size,finds,places:visited.size,trips,
        denoms:new Set(entries.filter(([id])=>types[id].country==='Україна').map(([id])=>types[id].denom)).size,
        rare:entries.filter(([id])=>types[id].rarity>=2).length,fine:entries.filter(([,q])=>q>=90).length,perfect:entries.some(([,q])=>q===100)?1:0};
      for(const goal of goals)if(!claimed.has(goal.id)&&metrics[goal.metric]>=goal.target){claimed.add(goal.id);state.coins+=goal.reward;}
      if(state.coins<before)losses++;
      // Buy the cheapest next upgrade, keeping a fare reserve; all 27 steps
      // must actually be bought, without treating saved finds as cash.
      for(;;) {
        const choices=Object.entries(gear.gearKeys).filter(([,key])=>state[key]<10).map(([kind,key])=>({kind,key,cost:gear.upgradePrice(state,kind)})).sort((a,b)=>a.cost-b.cost);
        if(!choices.length){completed=trip;break;}
        const next=choices[0];if(state.coins<next.cost+route.cost)break;
        state.coins-=next.cost;state[next.key]++;
      }
      for(let level=2;level<=10;level++)if(!milestones[level]&&Math.min(state.level,state.shovel,state.backpack)>=level)milestones[level]=trip;
      if(completed!==null)break;
    }
    return {completed,milestones,emergencyTrips,losses,misses,spentFood,spentTravel,earned,album:best.size};
  }
  const results=[];
  for(const route of routes)for(const improveAlbum of [false,true]) {
    const runs=Array.from({length:24},(_,i)=>run(3881+i*7919,route.id,improveAlbum));
    const completed=runs.filter(x=>x.completed!==null),totals=completed.map(x=>x.completed);
    results.push({route:route.id,albumPolicy:improveAlbum?'keep improvements, sell returned copy':'keep first copy, sell duplicates',completed:completed.length,cohort:runs.length,
      fullGearTrips:totals.length?{p10:percentile(totals,.1),median:percentile(totals,.5),p90:percentile(totals,.9)}:null,
      allGearTierMedian:Object.fromEntries(Array.from({length:9},(_,i)=>i+2).map(level=>[level,percentile(runs.map(r=>r.milestones[level]||4001),.5)])),
      medianEmergencyTrips:percentile(runs.map(x=>x.emergencyTrips),.5),medianAlbum:percentile(runs.map(x=>x.album),.5),
      medianFoodSpent:percentile(runs.map(x=>x.spentFood),.5),medianTravelSpent:percentile(runs.map(x=>x.spentTravel),.5),medianLossTrips:percentile(runs.map(x=>x.losses),.5)});
  }
  const output={seed:3881,cohortPerScenario:24,totalUpgradeCost:Object.values(gear.gearCosts).flat().reduce((a,b)=>a+b,0),
    assumptions:['24 deterministic runs per route/policy; at most 4000 trips','Free rest between trips; start with zero coins; actual route locks, poor sites, soil and travel fares','88–97% coverage, 80% centring success before pinpoint and 95% thereafter are assumptions, not measured skill','One attempt per target; failed digs consume energy; no sale-value or rarity oracle before excavation','Optional 20%+30% food, paid on purchase; unused supplies persist and occupy bag slots; 50% meal cap','Only found items ranked for bag capacity; album entries retained, duplicates/returned copies sold; goals claimed once','Cheapest next upgrade bought with a fare reserve; no idle time estimate or guarantee of player income'],results};
  const text=JSON.stringify(output,null,2)+'\n';if(process.argv[2])fs.writeFileSync(process.argv[2],text);else console.log(text);
})().catch(e=>{console.error(e);process.exitCode=1});
