// Optimistic single-location model: perfect targeting, random dig order, best items retained.
// Food scenario grants its full 50% upfront and charges 34; this is an optimistic approximation, not a player forecast.
const {newRun,root}=require('./harness.cjs');
(async()=>{const e=await newRun(null);const mod=f=>e.modules.get(root+'/js/'+f+'.js').namespace;const state=mod('storage').s,world=mod('world'),rules=mod('rules');const foods=e.modules.get(root+'/data/balance.js').namespace.foods;const out=[];
for(const level of [1,25,100])for(const emergency of [true,false])for(const food of [false,true]){state.level=state.shovel=state.backpack=level;let sum=0,loss=0,totDigs=0;const nets=[];
for(let n=0;n<1500;n++){state.emergency=emergency;state.location=emergency?0:world.rollLocation();const loc=world.siteProfile(world.currentLocation());const ranges=e.modules.get(root+'/data/balance.js').namespace.signalRanges;const range=ranges[loc.terrain];const count=Math.max(3,Math.round((range[0]+Math.floor(e.context.Math.random()*(range[1]-range[0]+1)))*loc.signalFactor));let energy=rules.maxEnergy()*(food?1.5:1);const vals=[];
for(let j=0;j<count;j++){const depth=world.rollDepth(loc),cost=rules.digCost([5,10,15][depth]);if(energy<cost)break;energy-=cost;totDigs++;const t=world.pickType(world.pickKind(loc),loc);vals.push(rules.priceFor(t,rules.rollCondition()));}
const value=vals.sort((a,b)=>b-a).slice(0,rules.bagCapacity()).reduce((a,b)=>a+b,0);const net=value-(emergency?0:25)-(food?34:0);sum+=net;loss+=net<0;nets.push(net);}
nets.sort((a,b)=>a-b);out.push({level,emergency,food,meanNet:Math.round(sum/1500),median:nets[750],p10:nets[150],lossPct:Math.round(loss/15),digs:(totDigs/1500).toFixed(1)});}
let costs={};for(const kind of ['detector','shovel','backpack']){let total=0;for(let l=1;l<100;l++){state[kind==='detector'?'level':kind]=l;total+=rules.upgradeCost(kind)}costs[kind]=total;}console.log(JSON.stringify({out,costs},null,2));})().catch(console.error);
