// Seeded progression scenarios, not measured player skill or play time.
// The runtime owns loot, atlas, purchases, packing, rewards and save validation.
const {newRun,root,assert}=require('./harness.cjs');
const fs=require('node:fs');
const rng=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
const plain=v=>JSON.parse(JSON.stringify(v));
const samples=Number(process.env.CAREER_SAMPLES||6),limit=Number(process.env.CAREER_TRIPS||1500);
(async()=>{
 const rows=[];
 for(let sample=0;sample<samples;sample++){
  let r=await newRun();const m=n=>r.modules.get(root+'/js/'+n+'.js').namespace,d=n=>r.modules.get(root+'/data/'+n+'.js').namespace;
  const seed=56001+sample*7919,random=rng(seed),skill=rng(seed^0x551);r.context.Math.random=random;
  const chapters={},conditions={},payments={career:0,goals:0,orders:0},claims=new Set();
  let freeTrips=0,revisit=null,returns=0,misses=0,travel=0,sold=0,upgrades=0,firstUpgrade=null,checkpoints=0;
  function checkpoint(){const s=m('storage').s;assert(m('storage').save());const raw=r.store.get('last-signal-v1');assert.deepEqual(plain(m('backup-format').parseBackup(m('backup-format').createBackup(s)).state),plain(s));return raw;}
  let trip=0;
  for(trip=1;trip<=limit;trip++){
   const s=m('storage').s;
   const beforeChapters=s.career?.claimed.length||0;
   assert(s.atCamp&&!s.pending);
   // No purchased food; free rest, retain one fare when buying gear.
   r.elements.get('restHome').onclick();
   if(!m('orders').activeOrder()){
    const offers=d('orders').orderOffers(s.orders?.completed||0);
    // A visible category/condition request, never a look at the next field.
    assert(m('orders').acceptOrder(offers[sample%3].id));
   }
   const returning=revisit!==null&&s.coins>=25;
   if(returning){assert(m('atlas-state').selectSite(revisit));revisit=null;returns++;}
   else{
    m('atlas-state').selectSite(null);
    if(s.atlas.sites.length===d('atlas').MAX_SITES){const oldest=s.atlas.sites.find(site=>site.id!==revisit);assert(oldest&&m('atlas-state').forgetSite(oldest.id));}
   }
   const fare=m('rules').travelCost();travel+=fare;if(!fare)freeTrips++;
   assert(m('camp').depart(),m('camp').departureBlock());r.elements.get('modalClose').onclick();
   const targets=[...s.objects].filter(o=>!o.dug).sort((a,b)=>Math.floor(a.y*8)-Math.floor(b.y*8)||a.x-b.x);
   // Leave one detected signal unexcavated and return on a later paid visit.
   // The chosen location ignores hidden type, condition, rarity and depth.
   let reserved=null;
   if(!returning&&!revisit&&!s.career?.field.returns&&s.coins>=25&&targets.length){
    reserved=targets[0];s.x=reserved.x;s.y=reserved.y;
    assert(m('field-notes').toggleFieldMark());revisit=s.atlas.activeId;
   }
   if(returning){const marks=s.progress.active.returnMarks||[];targets.sort((a,b)=>Math.min(...marks.map(p=>Math.hypot(a.x-p.x,a.y-p.y)))-Math.min(...marks.map(p=>Math.hypot(b.x-p.x,b.y-p.y))));}
   for(const target of targets){
    if(target===reserved||skill()>(.88+(s.level-1)*.01))continue;
    const hit=skill()<(s.level>=3?.95:.80),cost=m('rules').digCost(hit?d('balance').depthLevels[target.depth].cost:10);
    if(s.energy<cost)continue;
    s.energy=Math.round((s.energy-cost)*10)/10;m('progression').recordDig(hit);
    if(!hit){misses++;continue;}
    target.dug=true;s.holes.push({x:target.x,y:target.y});
    // Gesture/graphics are skipped by this economic model; real packing follows.
    s.pending={type:target.type,condition:target.condition,spent:cost,revealed:true};
    const challenge=m('career').findChallenge(target);if(challenge)s.pending.careerFind=challenge;
    if(s.bag.length<m('rules').bagCapacity())m('packing').resolvePacking('take');
    else{
     const item={type:target.type,condition:target.condition},all=[...s.bag,item];
     const entries=m('inventory-plan').inventoryEntries({...s,bag:all,stash:[]});
     const score=e=>({new:3000000,upgrade:2000000,duplicate:0,scrap:0}[e.status]+e.value);
     const worst=entries.reduce((a,b)=>score(a)<=score(b)?a:b);
     const order=m('orders').activeOrder(),needed=order?.needs.some((need,i)=>s.orders.active.counts[i]<need.count&&d('orders').matchesOrderNeed(item,need));
     if(worst.index===all.length-1&&!needed)m('packing').resolvePacking('leave');
     else{const replace=worst.index===all.length-1?entries.slice(0,-1).reduce((a,b)=>score(a)<=score(b)?a:b):worst;m('packing').resolvePacking('swap',replace.index);}
    }
    assert(!s.pending);
   }
   m('camp').returnHome();
   m('inventory').openInventoryReview('album');m('inventory').confirmInventoryReview();
   if(r.elements.get('inventoryReview').open)r.elements.get('inventoryReview').close();
   for(const place of ['bag','stash'])while(s[place].length){const before=s.coins;m('inventory').inventoryAction('sell',place,0);assert(!r.elements.get('modal').open,'album-priority model must not sell a needed copy');sold+=s.coins-before;}
   if(m('orders').orderReady()){const token=s.orders.active,reward=m('orders').claimOrder(token);assert(reward>0);payments.orders+=reward;assert.equal(m('orders').claimOrder(token),0);}
   for(const goal of d('expeditions').goals)if(m('progression').claimGoal(goal.id)){assert(!claims.has(goal.id));claims.add(goal.id);payments.goals+=goal.reward;assert(!m('progression').claimGoal(goal.id));}
   for(const stage of m('career').careerSnapshot().stages)for(const [i,need]of stage.needs.entries())if(need.done)conditions[stage.id+':'+(need.goal||need.metric)]??=trip;
   let chapter=m('career').careerSnapshot().current;
   while(chapter?.ready){assert(m('career').claimChapter(chapter.id));assert(!m('career').claimChapter(chapter.id));payments.career+=chapter.reward;chapters[chapter.id]=trip;chapter=m('career').careerSnapshot().current;}
   for(;;){const next=Object.entries(d('gear').gearKeys).filter(([,key])=>s[key]<10).map(([kind,key])=>({kind,key,cost:m('rules').upgradeCost(kind)})).sort((a,b)=>a.cost-b.cost)[0];if(!next||s.coins<next.cost+50)break;const before=s[next.key];m('shop').upgradeGear(next.kind);assert.equal(s[next.key],before+1);upgrades+=next.cost;firstUpgrade??=trip;}
   assert.equal(s.coins,sold+payments.goals+payments.orders+payments.career-travel-upgrades,'every coupon must be accounted for');
   assert(s.coins>=0&&s.energy>=0&&s.atlas.sites.length<=6);
   if(trip%25===0||!chapter||(s.career?.claimed.length||0)!==beforeChapters){const raw=checkpoint(),before=plain(s);r=await newRun(raw);r.context.Math.random=random;assert.deepEqual(r.state(),before,'checkpoint reload must preserve the full career');checkpoints++;}
   if(!chapter)break;
  }
  const s=m('storage').s,view=m('career').careerSnapshot();
  const row={seed,orderPolicy:['coins','sets','condition'][sample%3],completed:view.completed===6,trips:Math.min(trip,limit),chapters,conditions,album:s.collection.length,sets:view.metrics.sets,orders:s.orders?.completed||0,gear:[s.level,s.shovel,s.backpack],coins:s.coins,freeTrips,returns,misses,firstUpgrade,checkpoints,payments,stalledOn:view.current?{id:view.current.id,needs:view.current.needs.filter(n=>!n.done).map(n=>({label:n.label,value:n.value,target:n.target}))}:null};
  rows.push(row);console.log(JSON.stringify(row));
 }
 const output={scope:'Sequential career scenarios from a new save, with runtime transactions',assumptions:['Deterministic world seeds; no injected money, gear, collection or goal completion. Cheapest route only; no bought food.', '88–97% coverage and 80% hit probability before detector 3, 95% afterwards are modeling assumptions.', 'Geometric signal order; no hidden item/rarity/depth selection before digging. One marked signal is left for a later visit.', 'Cleaning and movement gestures are omitted; runtime packing, inventory, atlas, purchases, goals, orders and career claims are exercised.', 'Best album copies prioritized after recovery; duplicates/scrap and returned old copies sold. One active order, rotating visible offers.', 'Periodic full save/backup validation and reload; all coupon transactions balanced. This is not a time estimate or human playtest.'],rows};
 if(process.argv[2])fs.writeFileSync(process.argv[2],JSON.stringify(output,null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
