const {newRun,root,assert,golden}=require('./harness.cjs');
const plain=value=>JSON.parse(JSON.stringify(value));
const ns=(run,name)=>run.modules.get(root+'/js/'+name+'.js').namespace;
const data=(run,name)=>run.modules.get(root+'/data/'+name+'.js').namespace;
const close=run=>run.elements.get('modalClose').onclick();
function keep(run,action='take') {
 const s=ns(run,'storage').s,target=s.objects.find(o=>!o.dug);
 assert(target);s.x=target.x;s.y=target.y;
 ns(run,'search').dig();assert(s.pending);
 ns(run,'excavation').collectPending();ns(run,'packing').resolvePacking(action);
}
(async()=>{
 const run=await newRun(),s=ns(run,'storage').s,ui=ns(run,'ui'),guide=ns(run,'guide-ui'),model=data(run,'guide');
 assert(!run.elements.get('guideCard').hidden);assert.equal(s.guide,undefined);
 const before=JSON.stringify(s),random=run.context.Math.random;
 run.context.Math.random=()=>{throw Error('guide cannot use loot RNG');};
 for(let i=0;i<50;i++){guide.renderGuide();guide.openGuide();run.elements.get('helpDialog').close();}
 assert.equal(JSON.stringify(s),before);assert.equal(run.frames.size,0);
 run.elements.get('guideAction').onclick();assert.deepEqual(plain(s.guide),{version:1,enabled:true,stage:0});
 const withoutGuide=plain(s);delete withoutGuide.guide;assert.equal(JSON.stringify(withoutGuide),before);
 run.context.Math.random=random;
 // Departure and cancellation use the original game's confirmation and prices.
 run.elements.get('guideAction').onclick();assert(run.elements.get('modal').open);
 run.elements.get('modalCancel').onclick();assert(s.atCamp);assert.equal(s.guide.stage,0);
 run.elements.get('guideAction').onclick();close(run);close(run);assert(!s.atCamp);assert.equal(s.guide.stage,1);
 // Identical seed produces identical saved field and economy with or without help.
 const control=await newRun();ns(control,'camp').depart();close(control);
 const guided=plain(s);delete guided.guide;assert.deepEqual(guided,control.state());
 guide.openGuide();const frozen=JSON.stringify(s);assert(ui.busy());ns(run,'search').dig();assert.equal(JSON.stringify(s),frozen);
 assert.equal(run.elements.get('weatherLayer').dataset.running,'false');run.elements.get('helpDialog').close();
 // Leaving a find does not complete the take step. Pending reload is recoverable.
 keep(run,'leave');assert.equal(s.guide.stage,1);
 const target=s.objects.find(o=>!o.dug);s.x=target.x;s.y=target.y;ns(run,'search').dig();assert(s.pending);
 const pending=await newRun(run.store.get('last-signal-v1'));
 assert.equal(pending.state().guide.stage,1);assert(pending.elements.get('excavate').open);
 ns(run,'excavation').collectPending();ns(run,'packing').resolvePacking('take');assert.equal(s.guide.stage,2);
 // Context card follows a real return and a real sale; no completion rewards.
 const money=s.coins;run.elements.get('guideAction').onclick();close(run);
 assert(s.atCamp);assert.equal(s.guide.stage,3);assert.equal(s.coins,money);
 const save=run.store.get('last-signal-v1'),reload=await newRun(save);assert.equal(reload.state().guide.stage,3);
 const format=ns(run,'backup-format');assert.deepEqual(plain(format.parseBackup(format.createBackup(s)).state.guide),plain(s.guide));
 const item=s.bag[0],price=ns(run,'rules').priceFor(item.type,item.condition);
 ns(run,'inventory').inventoryAction('sell','bag',0);if(run.elements.get('modal').open)close(run);
 assert.equal(s.guide.stage,4);assert.equal(s.coins,money+price);
 run.elements.get('guideDismiss').onclick();assert(!s.guide.enabled);assert(run.elements.get('guideCard').hidden);
 guide.openGuide();run.elements.get('guideToggle').onclick();assert(s.guide.enabled);assert.equal(s.guide.stage,0);
 // A paused guide resumes on existing progress. Skipping never erases gameplay.
 const skip=await newRun(),ss=ns(skip,'storage').s;
 skip.elements.get('guideDismiss').onclick();assert(!ss.guide.enabled);
 ns(skip,'camp').depart();close(skip);keep(skip);assert.equal(ss.guide.stage,2);
 const skipped=plain(ss);ns(skip,'guide-ui').openGuide();skip.elements.get('guideToggle').onclick();
 assert(ss.guide.enabled);assert.equal(ss.guide.stage,2);delete skipped.guide;const resumed=plain(ss);delete resumed.guide;assert.deepEqual(resumed,skipped);
 // Existing players receive no unsolicited guide state or dialog.
 for(const fixture of golden.fixtures.filter(v=>v.saved)) {
  const old=await newRun(fixture.saved);assert.equal(old.state().guide,undefined);assert(!old.elements.get('helpDialog').open);
 }
 // Valid guide states roundtrip; malformed incoming state cannot replace a save.
 for(const stage of [0,1,2,3,4])for(const enabled of [true,false])assert(model.validGuide({version:1,stage,enabled}));
 for(const value of [null,[],{version:2,stage:0,enabled:true},{version:1,stage:-1,enabled:true},{version:1,stage:5,enabled:true},{version:1,stage:1.5,enabled:true},{version:1,stage:0,enabled:'yes'}]) {
  assert(!model.validGuide(value));const corrupted=plain(s);corrupted.guide=value;
  assert.throws(()=>format.validateBackupState(corrupted));
  const raw=JSON.stringify({version:1,state:corrupted}),bad=await newRun(raw);assert.equal(bad.store.get('last-signal-v1'),raw);
 }
 // Single and reviewed album/sale paths count only after a confirmed mutation.
 for(const mode of ['album','sale']) {
  const r=await newRun(),st=ns(r,'storage').s,inventory=ns(r,'inventory');
  st.bag=[{type:208,condition:90},{type:208,condition:60}];model.startGuide(st);assert.equal(st.guide.stage,3);
  inventory.openInventoryReview(mode);assert.equal(st.guide.stage,3);r.elements.get('inventoryReview').close();assert.equal(st.guide.stage,3);
  inventory.openInventoryReview(mode);inventory.confirmInventoryReview();assert.equal(st.guide.stage,4);
 }
 console.log('PASS first-run offer, real guided loop, cancel/leave/reload/backup, identical loot and economy, paused resume, legacy saves, invalid state, confirmed batch actions, dialog pause and zero new frames');
})().catch(error=>{console.error(error);process.exit(1)});
