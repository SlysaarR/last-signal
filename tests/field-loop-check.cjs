const {newRun,root,golden,assert}=require('./harness.cjs');
const active=golden.fixtures.find(f=>f.name==='active trip').saved;
const ns=(r,name)=>r.modules.get(root+'/js/'+name+'.js').namespace;
const plain=x=>JSON.parse(JSON.stringify(x));
async function digRun(){const r=await newRun(active);ns(r,'search').dig();return r;}
const input=(x,y,pointerId=1)=>({clientX:x*.6,clientY:y*.6,pointerId,button:0});
const emit=(r,type,event)=>r.elements.get('soil').listeners[type].forEach(fn=>fn(event));
(async()=>{
 const r=await digRun(),st=ns(r,'storage'),ex=ns(r,'excavation'),el=id=>r.elements.get(id);
 const energy=st.s.energy;let writes=0,value=el('excPercent').textContent;
 Object.defineProperty(el('excPercent'),'textContent',{get:()=>value,set:v=>{writes++;value=v;}});
 emit(r,'pointerdown',input(210,160));
 for(let i=1;i<=60;i++)emit(r,'pointermove',input(210+i*1.2,160+Math.sin(i/8)*12));
 emit(r,'pointermove',input(600,500,2));
 assert.equal(r.frames.size,1);assert.equal(writes,0);assert.equal(st.s.pending.cleaning,undefined);
 r.flushFrames();assert.equal(writes,1,'one progress update for an input burst');
 const expected=new Set(),oldStamp=(x,y)=>{for(let row=0;row<16;row++)for(let col=0;col<16;col++)if(Math.hypot(180+col*16-x,130+row*16-y)<=57)expected.add(row*16+col);};
 let from={x:210,y:160};oldStamp(from.x,from.y);
 for(let i=1;i<=60;i++){const to={x:210+i*1.2,y:160+Math.sin(i/8)*12},steps=Math.max(1,Math.ceil(Math.hypot(to.x-from.x,to.y-from.y)/12));for(let n=1;n<=steps;n++)oldStamp(from.x+(to.x-from.x)*n/steps,from.y+(to.y-from.y)*n/steps);from=to;}
 assert.deepEqual([...ex.swept].sort((a,b)=>a-b),[...expected].sort((a,b)=>a-b),'bounded cell traversal preserves the old cleaning rule');
 assert(st.s.pending.cleaning.marks.length>5);assert(st.s.pending.cleanedCells.length>0);assert(!ex.phaseDone);
 const after=plain(st.s.pending);assert.equal(new Set(after.cleaning.marks).size,after.cleaning.marks.length);
 emit(r,'pointermove',input(320,185));emit(r,'lostpointercapture',{pointerId:1});
 assert.equal(r.frames.size,0);assert(!ex.brushDown);assert(st.s.pending.cleaning.marks.length>after.cleaning.marks.length,'capture loss flushes the final segment');
 const saved=r.store.get(st.KEY),again=await newRun(saved);
 assert.deepEqual(again.state().pending,plain(st.s.pending));assert.equal(again.elements.get('excPercent').textContent,value);assert.equal(again.state().energy,energy);
 const fixed=JSON.stringify(st.s.pending);writes=0;
 for(let i=0;i<50;i++)ex.brushAt(320,185);
 assert.equal(JSON.stringify(st.s.pending),fixed,'revisiting the same brush location is idempotent');assert.equal(writes,0);
 emit(r,'pointerdown',input(320,185));emit(r,'pointerup',input(350,190));assert(st.s.pending.cleaning.marks.length>after.cleaning.marks.length);assert(!ex.brushDown);
 // Corners of a fast path must survive coalescing; only keeping its endpoint
 // would paint a diagonal across an untouched region instead.
 const corner=await digRun(),cx=ns(corner,'excavation'),cs=ns(corner,'storage').s;
 emit(corner,'pointerdown',input(80,50));emit(corner,'pointermove',input(320,50));emit(corner,'pointermove',input(320,110));corner.flushFrames();
 const geometry=corner.modules.get(root+'/data/cleaning.js').namespace;
 const points=cs.pending.cleaning.marks.map(geometry.brushPoint);
 assert(points.some(([x,y])=>Math.abs(x-200)<8&&Math.abs(y-50)<8));
 assert(!points.some(([x,y])=>x>100&&x<250&&y>65),'no invented diagonal');
 // Extreme captured-pointer coordinates have bounded work and saved IDs.
 let visited=0;geometry.visitBrushSegment({x:-1e9,y:-1e9},{x:1e9,y:1e9},(x,y)=>{visited++;const id=geometry.brushMark(x,y);assert(id>=0&&id<geometry.MAX_BRUSH_MARKS);});assert(visited>0&&visited<100);
 let outside=0;geometry.visitBrushSegment({x:-500,y:-500},{x:-400,y:-300},()=>outside++);assert.equal(outside,0);
 for(const event of ['visibilitychange','pagehide']) {
   const q=await digRun(),s=ns(q,'storage'),before=s.s.energy;
   emit(q,'pointerdown',input(230,200));emit(q,'pointermove',input(310,200));
   if(event==='visibilitychange'){q.context.document.visibilityState='hidden';q.listeners['document:visibilitychange'].forEach(fn=>fn());}
   else q.listeners.pagehide.forEach(fn=>fn());
   assert.equal(q.frames.size,0);assert(!ns(q,'excavation').brushDown);
   const loaded=await newRun(q.store.get(s.KEY));assert(loaded.state().pending.cleaning.marks.length>0);
   assert.deepEqual(loaded.state().pending,plain(s.s.pending));assert.equal(loaded.state().energy,before);
 }
 const full=await digRun(),fe=ns(full,'excavation');emit(full,'pointerdown',input(180,130));
 for(let y=130;y<=370;y+=40)for(let x=180;x<=420;x+=40)emit(full,'pointermove',input(x,y));
 full.flushFrames();assert(fe.phaseDone);assert.equal(full.elements.get('excPercent').textContent,'100%');
 const fullState=ns(full,'storage'),fullReload=await newRun(full.store.get(fullState.KEY));assert(ns(fullReload,'excavation').phaseDone,'completion is saved at the end of the queued batch');
 // Flush overflow geometry without touching DOM or creating a half-valid save.
 const burst=await digRun(),bs=ns(burst,'storage'),be=ns(burst,'excavation');
 emit(burst,'pointerdown',input(50,50));for(let i=0;i<400;i++)emit(burst,'pointermove',input(50+i%200,50));
 ns(burst,'backup-format').validateBackupState(bs.s);assert.equal(bs.s.pending.cleaning,undefined);
 burst.flushFrames();assert(bs.s.pending.cleaning.marks.length>0);ns(burst,'backup-format').validateBackupState(bs.s);
 // An imported state invalidates queued work from the old find.
 emit(burst,'pointermove',input(300,220));const imported=plain(bs.s);delete imported.pending.cleaning;delete imported.pending.cleanedCells;
 bs.installBackupState(imported,ns(burst,'backup-format').createBackup(bs.s));burst.flushFrames();assert.equal(bs.s.pending.cleaning,undefined);
 be.openExcavation();emit(burst,'pointerdown',input(220,180));be.collectPending();assert(bs.s.pending.revealed);assert.equal(bs.s.pending.cleaning,undefined);assert.equal(bs.s.pending.cleanedCells,undefined);
 const beforeBag=bs.s.bag.length;ns(burst,'packing').resolvePacking('take');ns(burst,'packing').resolvePacking('take');assert.equal(bs.s.bag.length,beforeBag+1);burst.flushFrames();assert.equal(bs.s.pending,null);
 // Legacy cells remain the exact progress baseline when a first new stroke is saved.
 const old=JSON.parse(active);old.state.pending={type:0,condition:70,spent:5,cleanedCells:[0,1,16,17]};
 const legacy=await newRun(JSON.stringify(old)),ls=ns(legacy,'storage'),lx=ns(legacy,'excavation');
 assert.equal(ls.s.pending.cleaning,undefined);lx.brushAt(360,200);
 assert.deepEqual(plain(ls.s.pending.cleaning.base),[0,1,16,17]);
 const format=ns(legacy,'backup-format'),backup=format.createBackup(ls.s);assert.deepEqual(plain(format.parseBackup(backup).state.pending),plain(ls.s.pending));
 for(const change of [v=>v.cleaning=null,v=>v.cleaning.version=2,v=>v.cleaning.marks=[-1],v=>v.cleaning.marks=[geometry.MAX_BRUSH_MARKS],v=>v.cleaning.marks=[1,1],v=>v.cleaning.marks=['1'],v=>v.cleaning.base=[255],v=>v.cleaning.base=[0,0],v=>delete v.cleanedCells]) {
   const invalid=JSON.parse(backup);change(invalid.state.pending);assert.throws(()=>format.parseBackup(JSON.stringify(invalid)));
 }
 const bad=JSON.parse(backup);bad.state.pending.cleaning.marks=[-1];const badSave=JSON.stringify({version:1,state:bad.state});
 const protectedRun=await newRun(badSave);assert.equal(protectedRun.store.get(ls.KEY),badSave);
 console.log('PASS coalesced brush paths/corners, final-segment flush, bounded history, idempotent marks, hidden/pagehide/reload, stale restore cancellation, skip/take once, exact legacy progress and strict backup validation');

 const field=await newRun(active),s=ns(field,'storage').s,search=ns(field,'search'),ui=ns(field,'ui');
 const original=s.objects;let samples=0;
 s.objects=new Proxy(original,{get(target,key,receiver){if(key==='filter')samples++;return Reflect.get(target,key,receiver);}});
 const gameplay=JSON.stringify([s.energy,s.bag,s.best,original]);
 for(let i=0;i<60;i++)search.move({clientX:80+i,clientY:140});assert.equal(samples,0,'pointer events do not sample the field');
 field.flushFrames();assert.equal(samples,1,'audio, display, dig hint and coil share one signal sample');
 samples=0;ui.render();assert.equal(samples,1,'full field render also shares its reading');
 samples=0;field.elements.get('field').listeners.keydown.forEach(fn=>fn({key:'ArrowRight',preventDefault(){}}));assert.equal(samples,1);
 search.move({clientX:120,clientY:100});field.context.document.visibilityState='hidden';field.listeners['document:visibilitychange'].forEach(fn=>fn());samples=0;field.flushFrames();assert.equal(samples,0);assert.equal(field.frames.size,0);
 const pos=[s.x,s.y];search.move({clientX:260,clientY:200});assert.deepEqual([s.x,s.y],pos);
 assert.equal(JSON.stringify([s.energy,s.bag,s.best,original]),gameplay);s.objects=original;
 console.log('PASS 60 pointer moves share one signal calculation per frame; keyboard/full render also use one; hiding cancels queued work; no gameplay mutation');
})().catch(e=>{console.error(e);process.exit(1)});
