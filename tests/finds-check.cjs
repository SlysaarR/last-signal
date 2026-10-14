const {newRun,root,assert,createHash}=require('./harness.cjs');
const plain=v=>JSON.parse(JSON.stringify(v));
(async()=>{
 const run=await newRun(),ns=name=>run.modules.get(root+'/js/'+name+'.js').namespace;
 const types=JSON.parse(run.catalog()),s=ns('storage').s,world=ns('world'),orders=run.modules.get(root+'/data/orders.js').namespace;
 assert.equal(types.length,222);assert.equal(createHash('sha256').update(JSON.stringify(types.slice(0,208))).digest('hex'),'9864fb3a12de311b08f24a088e8602f790c994963cbc39122035e77d7d613508','all 208 published IDs and records stay exact');
 const added=types.slice(208);assert.equal(added.filter(t=>t.kind==='relic').length,10);assert.equal(added.filter(t=>t.kind==='jewel').length,4);assert.equal(new Set(added.map(t=>t.shape)).size,14);
 const locations=run.modules.get(root+'/data/locations.js').namespace.locations;
 let maxPriceShift=0;
 for(const loc of locations)for(const luck of [0,.5,.95]){
  const profile=world.siteProfile(loc,luck);
  for(const kind of ['trash','coin','relic','jewel']){
   const old=types.slice(0,208).map((t,id)=>({id,weight:world.itemWeight(t,id,profile)})).filter(x=>types[x.id].kind===kind&&!types[x.id].legacy),next=world.weightedPool(kind,profile);
   assert(next.every(x=>Number.isFinite(x.weight)&&x.weight>0));
   if(['coin','trash'].includes(kind))assert.deepEqual(plain(next),old,'exact old coin/trash weights');
   for(let rarity=0;rarity<4;rarity++){
    const mass=pool=>pool.filter(x=>types[x.id].rarity===rarity).reduce((sum,x)=>sum+x.weight,0);
    assert(Math.abs(mass(next)-mass(old))<1e-9,'rarity probability mass unchanged');
   }
   const mean=pool=>pool.reduce((sum,x)=>sum+x.weight*types[x.id].price,0)/pool.reduce((sum,x)=>sum+x.weight,0);
   const shift=Math.abs(mean(next)/mean(old)-1);maxPriceShift=Math.max(maxPriceShift,shift);assert(shift<.02,'expected base price drift below 2%');
  }
 }
 const probability=(id,loc)=>{const pool=world.weightedPool(types[id].kind,loc);return pool.find(x=>x.id===id).weight/pool.reduce((s,x)=>s+x.weight,0);};
 const terrain=name=>locations.find(l=>l.terrain===name);
 assert(probability(212,terrain('fair'))>probability(212,terrain('beach')),'seal favors trade terrain');
 assert(probability(214,terrain('orchard'))>probability(214,terrain('beach')),'household thimble favors orchard terrain');
 for(let i=208;i<222;i++)assert(world.weightedPool(types[i].kind,terrain('field')).some(x=>x.id===i&&x.weight>0));
 // Opening/viewing new entries does not mutate saves or eagerly create buffers.
 const stateBefore=JSON.stringify(s),graphics=ns('graphics/inspection');
 const ray=(model,origin,direction)=>{
  const sub=(a,b)=>a.map((v,i)=>v-b[i]),dot=(a,b)=>a.reduce((v,x,i)=>v+x*b[i],0),cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  let distance=Infinity;
  for(const t of model.triangles){const [a,b,c]=t.points,e1=sub(b,a),e2=sub(c,a),p=cross(direction,e2),det=dot(e1,p);if(Math.abs(det)<1e-10)continue;const v=sub(origin,a),u=dot(v,p)/det;if(u<0||u>1)continue;const q=cross(v,e1),w=dot(direction,q)/det;if(w<0||u+w>1)continue;const hit=dot(e2,q)/det;if(hit>1e-8)distance=Math.min(distance,hit);}
  return distance;
 };
 const models=[];
 for(let id=208;id<222;id++){
  const t=types[id],m=graphics.createInspectionModel(t,85);models.push(m);
  assert(t.findDescription&&t.note&&new URL(t.source).protocol==='https:');
  assert(m.triangles.length>100&&m.triangles.length<=2300);assert(m.textures.length<=3);
  const points=m.triangles.flatMap(t=>t.points);assert(points.flat().every(Number.isFinite));assert(points.every(p=>p.every(v=>Math.abs(v)<1.2)));
  for(const yaw of [0,Math.PI/2,Math.PI])assert(graphics.projectModel(m,yaw,.3).length>10);
  const repeat=graphics.createInspectionModel(t,12);assert.deepEqual(plain(repeat.triangles),plain(m.triangles),'same actual shape at every condition; wear is a deterministic surface');
  ns('collection').showItem(id);assert(run.elements.get('detailText').textContent.includes(t.findDescription));assert.equal(run.elements.get('detailSource').href,t.source);ns('coin-flip').clearInspection(run.elements.get('detailArt'));run.elements.get('coinDetail').close();
  assert(orders.matchesOrderNeed({type:id,condition:85},{min:70}));assert(!orders.matchesOrderNeed({type:id,condition:60},{min:70}));
 }
 assert.equal(JSON.stringify(s),stateBefore);
 assert.equal(ray(models[2],[0,.25,2],[0,0,-1]),Infinity,'buckle opening passes through the mesh');
 assert.equal(ray(models[12],[0,.3,2],[0,0,-1]),Infinity,'brooch center is open');
 assert(ray(models[5],[0,-2,0],[0,1,0])>2.2,'key bore reaches beyond the stem');
 assert(ray(models[6],[0,-2,0],[0,1,0])>2.7,'thimble opens from below and has a closed crown');
 assert(ray(models[7],[.45,-2,0],[0,1,0])>1.7,'bell sound slot is an actual opening');
 // Real excavation -> reveal -> pack -> order -> album; no phantom old-stock credit.
 s.atCamp=false;s.food=[0,0,0];s.bag=[];s.orders={completed:0,active:{id:'everyday',counts:[0,0]}};
 s.x=s.y=.5;s.energy=100;s.objects=[{x:.5,y:.5,type:214,condition:82,depth:0,dug:false}];
 ns('search').dig();assert.equal(s.pending.type,214);ns('excavation').collectPending();assert.equal(run.elements.get('packDescription').textContent,types[214].findDescription);
 const pendingCopy=ns('backup-format').parseBackup(ns('backup-format').createBackup(s));assert.equal(pendingCopy.state.pending.type,214);
 ns('packing').resolvePacking('take');assert.equal(s.bag[0].type,214);assert.equal(s.orders.active.counts[1],1);ns('packing').resolvePacking('take');assert.equal(s.orders.active.counts[1],1);
 s.atCamp=true;ns('inventory').inventoryAction('album','bag',0);assert(s.collection.includes(214));assert.equal(s.best[214],82);assert.equal(s.orders.active.counts[1],1);
 // Every new ID survives local save and JSON export, including a best copy.
 s.stash=added.map((_,i)=>({type:208+i,condition:40+i}));ns('storage').save();
 const reloaded=await newRun(run.store.get('last-signal-v1'));assert.deepEqual(reloaded.state(),plain(s));
 assert.deepEqual(plain(ns('backup-format').parseBackup(ns('backup-format').createBackup(s)).state),plain(s));
 console.log('PASS 208 exact old records; 14 obtainable finds; 24 terrain/luck profiles, unchanged rarity mass and coin/trash pools; hollow geometry; real excavation, orders, album, reload and backup');
 console.log(JSON.stringify({maximumExpectedBasePriceChangePercent:Math.round(maxPriceShift*10000)/100,triangles:models.map(m=>m.triangles.length)}));
})().catch(e=>{console.error(e);process.exit(1)});
