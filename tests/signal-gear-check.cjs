const {newRun,root,golden,assert}=require('./harness.cjs');
(async()=>{
 const r=await newRun(),mod=f=>r.modules.get(root+'/js/'+f+'.js').namespace;
 const gear=r.modules.get(root+'/data/gear.js').namespace,st=mod('storage'),rules=mod('rules'),shop=mod('shop'),det=mod('detector'),format=mod('backup-format');
 // Independent old formula checks for every supported old level, plus bounded credit.
 for(let old=1;old<=100;old++){
  const s=JSON.parse(JSON.stringify(golden.fixtures.find(f=>f.name==='active trip').expected));
  s.level=s.shovel=s.backpack=old;s.energy=100+Math.round((old-1)*100/99);s.pending=null;
  const original=JSON.parse(JSON.stringify(s));gear.migrateGear(s);
  assert(s.level<=10&&s.shovel<=10&&s.backpack<=10);
  assert(gear.detectorAt(s.level).radius+1e-12>=.205*(1+(old-1)*.5/99));
  assert(gear.shovelAt(s.shovel)<=1-.3*(old-1)/99+1e-12);
  assert(gear.capacityAt(s.backpack)>=8+Math.floor((old-1)*32/99));
  assert.equal(s.energyCapacity,original.energy);assert.equal(s.energy,original.energy);
  assert.equal(s.coins,original.coins);assert.deepEqual(s.bag,original.bag);assert.deepEqual(s.objects,original.objects);
  for(const [kind,key]of Object.entries(gear.gearKeys)){
   let spent=0;for(let l=1;l<old;l++)spent+=Math.round(30+l*(kind==='detector'?8:6)+l*l*.1);
   const worth=gear.gearCosts[kind].slice(0,s[key]-1).reduce((a,b)=>a+b,0);
   assert(worth+s.gearCredit[kind]>=spent,'investment lost at '+old+' '+kind);
   if(s[key]<10)assert(s.gearCredit[kind]<gear.gearCosts[kind][s[key]-1]);else assert.equal(s.gearCredit[kind],0);
  }
  const once=JSON.stringify(s);assert.equal(gear.migrateGear(s),false);assert.equal(JSON.stringify(s),once);
  format.validateBackupState(s);
 }
 console.log('PASS all 100 old levels: no lost effects, capacity, energy, purchases or items; idempotent migration');
 const raw=JSON.parse(JSON.stringify(golden.fixtures.find(f=>f.name==='active trip').expected));
 const portable={format:'last-signal-backup',backupVersion:1,saveVersion:1,createdAt:'2026-10-13T00:00:00.000Z',state:raw};
 const parsed=format.parseBackup(JSON.stringify(portable));assert.equal(parsed.state.gearVersion,2);assert.equal(raw.gearVersion,undefined);
 const run=await newRun(JSON.stringify({version:1,state:raw}));
 assert.deepEqual(run.state(),JSON.parse(JSON.stringify(parsed.state)));
 const reloaded=await newRun(run.store.get(st.KEY));assert.deepEqual(reloaded.state(),run.state());
 for(const mutate of [s=>s.gearVersion=3,s=>s.level=11,s=>s.shovel=11,s=>s.energyCapacity=99,s=>s.gearCredit.detector=-1,s=>s.gearCredit.detector=999999]){
  const state=JSON.parse(JSON.stringify(st.s));mutate(state);assert.throws(()=>format.validateBackupState(state));
  const saved=JSON.stringify({version:1,state});const bad=await newRun(saved);assert.equal(bad.store.get(st.KEY),saved);
 }
 console.log('PASS local and portable old saves migrate identically once; malformed new gear remains protected');
 for(const [kind,key]of Object.entries(gear.gearKeys)){
  st.s[key]=1;st.s.gearCredit[kind]=0;st.s.coins=1000000;st.s.atCamp=true;
  for(let l=1;l<10;l++){
   const coins=st.s.coins,cost=rules.upgradeCost(kind),cap=rules.bagCapacity(),dig=rules.digCost(5),radius=rules.detectorStats().radius,energy=rules.maxEnergy();
   shop.upgradeGear(kind);assert.equal(st.s[key],l+1);assert.equal(st.s.coins,coins-cost);assert.equal(rules.maxEnergy(),energy);
   if(kind==='backpack')assert(rules.bagCapacity()>cap);
   if(kind==='shovel')assert(rules.digCost(5)<dig);
   if(kind==='detector')assert(rules.detectorStats().radius>radius);
  }
  const max=JSON.stringify(st.s);shop.upgradeGear(kind);assert.equal(JSON.stringify(st.s),max);
 }
 st.s.level=2;st.s.gearCredit.detector=87;st.s.coins=500;
 assert.equal(rules.upgradeCost('detector'),213);shop.upgradeGear('detector');assert.equal(st.s.coins,287);assert.equal(st.s.gearCredit.detector,0);
 assert.equal(rules.upgradeCost('detector'),650);st.s.coins=649;shop.upgradeGear('detector');assert.equal(st.s.level,3);
 console.log('PASS 27 meaningful upgrades; no energy awarded by detector; credits deducted once; max and insufficient money guards');
 const obj={x:.5,y:.5,type:0,condition:65,depth:0,dug:false};
 const shallow=det.readTarget(obj,.5,.5,1),deep=det.readTarget({...obj,depth:2},.5,.5,1),better=det.readTarget({...obj,depth:2},.5,.5,10);
 assert(shallow.power>deep.power);assert(deep.power>0);assert(better.power>deep.power);assert(better.stability>deep.stability);
 const before=JSON.stringify(obj);assert.deepEqual(det.readTarget(obj,.51,.51,3),det.readTarget(obj,.51,.51,3));assert.equal(JSON.stringify(obj),before);
 assert.equal(JSON.stringify(det.readTarget({...obj,condition:0},.5,.5,3)),JSON.stringify({...det.readTarget({...obj,condition:100},.5,.5,3),obj:{...obj,condition:0}}));
 assert.equal(det.sampleSignal([{...obj,dug:true}],.5,.5,1).power,0);
 assert.equal(det.sampleSignal([],0,0,1).pinpoint,false);
 assert.equal(det.readTarget(obj,.536,.5,1).pinpoint,false);assert.equal(det.readTarget(obj,.534,.5,1).pinpoint,true);
 const foil=det.targetProfile(10),gold=det.targetProfile(6);assert(Math.abs(foil.id-gold.id)<20,'foil and gold must overlap');
 const iron=det.readTarget(obj,.5,.5,4),silver=det.readTarget({...obj,type:4},.5,.5,4);
 assert.equal(iron.tone,'low');assert.equal(silver.tone,'high');
 const audio=mod('audio');assert(audio.toneSettings(iron).frequency<audio.toneSettings(silver).frequency);
 assert(audio.toneSettings({...silver,power:20}).interval>audio.toneSettings({...silver,power:90}).interval);
 assert.equal(audio.toneSettings({...silver,power:20}).frequency,audio.toneSettings({...silver,power:90}).frequency);
 console.log('PASS deterministic uncertain signals, depth, gear improvement, overlapping targets, dug removal, exact pinpoint and distinct audio pitch/cadence');
 // Every generated item remains detectable with starter gear; no equipment-based loot rolls.
 st.s.level=1;st.s.shovel=1;st.s.atCamp=false;st.s.energy=100;st.s.objects=[{...obj,depth:2}];st.s.x=.5;st.s.y=.5;
 assert.equal(mod('search').digInfo().cost,15);mod('search').dig();assert.equal(st.s.energy,85);assert.equal(st.s.pending.type,0);
 console.log('PASS deepest starter target: visible response, full energy cost and correct find');
 const basic=await newRun(),advanced=await newRun();
 for(const [run,level]of [[basic,1],[advanced,10]]){
  const state=run.modules.get(root+'/js/storage.js').namespace.s;
  state.level=level;state.atCamp=false;
  if(level===10)for(let n=0;n<100;n++)run.modules.get(root+'/js/search.js').namespace.signal();
  run.modules.get(root+'/js/world.js').namespace.generate();
 }
 assert.deepEqual(basic.state().objects,advanced.state().objects);
 console.log('PASS gear and repeated scanning never change generated loot or consume luck');
})().catch(e=>{console.error(e);process.exit(1)});
