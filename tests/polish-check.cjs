const {newRun,root,golden,assert}=require('./harness.cjs');
const ns=(run,name)=>run.modules.get(root+'/js/'+name+'.js').namespace;
(async()=>{
  const active=golden.fixtures.find(f=>f.name==='active trip').saved;
  const run=await newRun(active), storage=ns(run,'storage'), excavation=ns(run,'excavation');
  ns(run,'search').dig();
  const energy=storage.s.energy;
  excavation.brushAt(220,180);
  const cells=JSON.stringify(storage.s.pending.cleanedCells), percent=run.elements.get('excPercent').textContent;
  assert.notEqual(percent,'0%');assert.notEqual(percent,'100%');
  run.context.document.visibilityState='hidden';
  run.listeners['document:visibilitychange'].forEach(fn=>fn());
  const resumed=await newRun(run.store.get(storage.KEY)), next=ns(resumed,'storage');
  assert.equal(JSON.stringify(next.s.pending.cleanedCells),cells);
  assert.equal(resumed.elements.get('excPercent').textContent,percent);
  assert.equal(next.s.energy,energy,'resuming a dig must not spend energy again');
  const ex=ns(resumed,'excavation');
  for(let y=130;y<=370;y+=40)for(let x=180;x<=420;x+=40)ex.brushAt(x,y);
  assert.equal(ex.phaseDone,true);assert.equal(resumed.elements.get('excPercent').textContent,'100%');
  const complete=await newRun(resumed.store.get(storage.KEY));
  assert.equal(ns(complete,'excavation').phaseDone,true,'completed cleaning survives restart before review');
  assert.equal(complete.elements.get('excNext').disabled,false);
  const before=complete.state().bag.length;
  ns(complete,'excavation').collectPending();
  ns(complete,'packing').resolvePacking('take');ns(complete,'packing').resolvePacking('take');
  assert.equal(complete.state().bag.length,before+1);assert.equal(complete.state().energy,energy);
  const format=ns(run,'backup-format'), backup=format.createBackup(storage.s);
  assert.equal(JSON.stringify(format.parseBackup(backup).state.pending.cleanedCells),cells);
  for(const value of [[-1],[256],[1,1],['2'],null]){
    const bad=JSON.parse(backup);bad.state.pending.cleanedCells=value;
    assert.throws(()=>format.parseBackup(JSON.stringify(bad)));
  }
  console.log('PASS partial and completed cleaning → hide/restart/backup → single find, unchanged energy');

  const fresh=await newRun(), valid=fresh.store.get(storage.KEY);
  const brokenStates=[
    s=>s.objects=[null],s=>s.bag=[{type:999999,condition:30}],s=>s.level=1.5,
    s=>s.coins=-1,s=>s.best={'9999':50},s=>s.pantry=[0,-1,0],
    s=>s.progress={claimed:['album3']}
  ];
  const invalid=['{broken',JSON.stringify({version:2,state:JSON.parse(valid).state}),...brokenStates.map(mutate=>{const v=JSON.parse(valid);mutate(v.state);return JSON.stringify(v)})];
  for(const original of invalid){
    const r=await newRun(original), st=ns(r,'storage');
    assert.equal(r.store.get(storage.KEY),original,'startup must keep bad save bytes');
    st.s.coins=123;assert.equal(st.save(),false);r.listeners.pagehide.forEach(fn=>fn());
    assert.equal(r.store.get(storage.KEY),original);
    assert.equal(r.elements.get('saveNote').hidden,false);
    const clean=JSON.parse(valid).state;
    st.installBackupState(clean,ns(r,'backup-format').createBackup(st.s));
    st.s.coins=10;assert.equal(st.save(),true);assert.equal(JSON.parse(r.store.get(st.KEY)).state.coins,10);
  }
  const retry=await newRun();const persist=retry.context.localStorage.setItem;
  retry.context.localStorage.setItem=()=>{throw Error('temporary quota')};
  assert.equal(ns(retry,'storage').save(),false);
  retry.context.localStorage.setItem=persist;
  assert.equal(ns(retry,'storage').save(),true);assert.equal(retry.elements.get('saveNote').hidden,true);
  console.log('PASS corrupt/unknown saves protected, explicit restore unlocks writes, transient write failure recovers');
  const oversized=JSON.parse(valid);oversized.state.food=[1000000,0,0];
  const migrated=await newRun(JSON.stringify(oversized));
  assert.equal(migrated.state().food[0]+migrated.state().pantry[0],1000000);
  assert.equal(migrated.state().food[0],8,'large old food stacks migrate without a per-item loop');
  const oldTrip=JSON.parse(active);delete oldTrip.state.found;delete oldTrip.state.earned;
  const returned=await newRun(JSON.stringify(oldTrip));ns(returned,'camp').returnHome();
  const returnedAgain=await newRun(returned.store.get(storage.KEY));
  assert.equal(returnedAgain.state().lastTrip.found,0,'old missing counters cannot corrupt return report');
  assert.equal(returnedAgain.elements.get('saveNote').hidden,true);

  const field=await newRun(active), state=ns(field,'storage').s, search=ns(field,'search');
  let hiddenWrites=0,detectorWrites=0;
  for(const id of ['tripSummary','foodShop','items','routeCards','bagItems']){
    const element=field.elements.get(id);let html=element.innerHTML;
    Object.defineProperty(element,'innerHTML',{get:()=>html,set:value=>{hiddenWrites++;html=value}});
  }
  const meter=field.elements.get('strength');let strength=meter.textContent;
  Object.defineProperty(meter,'textContent',{get:()=>strength,set:value=>{detectorWrites++;strength=value}});
  for(let i=0;i<60;i++)search.move({clientX:80+i,clientY:140});
  assert.equal(field.frames.size,1);field.flushFrames();
  assert.equal(detectorWrites,1);assert.equal(hiddenWrites,0,'coil movement cannot rebuild other screens');
  const canvas=field.elements.get('field'),emit=(type,e)=>canvas.listeners[type].forEach(fn=>fn(e));
  emit('pointerdown',{pointerId:1,clientX:60,clientY:60,button:0});
  const position=[state.x,state.y];
  emit('pointermove',{pointerId:2,clientX:300,clientY:300,pointerType:'touch'});
  assert.deepEqual([state.x,state.y],position,'second finger cannot jump the coil');
  emit('lostpointercapture',{pointerId:1});assert.equal(search.dragging,false);
  field.elements.get('coinDetail').showModal();const power=state.energy;
  search.dig();assert.equal(state.energy,power);assert(!state.pending);field.elements.get('coinDetail').close();
  state.level=100;state.x=.5;state.y=.5;state.objects=[{x:.54,y:.5,type:0,condition:50,depth:0,dug:false}];
  ns(field,'ui').renderDetector();assert(!field.elements.get('hint').textContent.includes('Можна копати'));
  state.objects[0].x=.52;ns(field,'ui').renderDetector();assert(field.elements.get('hint').textContent.includes('Можна копати'));
  console.log('PASS movement coalesced to one frame, no hidden-screen rebuilding, capture loss and exact dig hint');

  const art=await newRun(), catalog=JSON.parse(art.catalog()),collection=ns(art,'collection');
  const canvasArt=art.elements.get('detailArt'),button=art.elements.get('detailFlip');
  const snapshot=JSON.stringify(art.state());
  for(let id=0;id<catalog.length;id++){
    const t=catalog[id];if(t.kind==='trash')continue;
    collection.showItem(id);assert.equal(canvasArt.hidden,false);
    assert.equal(button.hidden,false);
    canvasArt.onkeydown({key:'ArrowRight',preventDefault(){}});art.flushFrames();
    assert(Number(canvasArt.dataset.yaw)>0);
    button.onclick();art.flushFrames();assert.equal(Number(canvasArt.dataset.yaw),0);
    art.elements.get('coinDetail').close();
  }
  assert.equal(JSON.stringify(art.state()),snapshot,'inspection cannot award items or alter saved collection');
  console.log('PASS every catalogue card, continuous rotation, keyboard control and non-coin meshes without state mutations');
})().catch(e=>{console.error(e);process.exit(1)});
