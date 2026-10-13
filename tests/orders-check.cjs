const {newRun,root,assert}=require('./harness.cjs');
const plain=value=>JSON.parse(JSON.stringify(value));
(async()=>{
 const run=await newRun(),ns=name=>run.modules.get(root+'/js/'+name+'.js').namespace;
 const s=ns('storage').s,orders=ns('orders'),ui=ns('ui'),pack=ns('packing'),format=ns('backup-format');
 const data=run.modules.get(root+'/data/orders.js').namespace,types=JSON.parse(run.catalog());
 const el=id=>run.elements.get(id),pending=item=>{s.pending={...item,spent:8,revealed:true};};
 const match=need=>({type:types.findIndex((type,id)=>!type.legacy&&data.matchesOrderNeed({type:id,condition:100},need)),condition:need.min||65});
 const click=selector=>el('orderCards').listeners.click[0]({target:{closest:q=>q===selector?{}:null}});
 assert.equal(s.orders,undefined,'old/fresh saves are not rewritten by merely viewing orders');
 s.atCamp=false;ui.showTab('search');assert(el('fieldPanel').hidden,'no empty panel before modes or orders');
 s.level=3;ui.render();assert(!el('fieldPanel').hidden);assert(!el('fieldModeSummary').hidden);assert(el('fieldOrderSummary').hidden);
 el('fieldPanel').open=true;assert(ns('detector-controls').setDetectorMode('pinpoint'));ui.renderDetector();
 assert.equal(el('fieldModeSummary').textContent,'Пінпойнт');assert(el('fieldPanel').open,'readings never reset the chosen disclosure state');
 ns('detector-controls').setDetectorMode('search');el('fieldPanel').open=false;s.level=1;s.atCamp=true;ui.showTab('camp');
 const before=JSON.stringify(s),random=run.context.Math.random;
 run.context.Math.random=()=>{throw Error('Order views must not consume loot RNG');};
 ui.showTab('journal');ns('orders-ui').renderOrders();assert.equal(JSON.stringify(s),before);
 assert.equal((el('orderCards').innerHTML.match(/data-order-accept=/g)||[]).length,3);
 assert.equal(el('items').innerHTML,'','startup and journal do not build the hidden album');
 assert.equal(el('warehouseItems').innerHTML,'','startup does not build hidden inventory');
 assert(!orders.acceptOrder('bad'));assert(!orders.acceptOrder('kop25'),'unoffered orders cannot be accepted');
 assert(orders.acceptOrder('kop10'));assert(!orders.acceptOrder('everyday'),'one active order');
 run.context.Math.random=random;
 const first=orders.activeOrder(),coin=match(first.needs[0]);assert(coin.type>=0);
 s.stash.push({...coin});ns('inventory').inventoryAction('move','stash',0);
 assert.deepEqual(plain(s.orders.active.counts),[0],'moving old stock cannot count as a new find');
 s.bag=[];s.atCamp=false;ui.showTab('search');assert(!el('fieldOrder').hidden);
 pending(coin);pack.resolvePacking('leave');assert.equal(s.orders.active.counts[0],0);
 pending({type:0,condition:100});pack.resolvePacking('take');assert.equal(s.orders.active.counts[0],0,'trash does not meet coin order');
 s.bag=Array.from({length:ns('rules').bagCapacity()},()=>({type:0,condition:30}));
 pending(coin);pack.resolvePacking('take');assert(s.pending);assert.equal(s.orders.active.counts[0],0,'failed full-bag action cannot count');
 pack.resolvePacking('swap',0);assert.equal(s.orders.active.counts[0],1);
 pack.resolvePacking('swap',0);assert.equal(s.orders.active.counts[0],1,'same pending find cannot count twice');
 assert(el('log').textContent.includes('+1'));assert(el('fieldOrderText').textContent.includes('1 / 4'));
 assert.equal(el('fieldOrderSummary').textContent,'Замовлення · 1 / 4');assert(!el('fieldPanel').hidden);assert(!el('fieldPanel').open,'progress stays visible without expanding controls');
 const saved=run.store.get('last-signal-v1'),reloaded=await newRun(saved);
 assert.deepEqual(reloaded.state().orders,plain(s.orders),'partial order survives reload');
 assert.deepEqual(plain(format.parseBackup(format.createBackup(s)).state.orders),plain(s.orders));
 for(let i=0;i<3;i++){pending(coin);pack.resolvePacking('swap',0);}
 assert(orders.orderReady());assert(el('log').textContent.includes('Замовлення виконано'));
 assert.equal(el('fieldOrderSummary').dataset.ready,'true');assert.equal(el('fieldOrderSummary').textContent,'Замовлення ✓');
 const token=s.orders.active,money=s.coins;
 assert.equal(orders.claimOrder(token),0,'field claims rejected');
 ui.showTab('journal');assert(el('orderCards').innerHTML.includes('data-order-claim disabled'));
 ns('camp').returnHome();ui.showTab('journal');
 const inventory=JSON.stringify([s.bag,s.stash,s.best,s.collection]);
 el('modal').showModal();click('[data-order-claim]');assert.equal(s.coins,money,'other dialogs block UI claims');el('modal').close();
 click('[data-order-claim]');assert.equal(s.coins,money+first.reward);
 assert.equal(s.orders.completed,1);assert.equal(s.orders.active,null);
 click('[data-order-claim]');assert.equal(orders.claimOrder(token),0);assert.equal(s.coins,money+first.reward,'one payment only');
 assert.equal(JSON.stringify([s.bag,s.stash,s.best,s.collection]),inventory,'reward consumes no finds or album items');
 assert(el('orderCards').innerHTML.includes('data-order-accept="kop25"'),'next offer rotation visible');
 const paid=await newRun(run.store.get('last-signal-v1'));assert.equal(paid.state().orders.completed,1);assert.equal(paid.state().orders.active,null);
 assert(orders.acceptOrder('kop25'));const cancelled=s.orders.active;
 s.atCamp=false;assert(!orders.cancelOrder(cancelled));s.atCamp=true;
 cancelled.counts[0]=2;click('[data-order-cancel]');assert(el('modal').open);
 el('modalCancel').onclick();assert.equal(s.orders.active,cancelled,'dismiss confirmation keeps progress');
 click('[data-order-cancel]');el('modalClose').onclick();assert.equal(s.orders.active,null);assert.equal(s.orders.completed,1);
 assert(orders.acceptOrder('kop25'));assert.equal(s.orders.active.counts[0],0,'cancel/reaccept restarts this order');
 assert(!orders.cancelOrder(cancelled),'stale confirmation cannot cancel a newly accepted order');
 const restoredToken=s.orders.active,backup=format.parseBackup(format.createBackup(s));
 ns('storage').installBackupState(backup.state);
 assert(!orders.cancelOrder(restoredToken),'restore invalidates stale action tokens');
 const imported=ns('storage').s;
 assert.deepEqual(plain(imported.orders),plain(backup.state.orders));

 // Every offer can be fulfilled with existing, currently collectible items.
 // Conditions, type distinctions, saturating counts and field/camp guards apply.
 for(const order of data.fieldOrders){
   const r=await newRun(),m=name=>r.modules.get(root+'/js/'+name+'.js').namespace,t=m('storage').s,o=m('orders');
   const round=[0,1,2].find(n=>data.orderOffers(n).some(x=>x.id===order.id));
   t.orders={completed:round,active:null};assert(o.acceptOrder(order.id));
   const total=order.needs.reduce((n,need)=>n+need.count,0);
   assert(total>=4);assert(order.reward/total<=8,'bounded supplemental reward per required find');
   for(const [i,need] of order.needs.entries()){
     const item=match(need);assert(item.type>=0,order.id+' is achievable');
     assert(!o.recordOrderFind(item,true),'camp actions do not count');t.atCamp=false;
     assert(!o.recordOrderFind(item,false),'leaving never counts');
     if(need.min)assert(!o.recordOrderFind({...item,condition:need.min-1},true),'condition threshold');
     for(let n=0;n<need.count;n++)assert(o.recordOrderFind(item,true));
     assert.equal(t.orders.active.counts[i],need.count);assert(!o.recordOrderFind(item,true),'saturated objective cannot overflow');
     t.atCamp=true;
   }
   assert(o.orderReady());const token=t.orders.active;
   t.pending={};assert.equal(o.claimOrder(token),0);t.pending=null;
   const coins=t.coins;assert.equal(o.claimOrder(token),order.reward);assert.equal(t.coins,coins+order.reward);assert.equal(o.claimOrder(token),0);
 }
 const text=format.createBackup(imported);
 for(const mutate of [
   v=>v.orders=null,v=>v.orders.completed=-1,v=>v.orders.completed=.5,
   v=>v.orders.completed=Number.MAX_SAFE_INTEGER+1,v=>v.orders.active.id='bad',
   v=>v.orders.active.id='kop10',v=>v.orders.active.counts=[5],
   v=>v.orders.active.counts=[-1],v=>v.orders.active.counts=[.5],
   v=>v.orders.active.counts=[],v=>v.orders.active.counts=[0,0],
 ]){const invalid=JSON.parse(text);mutate(invalid.state);assert.throws(()=>format.parseBackup(JSON.stringify(invalid)));}
 const corrupt=plain(imported);corrupt.orders.active.counts=[999];
 const corruptSave=JSON.stringify({version:1,state:corrupt}),protectedRun=await newRun(corruptSave);
 assert.equal(protectedRun.store.get('last-signal-v1'),corruptSave,'corrupt saved orders preserve original save');
 console.log('PASS all 9 orders, deterministic offers, existing items, condition boundaries, full bag/swap/leave, no old-stock credit, one-time camp rewards, no item consumption, cancellation/stale/restore guards, partial reload, portable backups and corrupt save protection');
})().catch(e=>{console.error(e);process.exit(1)});
