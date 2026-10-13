const {newRun,root,assert}=require('./harness.cjs');
(async()=>{
 const r=await newRun(),mod=f=>r.modules.get(root+'/js/'+f+'.js').namespace;
 const gear=r.modules.get(root+'/data/gear.js').namespace,storage=mod('storage'),s=storage.s,controls=mod('detector-controls'),detector=mod('detector'),audio=mod('audio'),format=mod('backup-format');
 assert.deepEqual(Object.values(gear.gearCosts).map(a=>a.reduce((x,y)=>x+y,0)),[75410,65510,65510]);
 assert.equal(gear.detectorMilestones.length,9);assert.equal(gear.detectorMilestones[8][0],10);
 for(let level=1;level<=10;level++){
  const f=gear.detectorFeatures(level);
  assert.equal(Object.values(f).filter(Boolean).length,level-1);
  s.level=level;s.atCamp=false;s.detectorSettings={mode:'search',ironQuiet:false};
  assert.equal(controls.setDetectorMode('pinpoint'),level>=3);assert.equal(gear.detectorSettings(s).mode,level>=3?'pinpoint':'search');
  assert.equal(controls.setDetectorMode('deep'),level===10);assert.equal(controls.toggleIronQuiet(),level>=5);
 }
 assert.equal(controls.setDetectorMode('invalid'),false);
 s.atCamp=true;assert.equal(controls.setDetectorMode('pinpoint'),false);
 s.atCamp=false;s.pending={type:0,condition:40,spent:5};assert.equal(controls.setDetectorMode('search'),false);s.pending=null;
 console.log('PASS full progression cost preserved, one feature per tier 2–10, locked functions, camp and pending guards');
 const obj={x:.5,y:.5,type:0,depth:2,condition:65,dug:false};
 const plain=detector.readTarget(obj,.5,.5,6,0,{soil:0}),hard=detector.readTarget(obj,.5,.5,6,0,{soil:2}),oldHard=detector.readTarget(obj,.5,.5,5,0,{soil:2});
 assert(hard.stability>oldHard.stability);assert(plain.stability>=hard.stability);
 const crowded8=detector.readTarget(obj,.5,.5,8,.8),crowded9=detector.readTarget(obj,.5,.5,9,.8);
 assert(crowded9.stability>crowded8.stability);assert(crowded9.interference);
 const normal=detector.readTarget(obj,.65,.5,10,0,{mode:'search'}),deep=detector.readTarget(obj,.65,.5,10,0,{mode:'deep'});
 assert(deep.power>normal.power);assert.equal(deep.mode,'deep');assert.equal(detector.readTarget(obj,.5,.5,9,0,{mode:'deep'}).mode,'search');
 const iron=detector.readTarget({...obj,depth:0},.5,.5,5,0,{ironQuiet:true});assert(iron.quiet);assert(iron.power>0);assert(audio.toneSettings(iron).gain<audio.toneSettings({...iron,quiet:false}).gain);
 const locked=detector.readTarget({...obj,depth:0},.5,.5,4,0,{ironQuiet:true});assert.equal(locked.quiet,false);
 console.log('PASS ground compensation, nearby-target separation, deep mode response and audio-only iron suppression');
 s.level=7;s.x=.5;s.y=.5;s.objects=[obj];s.detectorSettings={mode:'pinpoint',ironQuiet:true};
 const emit=(type,event)=>r.elements.get('field').listeners[type].forEach(fn=>fn(event));
 emit('keydown',{key:'ArrowRight',preventDefault(){}});assert(Math.abs(s.x-.505)<1e-10);
 emit('pointerdown',{pointerId:1,clientX:90,clientY:100,button:0});
 const start=s.x;emit('pointermove',{pointerId:1,clientX:190,clientY:100,pointerType:'touch'});r.flushFrames();
 assert(Math.abs(s.x-start-100/360*.45)<1e-10);emit('pointerup',{pointerId:1});
 for(let i=0;i<50;i++)controls.recordReading({power:i},s.objects);
 assert.equal(controls.currentTrail(s.objects).length,32);assert.equal(controls.currentTrail([]).length,0);
 const text=format.createBackup(s),copy=format.parseBackup(text).state;assert.equal(copy.detectorSettings.mode,'pinpoint');assert(copy.detectorSettings.ironQuiet);
 storage.save();const again=await newRun(r.store.get(storage.KEY));assert.deepEqual(again.state().detectorSettings,{mode:'pinpoint',ironQuiet:true});
 for(const settings of [null,{mode:'warp',ironQuiet:false},{mode:'search',ironQuiet:'yes'}]){
  const invalid=JSON.parse(text);invalid.state.detectorSettings=settings;assert.throws(()=>format.parseBackup(JSON.stringify(invalid)));
 }
 console.log('PASS fine keyboard and anchored touch movement, bounded/resettable trace, modes saved through reload and backups');
})().catch(e=>{console.error(e);process.exit(1)});
