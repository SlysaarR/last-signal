const {newRun,root,assert,golden}=require('./harness.cjs');
(async()=>{
 const r=await newRun(),m=f=>r.modules.get(root+'/js/'+f+'.js').namespace;
 const state=m('storage').s,types=JSON.parse(r.catalog()),data=r.modules.get(root+'/data/expeditions.js').namespace,locs=r.modules.get(root+'/data/locations.js').namespace.locations;
 const p=m('progression'),rules=m('rules'),camp=m('camp'),world=m('world');
 const coins=types.map((t,id)=>({t,id})).filter(x=>x.t.country && !x.t.legacy).slice(0,24);
 state.coins=100;state.route='distant';assert.equal(rules.travelCost(),25,'locked routes fall back');
 for(const {id} of coins){state.collection.push(id);state.best[id]=95;}
 assert.equal(rules.travelCost(),50);state.coins=49;assert.equal(rules.canLeave(),false);const day=state.day;camp.depart();assert.equal(state.day,day,'insufficient money cannot depart');
 state.route='rural';state.coins=100;camp.depart();assert.equal(state.coins,65);assert(data.routes[1].pool.includes(state.location));assert.equal(p.progress().active.travel,35);
 r.elements.get('modalClose').onclick();
 const objects=JSON.stringify(state.objects),condition=state.progress.active.condition;
 m('storage').save();const again=await newRun(r.store.get('last-signal-v1'));assert.equal(JSON.stringify(again.state().objects),objects);assert.equal(again.state().progress.active.condition,condition);
 const base=rules.digCost(10);assert.equal(base,Math.round(10*({dry:1.05,damp:.9,stony:1.1}[state.progress.active.environment.ground])*10)/10);
 for(let i=0;i<3;i++){state.pending={type:coins[0].id,condition:77,spent:base,revealed:true};m('packing').resolvePacking('take');}
 assert.equal(p.progress().finds,3);assert.equal(p.progress().active.kept,3);m('packing').resolvePacking('take');assert.equal(p.progress().finds,3,'resolved item cannot count twice');
 camp.returnHome();assert.equal(p.progress().history.length,1);assert.equal(p.progress().trips,1);assert.equal(p.progress().active,null);assert.equal(rules.digCost(10),10,'soil penalty ends at camp');
 camp.returnHome();assert.equal(p.progress().history.length,1,'return is idempotent');
 const before=state.coins;assert(p.claimGoal('album3'));assert.equal(state.coins,before+25);assert(!p.claimGoal('album3'));assert.equal(state.coins,before+25);assert(!p.claimGoal('not-a-goal'));
 state.atCamp=false;assert(!p.claimGoal('album10'));state.atCamp=true;
 m('storage').save();const reload=await newRun(r.store.get('last-signal-v1'));assert(!reload.modules.get(root+'/js/progression.js').namespace.claimGoal('album3'));
 const backup=m('backup-format');const text=backup.createBackup(state);assert.deepEqual(JSON.parse(JSON.stringify(backup.parseBackup(text).state.progress)),JSON.parse(JSON.stringify(state.progress)));
 for(const mutate of [s=>s.progress.claimed.push('album3'),s=>s.progress.visited.push(999),s=>s.progress.finds=-1,s=>s.progress.history[0].condition=99,s=>s.route='bad']){const bad=JSON.parse(text);mutate(bad.state);assert.throws(()=>backup.parseBackup(JSON.stringify(bad)));}
 for(const route of data.routes){for(let i=0;i<500;i++)assert(route.pool.includes(world.rollLocation(route)));}
 for(const loc of locs){assert(Math.abs(loc.kinds.reduce((a,b)=>a+b)-1)<1e-9);for(const roll of [.1,.5,.95]){const l=world.siteProfile(loc,roll);assert(Math.abs(l.kinds.reduce((a,b)=>a+b)-1)<1e-9);if(roll===.1)assert(l.kinds[0]>=.94);}}
 for(let i=0;i<15;i++){p.startLeg(25,0);p.endLeg();}assert.equal(p.progress().history.length,12);assert.equal(p.progress().trips,1,'empty travel cannot complete result goals');
 state.coins=0;state.route='distant';assert.equal(rules.travelCost(),0);camp.depart();assert.equal(state.location,0);assert.equal(state.progress.active.condition,0);assert.equal(state.coins,0);
 const legacy=await newRun(golden.fixtures.find(x=>x.name==='active trip').saved);const ls=legacy.modules.get(root+'/js/storage.js').namespace.s;assert(!ls.progress);legacy.modules.get(root+'/js/camp.js').namespace.returnHome();assert(!ls.progress,'no invented history for old trip');
 console.log('PASS routes/locks/costs, saved soil and objects, single-count finds, one-time rewards, 12-trip history, backups, legacy trip, emergency fallback and poor-site luck');
})().catch(e=>{console.error(e);process.exit(1)});
