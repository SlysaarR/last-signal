const {newRun,root,assert,golden}=require('./harness.cjs');
const plain=v=>JSON.parse(JSON.stringify(v));
const ns=(r,name)=>r.modules.get(root+'/js/'+name+'.js').namespace;
const data=(r,name)=>r.modules.get(root+'/data/'+name+'.js').namespace;
const close=r=>r.elements.get('modalClose').onclick();
const active=(r)=>data(r,'atlas').activeSite(ns(r,'storage').s);
const copyField=s=>plain(Object.fromEntries(['objects','holes','survey','x','y','site','fieldMarks'].filter(k=>s[k]!==undefined).map(k=>[k,s[k]])));
const addCollection=(r,n=24)=>{const s=ns(r,'storage').s;const types=JSON.parse(r.catalog());for(let id=0;id<types.length&&s.collection.length<n;id++)if(types[id].kind!=='trash'){s.collection.push(id);s.best[id]=95;}};
function take(r,target){
 const s=ns(r,'storage').s;s.x=target.x;s.y=target.y;s.energy=ns(r,'rules').maxEnergy();
 ns(r,'search').dig();assert(s.pending);ns(r,'excavation').collectPending();ns(r,'packing').resolvePacking('take');assert(!s.pending);
}
(async()=>{
 const r=await newRun(),m=name=>ns(r,name),s=m('storage').s,el=id=>r.elements.get(id);
 assert.equal(s.atlas,undefined,'legacy startup shape stays compatible');
 s.coins=1000;addCollection(r);s.route='rural';s.energy=74;s.foodUsed=30;
 assert(m('camp').depart());close(r);assert.equal(s.coins,965);assert.equal(s.foodUsed,0);assert.equal(s.energy,74);
 const siteA=active(r),idA=siteA.id,soilA=siteA.condition,initial=copyField(s);assert.equal(siteA.field,null);assert.equal(siteA.route,'rural');
 const target=s.objects[0];s.x=target.x;s.y=target.y;assert(m('field-notes').toggleFieldMark());s.survey=[0,1,20];take(r,target);
 const first=copyField(s),count=s.bag.length,finds=s.progress.finds,remaining=s.objects.filter(o=>!o.dug).length;
 assert.equal(s.objects[0].dug,true);assert.equal(s.atlas.sites.length,1);
 m('camp').returnHome();assert(s.atCamp);assert.equal(s.atlas.activeId,null);assert.equal(s.atlas.selectedId,null);assert.deepEqual(plain(siteA.field),first);assert.equal(s.objects.length,0);assert.equal(s.survey.length,0);assert.equal(siteA.found,1);
 const saved=r.store.get('last-signal-v1'),reload=await newRun(saved);assert.deepEqual(reload.state(),r.state());
 const backup=m('backup-format'),roundtrip=backup.parseBackup(backup.createBackup(s)).state;assert.deepEqual(plain(roundtrip.atlas),plain(s.atlas));
 // A saved destination keeps its original fare even if the scouting direction changes.
 s.route='distant';m('atlas-state').selectSite(idA);assert.equal(m('rules').travelCost(),35);
 s.energy=88;const before=s.coins,random=r.context.Math.random;
 r.context.Math.random=()=>{throw Error('Returning must not roll any random values');};
 assert(m('camp').depart());close(r);r.context.Math.random=random;
 assert.deepEqual(copyField(s),first);assert.equal(s.coins,before-35);assert.equal(s.energy,88);assert.equal(s.progress.active.condition,soilA);assert.equal(siteA.visits,2);assert.equal(siteA.field,null);assert.equal(s.atlas.sites.length,1);
 assert.equal(s.bag.length,count);assert.equal(s.progress.finds,finds);assert.equal(s.objects.filter(o=>!o.dug).length,remaining);
 s.energy=100;s.x=target.x;s.y=target.y;m('search').dig();assert(!s.pending);assert.equal(s.bag.length,count,'dug object cannot be awarded again');
 // New pending work is owned by this field. Neither travel nor deletion can bypass it.
 const next=s.objects.find(o=>!o.dug);s.x=next.x;s.y=next.y;s.energy=100;m('search').dig();assert(s.pending);
 const frozen=plain(s.atlas),money=s.coins,day=s.day;
 assert(!m('camp').depart());m('camp').returnHome();m('atlas-ui').openAtlas();assert.equal(s.day,day);assert.equal(s.coins,money);assert(!s.atCamp);assert.deepEqual(plain(s.atlas),frozen);
 const pendingReload=await newRun(r.store.get('last-signal-v1'));assert(pendingReload.state().pending);assert.equal(pendingReload.state().atlas.activeId,idA);assert(pendingReload.elements.get('excavate').open);
 m('excavation').collectPending();m('packing').resolvePacking('take');m('camp').returnHome();assert.equal(siteA.found,2);assert.equal(s.progress.trips,0);
 m('atlas-state').selectSite(idA);m('camp').depart();close(r);take(r,s.objects.find(o=>!o.dug));m('camp').returnHome();assert.equal(siteA.found,3);assert(siteA.productive);assert.equal(s.progress.trips,1,'three finds across visits count one physical site');
 assert.equal(s.progress.history[0].siteId,idA);assert(s.progress.history[0].qualifiedSite);
 for(let i=0;i<3;i++){m('atlas-state').selectSite(idA);m('camp').depart();close(r);m('camp').returnHome();}
 assert.equal(s.progress.trips,1,'empty returns cannot repeat result goals');assert.equal(s.progress.history[0].qualifiedSite,false);
 console.log('PASS exact field/soil/marks/coil restore, no RNG reroll, original fare, unchanged energy, dug-item conservation, pending guards, backup/reload and one productive award across visits');
 // Move between two sites in one trip: food/energy/trip budget continue.
 m('atlas-state').selectSite(null);s.route='water';m('camp').depart();close(r);const siteB=active(r),idB=siteB.id;
 s.energy=41;s.foodUsed=50;s.survey=[90];s.x=.25;s.y=.7;assert(m('field-notes').toggleFieldMark());const fieldB=copyField(s);
 m('atlas-state').selectSite(idA);const fare=m('rules').travelCost(),cash=s.coins,travel=s.travelSpent;
 m('camp').depart();close(r);assert.equal(s.energy,41);assert.equal(s.foodUsed,50);assert.equal(s.coins,cash-fare);assert.equal(s.travelSpent,travel+fare);assert.deepEqual(plain(siteB.field),fieldB);
 m('atlas-state').selectSite(idB);m('camp').depart();close(r);assert.deepEqual(copyField(s),fieldB);assert.equal(s.energy,41);assert.equal(s.foodUsed,50);
 m('storage').save();const between=await newRun(r.store.get('last-signal-v1'));assert.deepEqual(between.state().atlas,plain(s.atlas));assert.deepEqual(copyField(ns(between,'storage').s),fieldB);
 m('camp').returnHome();
 // Fill the map without silently throwing away an existing field.
 s.coins=10000;s.bag=[];
 while(s.atlas.sites.length<6){m('atlas-state').selectSite(null);m('camp').depart();close(r);m('camp').returnHome();}
 assert.equal(s.atlas.sites.length,6);assert(!m('rules').canLeave());const full=plain(s),persisted=r.store.get('last-signal-v1');assert(!m('camp').depart());assert.deepEqual(plain(s),full);assert.equal(r.store.get('last-signal-v1'),persisted);
 m('atlas-ui').openAtlas();assert(!el('atlas').hidden);assert(el('atlasScout').disabled);assert.match(el('atlasCapacity').textContent,/6/);
 // Forget is explicit, cancelable and cannot discard inventory or collection.
 const beforeForget=plain([s.bag,s.stash,s.collection,s.best]),deleted=s.atlas.sites.at(-1).id;
 const click=(id,key,value)=>el(id).listeners.click[0]({target:{closest:selector=>selector==='[data-'+key+']'?{dataset:{[key==='atlas-forget'?'atlasForget':'atlasPick']:String(value)}}:null}});
 click('atlasSites','atlas-forget',deleted);assert(el('modal').open);el('modalCancel').onclick();assert.equal(s.atlas.sites.length,6);
 click('atlasSites','atlas-forget',deleted);close(r);assert.equal(s.atlas.sites.length,5);assert.deepEqual(plain([s.bag,s.stash,s.collection,s.best]),beforeForget);assert(!el('atlasScout').disabled);
 const highID=s.atlas.nextId;m('atlas-state').selectSite(null);m('camp').depart();close(r);assert.equal(active(r).id,highID);assert(!m('atlas-state').forgetSite(idA),'deleting is camp-only');
 const knownIds=s.atlas.sites.map(v=>v.id);assert(!knownIds.includes(deleted));assert.equal(new Set(knownIds).size,6);
 m('camp').returnHome();
 // Poor-road fallback still exists; selecting a rich place cannot turn its fare free.
 s.coins=0;m('atlas-state').selectSite(idA);assert.equal(m('rules').travelCost(),35);assert(!m('rules').canLeave());
 m('atlas-state').forgetSite(highID);m('atlas-state').selectSite(null);assert.equal(m('rules').travelCost(),0);assert(m('rules').canLeave());m('camp').depart();close(r);const poor=active(r);assert(poor.emergency);assert.equal(poor.route,'wander');assert.equal(poor.location,0);assert.equal(s.coins,0);m('camp').returnHome();
 m('atlas-state').selectSite(poor.id);assert.equal(m('rules').travelCost(),0);s.coins=25;assert.equal(m('rules').travelCost(),25);assert(m('rules').canLeave());
 console.log('PASS field-to-field food/energy/budget continuity, six-site cap, cancel/confirm deletion, stable IDs, no lost inventory and no free rich-site travel');
 // All new data is strictly checked; malformed copies are rejected without replacing the original.
 const text=backup.createBackup(s);const invalid=[
  v=>v.atlas.version=2,v=>v.atlas.nextId=v.atlas.sites[0].id,v=>v.atlas.selectedId=999999,v=>v.atlas.activeId=idA,
  v=>v.atlas.sites.push(plain(v.atlas.sites[0])),v=>v.atlas.sites[0].field=null,v=>v.atlas.sites[0].location=90,
  v=>v.atlas.sites[0].condition=9,v=>v.atlas.sites[0].route='unknown',v=>v.atlas.sites[0].visits=0,
  v=>v.atlas.sites[0].field.objects[0].type=999999,v=>v.atlas.sites[0].field.objects[0].depth=8,
  v=>v.atlas.sites[0].field.fieldMarks=Array(9).fill({x:.2,y:.5}),v=>v.atlas.sites[0].field.survey=[999],
  v=>v.atlas.sites[0].field.site={version:1,seed:-1},v=>v.atlas.sites[0].lastDay=v.day+1,
  v=>{v.atlas.sites[0].productive=true;v.atlas.sites[0].found=0;}
 ];
 for(const mutate of invalid){const bad=JSON.parse(text);mutate(bad.state);assert.throws(()=>backup.parseBackup(JSON.stringify(bad)));}
 const bad=JSON.parse(text).state;bad.atlas.selectedId=99999;const raw=JSON.stringify({version:1,state:bad}),protectedRun=await newRun(raw);assert.equal(protectedRun.store.get('last-signal-v1'),raw);assert.equal(protectedRun.elements.get('saveNote').hidden,false);
 // Imported state owns all references; no aliases to the previous map survive a restore.
 const imported=backup.parseBackup(text).state;m('storage').installBackupState(imported,backup.createBackup(s));const oldX=s.atlas.sites[0].field.x;imported.atlas.sites[0].field.x=.9;assert.equal(s.atlas.sites[0].field.x,oldX);assert(m('storage').save());
 console.log('PASS strict atlas metadata/field validation, corrupt-save protection and independent portable-backup ownership');
 // Legacy trips acquire a map record without inventing targets, marks, terrain or history.
 const legacy=await newRun(golden.fixtures.find(f=>f.name==='active trip').saved),ls=ns(legacy,'storage').s,old=copyField(ls),oldDay=ls.day;
 ns(legacy,'atlas-ui').openAtlas();const legacySite=active(legacy);assert.equal(legacySite.createdDay,oldDay);assert.deepEqual(copyField(ls),old);assert(!ls.progress);
 ns(legacy,'camp').returnHome();assert(!ls.progress);assert.deepEqual(plain(legacySite.field),old);
 ns(legacy,'atlas-state').selectSite(legacySite.id);ls.coins=100;ns(legacy,'camp').depart();close(legacy);assert.deepEqual(copyField(ls),old);assert.equal(active(legacy).createdDay,oldDay);
 // An explicitly saved empty field is a valid exhausted field, not permission to generate again.
 ls.objects=[];ns(legacy,'storage').save();const empty=await newRun(legacy.store.get('last-signal-v1'));assert.equal(empty.state().objects.length,0);assert.equal(empty.state().atlas.activeId,legacySite.id);
 // Dormant fields never enter rendering or signal calculations; their buried objects are not read by map cards.
 const perf=await newRun(saved),ps=ns(perf,'storage').s;ps.atlas.sites[0].field.objects=new Proxy(ps.atlas.sites[0].field.objects,{get(){throw Error('Dormant loot read during map rendering');}});
 ns(perf,'ui').showTab('atlas');assert.match(perf.elements.get('atlasSites').innerHTML,/Пройдено/);assert(!/Залишилося.*знахід/.test(perf.elements.get('atlasSites').innerHTML));
 let hiddenWrites=0;Object.defineProperty(perf.elements.get('atlasSites'),'innerHTML',{get:()=>'',set:()=>{hiddenWrites++;}});
 perf.elements.get('atlas').hidden=true;ns(perf,'ui').render();assert.equal(hiddenWrites,0);
 console.log('PASS exact legacy migration, saved empty field, no hidden-loot disclosure and no dormant-field render work');
})().catch(error=>{console.error(error);process.exitCode=1;});
