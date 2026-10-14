const fs=require('node:fs');
const {newRun,root,assert,golden}=require('./harness.cjs');
const plain=x=>JSON.parse(JSON.stringify(x)),ns=(r,n)=>r.modules.get(root+'/js/'+n+'.js').namespace,data=(r,n)=>r.modules.get(root+'/data/'+n+'.js').namespace;
const close=r=>r.elements.get('modalClose').onclick();
function unlock(r){const s=ns(r,'storage').s,types=JSON.parse(r.catalog());for(let id=0;id<types.length&&s.collection.length<24;id++)if(types[id].kind!=='trash'){s.collection.push(id);s.best[id]=95;}}
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
(async()=>{
 const r=await newRun(),s=ns(r,'storage').s,env=data(r,'environment'),camp=ns(r,'camp'),prep=ns(r,'environment-ui'),rules=ns(r,'rules'),p=ns(r,'progression'),atlas=data(r,'atlas'),format=ns(r,'backup-format');
 const original=JSON.stringify(s),random=r.context.Math.random;r.context.Math.random=()=>{throw Error('forecast/view must not consume loot RNG');};
 for(let i=0;i<30;i++){camp.renderCamp();prep.renderPreparation('atlasConditions');assert.equal(JSON.stringify(s),original);}
 assert.equal(s.weatherEffects,undefined);r.context.Math.random=random;
 // Published departures retain exact item IDs, coordinates, condition, depth,
 // geography seed, count and next RNG value despite the new forecast.
 const {rows}=JSON.parse(fs.readFileSync(root+'/tests/weather-loot-fixtures.json','utf8'));
 for(const row of rows){const q=await newRun(),state=ns(q,'storage').s;unlock(q);Object.assign(state,{coins:1000,day:37,route:row.route});let seed=row.seed;q.context.Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};const before=plain(ns(q,'environment-ui').departureConditions().environment);ns(q,'camp').depart();assert.deepEqual(plain(state.objects),row.objects);assert.deepEqual(plain(state.site),row.site);assert.equal(state.location,row.location);assert.equal(q.context.Math.random(),row.next);assert.deepEqual(plain(state.progress.active.environment),before);}
 // First arrival, return, another route, portable copy and revisit keep climate.
 unlock(r);Object.assign(s,{coins:1000,route:'distant',energy:73,food:[1,1,0]});
 const forecast=plain(prep.departureConditions().environment);camp.depart();close(r);assert.deepEqual(plain(s.progress.active.environment),forecast);
 const site=atlas.activeSite(s),id=site.id,objects=plain(s.objects);assert.deepEqual(plain(site.environment),forecast);
 s.x=s.objects[0].x;s.y=s.objects[0].y;const cost=ns(r,'search').digInfo().cost,energy=s.energy;ns(r,'search').dig();assert(s.pending);assert.equal(s.pending.spent,cost);assert.equal(s.energy,Math.round((energy-cost)*10)/10);
 const saved=r.store.get('last-signal-v1'),pendingReload=await newRun(saved);assert.deepEqual(pendingReload.state().pending,plain(s.pending));assert.deepEqual(pendingReload.state().progress.active.environment,forecast);
 assert.deepEqual(plain(format.parseBackup(format.createBackup(s)).state.progress.active.environment),forecast);
 ns(r,'excavation').collectPending();ns(r,'packing').resolvePacking('take');const afterDig=plain(s.objects);camp.returnHome();assert.deepEqual(plain(s.progress.history[0].environment),forecast);
 s.route='water';ns(r,'atlas-state').selectSite(id);assert.deepEqual(plain(prep.departureConditions().environment),forecast);
 const savedCamp=r.store.get('last-signal-v1');const q=await newRun(savedCamp);assert.deepEqual(q.state().atlas.sites[0].environment,forecast);
 r.context.Math.random=()=>{throw Error('revisit cannot roll');};camp.depart();close(r);assert.deepEqual(plain(s.objects),afterDig);assert.deepEqual(plain(s.progress.active.environment),forecast);r.context.Math.random=random;
 assert.equal(s.objects.length,objects.length);assert.equal(s.objects.filter(o=>o.dug).length,1);
 // Cost tables have exact, depth-sensitive discounts/tradeoffs at every shovel.
 const expected={dry:[1,1.05,1.1],damp:[.9,.9,.95],stony:[1,1.1,1.2]};
 for(let shovel=1;shovel<=10;shovel++){
  s.shovel=shovel;
  for(const ground of Object.keys(expected))for(const weather of ['clear','overcast','rain'])for(const [index,base] of [5,10,15].entries()){
   const destination={environment:{version:1,ground,weather}};
   assert.equal(rules.digCostFor(base,destination),Math.round(base*rules.shovelFactor()*expected[ground][index]*10)/10);
   assert.equal(rules.digCostFor(base,{...destination,emergency:true}),Math.round(base*rules.shovelFactor()*10)/10);
  }
  for(let condition=0;condition<3;condition++)for(const base of [5,10,15])assert.equal(rules.digCostFor(base,{condition}),Math.round(base*rules.shovelFactor()*[1,.9,1.2][condition]*10)/10,'legacy cost is exact');
 }
 s.shovel=1;
 // At exact energy, the displayed and charged cost agree; no discounted dig.
 s.progress.active.environment={version:1,weather:'clear',ground:'stony'};s.progress.active.condition=2;site.environment={...s.progress.active.environment};site.condition=2;
 s.objects=[{x:.5,y:.5,type:208,condition:80,depth:2,dug:false}];s.x=s.y=.5;s.energy=17.9;
 ns(r,'search').dig();assert(!s.pending);assert.equal(s.energy,17.9);assert(!s.objects[0].dug);s.energy=18;ns(r,'search').dig();assert(s.pending);assert.equal(s.pending.spent,18);assert.equal(s.energy,0);
 ns(r,'excavation').collectPending();ns(r,'packing').resolvePacking('leave');camp.returnHome();
 // Food forecast respects combinations, the existing cap and very large stock.
 s.food=[0,0,2];assert.equal(prep.usableFoodEnergy(),30);s.food=[1,1,1];assert.equal(prep.usableFoodEnergy(),50);s.food=[1e8,1e8,1e8];assert.equal(prep.usableFoodEnergy(),50);
 s.food=[1,1,1];s.atCamp=false;s.foodUsed=30;assert.equal(prep.usableFoodEnergy(),20);s.foodUsed=49.5;assert.equal(prep.usableFoodEnergy(),0);s.atCamp=true;s.foodUsed=0;s.food=[0,0,0];
 // Validation protects new metadata, including consistency between active copies.
 ns(r,'atlas-state').selectSite(id);camp.depart();close(r);const backup=format.createBackup(s);
 for(const mutate of [v=>v.progress.active.environment.version=2,v=>v.progress.active.environment.weather='snow',v=>v.progress.active.environment.ground='mud',v=>v.progress.active.environment=null,v=>v.progress.active.condition=1,v=>v.atlas.sites[0].environment.weather='rain',v=>delete v.atlas.sites[0].environment,v=>v.weatherEffects='bad']){
  const bad=JSON.parse(backup);mutate(bad.state);assert.throws(()=>format.parseBackup(JSON.stringify(bad)));
 }
 const bad=JSON.parse(backup);bad.state.progress.active.environment.version=2;const raw=JSON.stringify({version:1,state:bad.state}),protectedRun=await newRun(raw);assert.equal(protectedRun.store.get('last-signal-v1'),raw);
 // Existing 0.48-era fields without environment retain their shape and old cost.
 const old=JSON.parse(backup);delete old.state.atlas.sites[0].environment;delete old.state.progress.active.environment;old.state.progress.active.condition=2;old.state.atlas.sites[0].condition=2;
 const legacy=await newRun(JSON.stringify({version:1,state:old.state}));assert.equal(ns(legacy,'rules').digCost(10),12);assert.equal(legacy.state().progress.active.environment,undefined);assert(legacy.elements.get('weatherLayer').hidden);
 // Forecast balance, diversity and stability over 40,000 route/day combinations.
 const statistics=[];
 for(const route of data(r,'expeditions').routes){const totals=[0,0,0],seen=new Set();for(let day=1;day<=10000;day++){const e=env.forecastEnvironment({day},route);assert(env.validEnvironment(e));assert.deepEqual(plain(e),plain(env.forecastEnvironment({day},route)));seen.add(e.weather+':'+e.ground);for(let i=0;i<3;i++)totals[i]+=env.groundFactor(e,[5,10,15][i]);}assert(seen.size>=8);const means=totals.map(x=>x/10000),weights=route.id==='water'?[3,2.5,2.25]:[1.5,5.5,2.25],change=means.reduce((sum,n,i)=>sum+n*weights[i],0)/(weights.reduce((a,b)=>a+b)*1.02)-1;assert(Math.abs(change)<.04,'average energy stays within 4% of old soil distribution');statistics.push({route:route.id,costChangePercent:Math.round(change*10000)/100});}
 console.log('PASS 16 exact 0.48 departures; stable forecast, visit/history/pending/backup, all depths and shovels, exact energy, legacy soil, food planning and corrupt-save protection');
 console.log(JSON.stringify(statistics));

 // Real effects control and audio lifecycle without a browser or loot RNG.
 const media={matches:false,addEventListener(_,fn){this.change=fn;}};
 const ar=await newRun(null,false,e=>{e.context.matchMedia=()=>media;e.context.navigator={deviceMemory:8,hardwareConcurrency:8};});
 const a=ns(ar,'audio'),as=ns(ar,'storage').s,ap=ns(ar,'environment-ui'),ui=ns(ar,'ui'),layer=ar.elements.get('weatherLayer');
 const contexts=[];
 class Context{
  constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=8000;this.destination={};this.sources=[];this.buffers=0;contexts.push(this);}
  resume(){if(this.defer)return new Promise(resolve=>this.finish=()=>{this.state='running';this.onstatechange?.();resolve();});this.state='running';this.onstatechange?.();return Promise.resolve();}
  suspend(){this.state='suspended';this.onstatechange?.();return Promise.resolve();}
  createBuffer(_,length){this.buffers++;return {getChannelData:()=>new Float32Array(length)};}
  createBufferSource(){const source={connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}};this.sources.push(source);return source;}
  createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  createBiquadFilter(){return {frequency:{value:0},Q:{value:0},connect(){},disconnect(){}};}
  createOscillator(){return {frequency:{value:0},connect(){},disconnect(){},start(){},stop(){}};}
 }
 ar.context.AudioContext=Context;as.atCamp=false;ns(ar,'progression').startLeg(25,1,{version:1,weather:'rain',ground:'damp'});ui.showTab('search');
 ar.context.Math.random=()=>{throw Error('ambient sound/render must not consume loot RNG');};
 assert.equal(layer.dataset.running,'true');assert.equal(layer.dataset.level,'full');assert.equal(contexts.length,0,'no audio before explicit enable');
 await ar.elements.get('sound').onclick();const context=contexts[0];assert.equal(context.sources.length,1);assert.equal(context.buffers,1);assert(context.sources[0].loop);
 for(let i=0;i<40;i++)ui.render();assert.equal(context.sources.length,1);assert.equal(ar.frames.size,0,'weather schedules no game animation frames');
 const event=name=>ar.listeners[name]?.forEach(fn=>fn());
 ar.context.document.visibilityState='hidden';event('document:visibilitychange');await settle();assert.equal(layer.dataset.running,'false');assert(context.sources[0].stopped);assert.equal(context.state,'suspended');
 ar.context.document.visibilityState='visible';event('document:visibilitychange');await settle();assert.equal(layer.dataset.running,'true');assert.equal(context.sources.length,2);assert.equal(context.buffers,1);
 event('pagehide');await settle();assert.equal(layer.dataset.running,'false');assert(context.sources[1].stopped);event('pageshow');await settle();assert.equal(context.sources.length,3);
 ar.elements.get('quickFood').showModal();ap.syncWeatherEffects();assert.equal(layer.dataset.running,'false');assert(context.sources[2].stopped);ar.elements.get('quickFood').close();ap.syncWeatherEffects();assert.equal(context.sources.length,4);
 ui.showTab('inventory');assert(layer.hidden);assert(context.sources[3].stopped);ui.showTab('search');assert.equal(context.sources.length,5);
 media.matches=true;media.change();assert.equal(layer.dataset.level,'low');as.weatherEffects='full';ap.syncWeatherEffects();assert.equal(layer.dataset.level,'low','reduced motion always wins');media.matches=false;ap.syncWeatherEffects();assert.equal(layer.dataset.level,'full');
 as.weatherEffects='auto';ar.context.navigator.deviceMemory=2;ap.syncWeatherEffects();assert.equal(layer.dataset.level,'low');ar.context.navigator.deviceMemory=8;
 as.atCamp=true;ui.showTab('camp');ar.elements.get('weatherEffects').onchange({target:{value:'low'}});assert.equal(as.weatherEffects,'low');assert.equal(JSON.parse(ar.store.get('last-signal-v1')).state.weatherEffects,'low');
 assert(ns(ar,'backup-format').parseBackup(ns(ar,'backup-format').createBackup(as)).state.weatherEffects==='low');
 as.atCamp=false;ui.showTab('search');const last=context.sources.at(-1);await ar.elements.get('sound').onclick();assert(!a.sound);assert(last.stopped);ap.syncWeatherEffects();const count=context.sources.length;assert.equal(context.sources.length,count);
 context.defer=true;const enabling=ar.elements.get('sound').onclick();await ar.elements.get('sound').onclick();context.finish();await enabling;await settle();assert(!a.sound);assert.equal(context.sources.length,count,'late resume cannot restart muted weather');
 console.log('PASS weather profiles, reduced motion, weak-device auto, saved preference, zero RAFs, one bounded audio buffer/source, tab/dialog/background/BFCache pause, mute and late resume');
})().catch(e=>{console.error(e);process.exit(1)});
