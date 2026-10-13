// Reproducible, optimistic field model: perfect pinpointing, no food, best bag items.
// This measures route trade-offs; it is not observed player income or a balance gate.
const {newRun,root}=require('./harness.cjs');
(async()=>{
  const output=[];
  for(const level of [1,50,100]) for(let routeIndex=0;routeIndex<4;routeIndex++) {
    const r=await newRun(), mod=f=>r.modules.get(root+'/js/'+f+'.js').namespace;
    const world=mod('world'),rules=mod('rules'),state=mod('storage').s;
    const {routes,conditions}=r.modules.get(root+'/data/expeditions.js').namespace;
    const {locations}=r.modules.get(root+'/data/locations.js').namespace;
    const {signalRanges,depthLevels}=r.modules.get(root+'/data/balance.js').namespace;
    const route=routes[routeIndex],random=r.context.Math.random,nets=[];
    let finds=0,coins=0,jewels=0,relics=0,poor=0;
    const catalog=JSON.parse(r.catalog());state.level=level;state.shovel=level;state.backpack=level;
    for(let trip=0;trip<2000;trip++) {
      const loc=locations[world.rollLocation(route)],soilRoll=random(),soil=conditions[soilRoll<.6?0:soilRoll<.8?1:2];
      const luck=random(),profile=world.siteProfile(loc,luck);if(luck<.25)poor++;
      const range=signalRanges[loc.terrain],count=Math.max(3,Math.round((range[0]+Math.floor(random()*(range[1]-range[0]+1)))*profile.signalFactor));
      let energy=rules.maxEnergy();const bag=[];
      for(let i=0;i<count;i++) {
        const kind=world.pickKind(profile),type=world.pickType(kind,profile),condition=rules.rollCondition(),depth=world.rollDepth(profile);
        const cost=Math.round(depthLevels[depth].cost*rules.shovelFactor()*soil.factor*10)/10;
        if(cost>energy+.001)continue;energy=Math.round((energy-cost)*10)/10;finds++;
        if(kind==='coin')coins++;if(kind==='jewel')jewels++;if(kind==='relic')relics++;
        bag.push(rules.priceFor(type,condition));
      }
      bag.sort((a,b)=>b-a);nets.push(bag.slice(0,rules.bagCapacity()).reduce((a,b)=>a+b,0)-route.cost);
    }
    nets.sort((a,b)=>a-b);
    output.push({level,route:route.id,trips:nets.length,averageNet:+(nets.reduce((a,b)=>a+b,0)/nets.length).toFixed(1),medianNet:nets[1000],lossPercent:+(nets.filter(n=>n<0).length/20).toFixed(1),poorPercent:poor/20,findsPerTrip:+(finds/2000).toFixed(1),coinsPercent:+(coins/finds*100).toFixed(1),jewelsPercent:+(jewels/finds*100).toFixed(1),relicsPercent:+(relics/finds*100).toFixed(1)});
  }
  console.log(JSON.stringify({model:'2000 sites per route and gear tier; perfect pinpointing, no food, empty starting bag, highest-value finds kept; expenses include travel only; routes treated as already unlocked',results:output},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
