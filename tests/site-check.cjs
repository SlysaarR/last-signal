const {newRun,root,assert,golden}=require('./harness.cjs'),fs=require('node:fs');
const plain=x=>JSON.parse(JSON.stringify(x));
(async()=>{
 const run=await newRun(),m=name=>run.modules.get(root+'/js/'+name+'.js').namespace;
 const s=m('storage').s,world=m('world'),geo=run.modules.get(root+'/data/site-layout.js').namespace;
 const locations=run.modules.get(root+'/data/locations.js').namespace.locations;
 const {fixtures}=JSON.parse(fs.readFileSync(root+'/tests/site-loot-fixtures.json','utf8'));
 for(const fixture of fixtures){
   let n=fixture.seed;run.context.Math.random=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};
   Object.assign(s,{day:37,location:fixture.location,emergency:false,atCamp:false});world.generate();
   assert.deepEqual(plain(s.objects.map(({type,condition,depth})=>({type,condition,depth}))),fixture.loot,'exact previous loot stream');
   assert.equal(run.context.Math.random(),fixture.next,'next RNG value unchanged');
 }
 function activityDistance(layout,p){
   let min=Infinity;
   for(const path of layout.paths)for(let i=1;i<path.points.length;i++){
     const a=path.points[i-1],b=path.points[i],dx=b.x-a.x,dy=(b.y-a.y)*720/880;
     const px=p.x-a.x,py=(p.y-a.y)*720/880,t=Math.max(0,Math.min(1,(px*dx+py*dy)/(dx*dx+dy*dy||1)));
     min=Math.min(min,Math.hypot(px-t*dx,py-t*dy));
   }
   for(const f of layout.features)if(['foundation','logs'].includes(f.kind))min=Math.min(min,geo.siteDistance(p,f));
   if(layout.water){const w=layout.water;min=Math.min(min,Math.abs((w.edge==='right'?p.x:p.y)-geo.shorelineAt(w,w.edge==='right'?p.y:p.x)));}
   return min;
 }
 let actualNear=0,uniformNear=0,total=0,outside=0;
 for(const loc of locations)for(let i=0;i<64;i++){
   const layout=geo.createSiteLayout(loc.terrain,7711+i*7399),random=geo.siteRandom(i+101),count=loc.terrain==='beach'?29:26;
   const items=Array.from({length:count},(_,index)=>({type:index,condition:index%101,depth:index%3,dug:false}));
   const unchanged=JSON.stringify(items);geo.placeSiteObjects(items,layout);
   assert.equal(JSON.stringify(items.map(({x,y,...rest})=>rest)),unchanged,'only positions change');
   for(const [index,p] of items.entries()){
     assert(geo.searchablePoint(layout,p),'all targets on searchable dry land');
     assert(items.slice(0,index).every(q=>geo.siteDistance(p,q)>.085),'minimum signal separation');
     const near=activityDistance(layout,p)<.12;actualNear+=near;outside+=!near;
     let uniform;do{uniform={x:.08+random()*.84,y:.08+random()*.84};}while(!geo.searchablePoint(layout,uniform));
     uniformNear+=activityDistance(layout,uniform)<.12;total++;
   }
   const other=Array.from({length:count},()=>({type:999,condition:0,depth:2,dug:false}));geo.placeSiteObjects(other,layout);
   assert.deepEqual(plain(other.map(({x,y})=>({x,y}))),plain(items.map(({x,y})=>({x,y}))),'valuable types receive no preferred positions');
 }
 assert(actualNear/total>uniformNear/total+.035,'activity leaves a modest measurable spatial bias');
 assert(outside/total>.15,'search outside landmarks remains useful');
 const backup=m('backup-format'),saved=run.store.get('last-signal-v1'),restored=await newRun(saved);
 assert.deepEqual(restored.state().site,plain(s.site));assert.deepEqual(restored.state().objects,plain(s.objects),'reload never regenerates a site');
 assert.deepEqual(plain(backup.parseBackup(backup.createBackup(s)).state.site),plain(s.site));
 const legacy=await newRun(golden.fixtures.find(f=>f.name==='active trip').saved);
 assert.equal(legacy.state().site,undefined,'legacy trip never receives inferred new geography');
 const before=JSON.stringify(s.objects);m('ui').showTab('search');m('graphics/field').paintTerrain(m('graphics/field').ctx);assert.equal(JSON.stringify(s.objects),before);
 const source=backup.createBackup(s);
 for(const mutate of [v=>v.site.version=9,v=>v.site.seed=-1,v=>v.site.seed=2**32,v=>v.fieldMarks=[{x:2,y:0}],v=>v.fieldMarks=Array(9).fill({x:.5,y:.5}),v=>v.fieldMarks=[{x:.5,y:.5},{x:.5,y:.5}]]){
   const bad=JSON.parse(source);mutate(bad.state);assert.throws(()=>backup.parseBackup(JSON.stringify(bad)));
 }
 console.log('PASS 32 pre-update loot/RNG fixtures; 512 layouts, dry-land placement and separation; type-blind coordinates; exact reload/backup and unchanged legacy trip');
 console.log(JSON.stringify({targets:total,withinActivityBand:Math.round(actualNear/total*1000)/10,uniformReference:Math.round(uniformNear/total*1000)/10,outsideBand:Math.round(outside/total*1000)/10}));
})().catch(e=>{console.error(e);process.exit(1)});
