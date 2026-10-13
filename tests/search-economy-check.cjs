const {newRun,root,assert}=require('./harness.cjs');
(async()=>{
 const r=await newRun(),mod=f=>r.modules.get(root+'/js/'+f+'.js').namespace;
 const det=mod('detector'),search=mod('search'),s=mod('storage').s,shop=mod('shop');
 const target=(type,x,depth=0)=>({type,x,y:.5,depth,condition:60,dug:false});
 // A closer, deep small object used to hide an audible target entirely.
 const weak=target(10,.5,2),strong=target(8,.8);
 assert.equal(det.readTarget(weak,.64,.5,1).power,0);
 assert(det.readTarget(strong,.64,.5,1).power>10);
 assert.equal(det.sampleSignal([weak,strong],.64,.5,1).obj,strong);
 assert.deepEqual(det.sampleSignal([weak,strong],.64,.5,1),det.sampleSignal([strong,weak],.64,.5,1));
 for(let level=1;level<=10;level++)for(const depth of [0,1,2]) {
  const o=target(4,.5,depth);let previous=101;
  for(let i=0;i<=100;i++) {
   const offset=i*.004,left=det.readTarget(o,.5-offset,.5,level),right=det.readTarget(o,.5+offset,.5,level);
   assert(left.power<=previous,'single target fades monotonically');assert.equal(left.power,right.power,'sweep symmetry');previous=left.power;
  }
  assert.equal(previous,0);assert(det.readTarget(o,.5,.5,level).power>=60,'starter can detect deep targets');
 }
 const pair=[target(0,.44),target(4,.56)];let last=null;
 for(let i=0;i<=240;i++) {
  const reading=det.sampleSignal(pair,.38+i*.001,.5,4);
  assert(reading.power>0,'no blank seam between overlapping targets');
  if(last){assert(Math.abs(reading.power-last.power)<=2);assert(Math.abs(reading.id-last.id)<=5,'no artificial ID discontinuity');}
  assert.deepEqual(reading,det.sampleSignal([...pair].reverse(),.38+i*.001,.5,4));last=reading;
 }
 const crowded=[target(4,.5),target(0,.60)];
 const own8=det.readTarget(crowded[0],.5,.5,8),mix8=det.sampleSignal(crowded,.5,.5,8);
 const own9=det.readTarget(crowded[0],.5,.5,9),mix9=det.sampleSignal(crowded,.5,.5,9);
 assert(Math.abs(mix9.id-own9.id)<Math.abs(mix8.id-own8.id),'separation reduces neighbour contamination');
 assert(mix9.stability>mix8.stability);
 const snapshot=JSON.stringify(crowded);for(let i=0;i<100;i++)det.sampleSignal(crowded,.5+i*.001,.5,10);assert.equal(JSON.stringify(crowded),snapshot);
 // Signal dominance cannot redirect a hole or apply the neighbour's cheap cost.
 s.atCamp=false;s.pending=null;s.level=s.shovel=1;s.x=s.y=.5;s.energy=100;if(s.progress)s.progress.active=null;
 const under=target(10,.5,2),nearby=target(8,.59);s.objects=[under,nearby];
 assert.equal(search.signal().obj,nearby);assert.equal(search.nearest().obj,under);assert.equal(search.digInfo().cost,15);
 search.dig();assert.equal(s.energy,85);assert.equal(s.pending.type,under.type);assert.equal(s.pending.spent,15);assert(under.dug);assert(!nearby.dug);
 s.pending=null;r.elements.get('excavate').open=false;s.energy=0;const state=JSON.stringify(s);search.dig();assert.equal(JSON.stringify(s),state);
 console.log('PASS stronger neighbour detection, symmetric smooth sweeps, no blank seams/ID jumps, separation, physical dig/cost and no scan mutation');
 s.atCamp=true;s.route='distant';s.collection=Array.from({length:24},(_,i)=>i);s.coins=120;
 assert(shop.purchaseBudgetNote(120).includes('безкоштовне'));
 assert(shop.purchaseBudgetNote(90).includes('бракуватиме 20'));
 assert(shop.purchaseBudgetNote(60).includes('ще 10'));
 assert.equal(shop.purchaseBudgetNote(121),'');
 s.route='wander';assert(shop.purchaseBudgetNote(90).includes('ще 5'));
 s.level=s.shovel=s.backpack=1;s.coins=120;s.pending=null;
 shop.upgradeGear('detector');assert.equal(s.coins,0);assert.equal(s.level,2);assert(mod('rules').emergencyAllowed());
 mod('camp').depart();assert.equal(s.coins,0);assert(s.emergency);assert(s.objects.length>=3);
 console.log('PASS exact upgrade budget/route notes, unchanged purchase choice and zero-money recovery site');
})().catch(e=>{console.error(e);process.exitCode=1});
