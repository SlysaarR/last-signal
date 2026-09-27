const {newRun,root,golden,createHash,assert}=require('./harness.cjs');
(async()=>{
 const advanced=JSON.parse(golden.fixtures.find(x=>x.name==='active trip').saved).state;
 for(const {name,saved,expected} of golden.fixtures){
  const next=await newRun(saved);
  assert.deepEqual(next.state(),expected,name+' save mismatch');
  const existingCatalog=JSON.parse(next.catalog()).slice(0,golden.catalogLength);
  assert.equal(createHash('sha256').update(JSON.stringify(existingCatalog)).digest('hex'),golden.catalogHash,name+' existing item IDs changed');
  assert.deepEqual(JSON.parse(next.store.get('last-signal-v1')),{version:1,state:expected},name+' saved envelope mismatch');
  assert.equal(next.elements.get('bars').children.length,20);
  for(const id of ['dig','foodQuick','sound','finish','startTrip','returnHome','excSkip','leaveFind'])assert.equal(typeof next.elements.get(id).onclick,'function',name+' '+id+' unbound');
  console.log('PASS',name);
 }
 const blocked=await newRun(null,true);assert.equal(blocked.elements.get('saveNote').hidden,false);console.log('PASS unavailable storage warning');
 const run=await newRun(JSON.stringify({version:1,state:advanced}));const mod=f=>run.modules.get(root+'/js/'+f+'.js').namespace;
 mod('search').dig();assert(run.state().pending);assert.equal(run.elements.get('excavate').open,true);
 mod('excavation').collectPending();assert(run.state().pending.revealed);mod('packing').resolvePacking('take');assert.equal(run.state().bag.length,2);assert.equal(run.state().pending,null);assert.equal(run.state().energy,76.2);
 const reloaded=await newRun(run.store.get('last-signal-v1'));assert.deepEqual(reloaded.state(),run.state());console.log('PASS dig → reveal → take → reload');
 const inv=await newRun(null); const ns=f=>inv.modules.get(root+'/js/'+f+'.js').namespace;
 const state=ns('storage').s;
 const coin=JSON.parse(inv.catalog()).findIndex(t=>t.country && t.kind==='coin');
 state.bag=[{type:coin,condition:70}]; ns('inventory').inventoryAction('album','bag',0);
 assert.equal(state.best[coin],70); assert.equal(state.bag.length,0);
 state.bag=[{type:coin,condition:90}]; ns('inventory').inventoryAction('album','bag',0);
 assert.equal(state.best[coin],90); assert.equal(state.stash[0].condition,70);
 ns('inventory').inventoryAction('move','stash',0); assert.equal(state.bag[0].condition,70);
 const before=state.coins; ns('inventory').inventoryAction('sell','bag',0); assert(state.coins>before); assert.equal(state.bag.length,0);
 inv.elements.get('denomFilter').onchange({target:{value:JSON.parse(inv.catalog())[coin].denom}});
 inv.elements.get('missingFilter').onchange({target:{checked:true}});
 assert(!ns('collection').categoryItems().some(t=>t.id===coin));
 assert(ns('collection').categoryItems().every(t=>t.denom===JSON.parse(inv.catalog())[coin].denom));
 console.log('PASS album upgrade → stash → bag → sell; denomination and missing filters');
 const shop=ns('shop'),rules=ns('rules');
 for(const kind of ['detector','shovel','backpack']){
   const key=kind==='detector'?'level':kind;
   for(let level=1;level<100;level++){
     state[key]=level;state.coins=100000;state.atCamp=true;
     const expected=kind==='detector'?rules.maxEnergy(level+1):kind==='shovel'?rules.shovelFactor(level+1):rules.bagCapacity(level+1);
     const cost=rules.upgradeCost(kind);shop.upgradeGear(kind);
     assert.equal(state[key],level+1);assert.equal(state.coins,100000-cost);
     assert.equal(kind==='detector'?rules.maxEnergy():kind==='shovel'?rules.shovelFactor():rules.bagCapacity(),expected);
   }
   const balance=state.coins;shop.upgradeGear(kind);assert.equal(state[key],100);assert.equal(state.coins,balance);
 }
 state.coins=0;state.level=1;shop.upgradeGear('detector');assert.equal(state.level,1);
 state.atCamp=false;state.coins=1000;shop.upgradeGear('detector');assert.equal(state.level,1);
 const count=state.pantry[0];shop.buyFood(0);assert.equal(state.pantry[0],count);
 state.atCamp=true;shop.buyFood(0);assert.equal(state.pantry[0],count+1);shop.transferFood(0,true);assert.equal(state.food[0],1);
 console.log('PASS all 297 upgrade steps, max level, purchase guards and food packing');
 const camp=ns('camp');state.energy=10;state.backpack=1;state.food=[0,0,0];state.bag=Array.from({length:8},()=>({type:0,condition:40}));state.coins=100;
 assert.equal(camp.departureWarnings().length,2);camp.confirmDeparture();assert.equal(inv.elements.get('modalClose').textContent,'Усе одно вирушити');
 inv.elements.get('modalCancel').onclick();assert.equal(state.atCamp,true);assert.equal(state.coins,100);
 inv.elements.get('restHome').onclick();assert.equal(state.energy,rules.maxEnergy());assert.equal(camp.departureWarnings().length,1);
 camp.confirmDeparture();inv.elements.get('modalClose').onclick();assert.equal(state.atCamp,false);assert.equal(state.coins,75);assert.equal(state.bag.length,8);
 inv.elements.get('modalClose').onclick();camp.returnHome();assert.equal(state.atCamp,true);assert.equal(state.lastTrip.travel,25);assert.equal(state.lastTrip.brought,8);
 state.coins=0;camp.confirmDeparture();inv.elements.get('modalClose').onclick();assert.equal(state.coins,0);assert.equal(state.location,0);
 console.log('PASS camp warnings → cancel → rest → paid departure → report → free departure');
 const energyRun=await newRun(null);const em=f=>energyRun.modules.get(root+'/js/'+f+'.js').namespace;const es=em('storage').s;
 es.atCamp=false;es.energy=5;es.x=.5;es.y=.5;es.objects=[{x:.5,y:.5,type:0,condition:50,depth:2,dug:false}];
 em('search').dig();assert.equal(es.energy,5);assert(!es.pending);assert.equal(es.objects[0].dug,false);
 es.energy=15;em('search').dig();assert.equal(es.energy,0);assert(es.pending);assert.equal(es.pending.spent,15);
 for(const kind of ['detector','shovel','backpack']){let prev=0;for(let l=1;l<100;l++){es[kind==='detector'?'level':kind]=l;const cost=em('rules').upgradeCost(kind);assert(cost>prev);prev=cost;}}
 console.log('PASS insufficient energy cannot discount digs; exact energy works; upgrade prices increase');
 const world=em('world'),loc=world.currentLocation();
 for(const roll of [0,.249,.25,.899,.9,.999]){const profile=world.siteProfile(loc,roll);assert(Math.abs(profile.kinds.reduce((a,b)=>a+b,0)-1)<1e-9);assert(profile.kinds.every(n=>n>=0));}
 assert(world.siteProfile(loc,0).kinds[0]>=.94);assert.deepEqual([...world.siteProfile(loc,.5).kinds],[...loc.kinds]);assert(world.siteProfile(loc,.95).kinds[0]<loc.kinds[0]);
 es.pending=null;es.energy=100;world.generate();const objects=JSON.parse(JSON.stringify(es.objects));const resumed=await newRun(energyRun.store.get('last-signal-v1'));assert.deepEqual(resumed.state().objects,objects);
 console.log('PASS site luck probabilities and saved site survives reload');
})().catch(e=>{console.error(e);process.exit(1)});
