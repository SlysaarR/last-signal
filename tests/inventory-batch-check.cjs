const {newRun,root,assert}=require('./harness.cjs');
(async()=>{
 const run=await newRun(),ns=name=>run.modules.get(root+'/js/'+name+'.js').namespace;
 const s=ns('storage').s,inv=ns('inventory'),plan=ns('inventory-plan'),camp=ns('camp'),rules=ns('rules');
 const catalog=JSON.parse(run.catalog()),[a,b,c]=catalog.map((t,i)=>({...t,id:i})).filter(t=>t.country).map(t=>t.id),relic=catalog.findIndex(t=>t.kind==='relic'),trash=catalog.findIndex(t=>t.kind==='trash');
 const el=id=>run.elements.get(id),item=(type,condition)=>({type,condition}),state=()=>JSON.stringify(s);
 const allCopies=()=>JSON.stringify([...s.bag,...s.stash,...s.collection.map(type=>item(type,s.best[type]))].map(x=>x.type+':'+x.condition).sort());
 function fixture(){
  s.atCamp=true;s.pending=null;s.coins=100;s.collection=[a,c];s.best={[a]:60,[c]:95};
  s.bag=[item(a,70),item(b,60),item(c,40),item(trash,25),item(relic,80)];
  s.stash=[item(a,90),item(a,70),item(b,60),item(c,20)];s.food=[1,0,0];s.pantry=[2,1,0];
  inv.inventoryView.sort='album';inv.inventoryView.filter='all';inv.renderInventory();
 }
 fixture();
 let entries=plan.inventoryEntries();assert.deepEqual(JSON.parse(JSON.stringify(plan.inventorySummary(entries))),{new:2,upgrade:1,duplicate:5,scrap:1,total:9});
 assert.equal(entries.find(e=>e.key==='stash:0').status,'upgrade');assert.equal(entries.find(e=>e.key==='bag:0').status,'duplicate','a stronger copy in the other container is reserved');
 assert.equal(entries.filter(e=>e.type===b&&e.status==='new').length,1,'equal copies reserve exactly one');
 const unchanged=state();
 for(const sort of ['album','condition','price','type','stored'])for(const filter of ['all','album','duplicate','scrap']){
  inv.inventoryView.sort=sort;inv.inventoryView.filter=filter;inv.renderInventory();assert.equal(state(),unchanged,'views never reorder or mutate saved objects');
 }
 inv.inventoryView.sort='condition';inv.inventoryView.filter='all';inv.renderInventory();
 assert(el('bagItems').innerHTML.indexOf('data-item-index="4"')<el('bagItems').innerHTML.indexOf('data-item-index="0"'),'best condition sorts first without changing original index');
 const moved=s.bag[0];inv.inventoryAction('move','bag',0);assert.strictEqual(s.stash.at(-1),moved,'an action uses the original index after sorting');
 fixture();
 inv.inventoryAction('sell','stash',0);assert(el('modal').open,'single sale of album upgrade needs an explicit choice');assert.equal(s.stash[0].condition,90);
 el('modalCancel').onclick();assert.equal(s.coins,100);assert.equal(s.stash[0].condition,90);
 inv.inventoryAction('sell','stash',0);el('modalClose').onclick();assert.equal(s.coins,100+rules.priceFor(a,90));assert(!s.stash.some(x=>x.type===a&&x.condition===90));fixture();
 inv.openInventoryReview('sale');assert(ns('ui').busy(),'review blocks other game mutations');
 const beforeCancel=state();el('reviewSelectAll').onclick();assert(el('reviewConfirm').disabled);inv.confirmInventoryReview();assert.equal(state(),beforeCancel);
 el('reviewCancel').onclick();assert.equal(state(),beforeCancel,'cancel never consumes items or money');
 inv.openInventoryReview('sale');
 const untouched=s.bag[0];el('reviewItems').listeners.change[0]({target:{dataset:{reviewKey:'bag:0'},checked:false}});
 el('reviewIncludeScrap').checked=true;el('reviewIncludeScrap').onchange();
 el('reviewItems').listeners.change[0]({target:{dataset:{reviewKey:'bag:3'},checked:false}});
 el('reviewIncludeScrap').checked=false;el('reviewIncludeScrap').onchange();
 el('reviewIncludeScrap').checked=true;el('reviewIncludeScrap').onchange();
 assert(el('reviewItems').innerHTML.includes('data-review-key="bag:3" >'),'an excluded scrap item stays excluded across off/on toggles');
 el('reviewIncludeScrap').checked=false;el('reviewIncludeScrap').onchange();
 const selected=plan.bulkPlan('sale').filter(e=>e.key!=='bag:0'),saleValue=selected.reduce((sum,e)=>sum+e.value,0);
 inv.confirmInventoryReview();assert.equal(s.coins,100+saleValue);assert(s.bag.includes(untouched),'unchecked duplicate survives');
 assert(s.stash.some(x=>x.type===a&&x.condition===90));assert(s.bag.some(x=>x.type===b&&x.condition===60));assert(s.bag.some(x=>x.type===trash),'scrap is opt-in');
 assert.equal(s.best[a],60);assert.equal(s.best[c],95);const soldState=state();inv.confirmInventoryReview();assert.equal(state(),soldState,'double confirm does not pay twice');
 fixture();const copies=allCopies(),food=JSON.stringify([s.food,s.pantry]);
 inv.openInventoryReview('album');assert(el('reviewTotal').textContent.includes('3'));inv.confirmInventoryReview();
 assert.equal(s.best[a],90);assert.equal(s.best[b],60);assert.equal(s.best[relic],80);assert.equal(s.best[c],95);
 assert.equal(s.collection.filter(id=>id===b).length,1);assert(s.stash.some(x=>x.type===a&&x.condition===60),'old album item returns to storage');
 assert.equal(allCopies(),copies,'batch album preserves every physical copy, including replaced items');assert.equal(s.coins,100);assert.equal(JSON.stringify([s.food,s.pantry]),food);
 inv.openInventoryReview('sale');el('reviewIncludeScrap').checked=true;el('reviewIncludeScrap').onchange();
 const sold=plan.bulkPlan('sale',true),amount=sold.reduce((sum,e)=>sum+e.value,0);inv.confirmInventoryReview();
 assert.equal(s.bag.length+s.stash.length,0);assert.equal(s.coins,100+amount);assert.equal(s.collection.length,4);assert.equal(s.best[a],90);assert.equal(JSON.stringify([s.food,s.pantry]),food);
 let reload=await newRun(run.store.get('last-signal-v1'));assert.deepEqual(reload.state(),run.state(),'batch album and sale survive reload');
 fixture();inv.openInventoryReview('sale');s.stash.splice(0,1);let changed=state();inv.confirmInventoryReview();
 assert.equal(state(),changed,'losing a reserved best copy invalidates the preview');assert(el('reviewNotice').textContent.includes('оновлено'));assert(el('inventoryReview').open);el('reviewCancel').onclick();
 fixture();inv.openInventoryReview('sale');s.bag[0].condition=71;changed=state();inv.confirmInventoryReview();assert.equal(state(),changed,'condition/price changes require review');el('reviewCancel').onclick();
 fixture();inv.openInventoryReview('sale');s.stash=s.stash.map(x=>({...x}));changed=state();inv.confirmInventoryReview();assert.equal(state(),changed,'restoring equal-looking items invalidates old object identities');el('reviewCancel').onclick();
 fixture();inv.openInventoryReview('album');s.best[a]=99;changed=state();inv.confirmInventoryReview();assert.equal(state(),changed,'album change requires review');el('reviewCancel').onclick();
 fixture();inv.openInventoryReview('sale');s.pending={type:trash,condition:30};changed=state();inv.confirmInventoryReview();assert.equal(state(),changed,'pending find blocks batch mutation');assert(!el('inventoryReview').open);
 fixture();s.atCamp=false;changed=state();inv.openInventoryReview('sale');assert(!el('inventoryReview').open);assert.equal(state(),changed);
 s.found=5;camp.returnHome();assert(s.atCamp);assert(!el('campLoot').hidden);assert(el('campLootSummary').textContent.includes('9'));
 inv.openInventoryReview('album');inv.confirmInventoryReview();inv.openInventoryReview('sale');inv.confirmInventoryReview();
 const kept=s.bag.find(x=>x.type===trash);assert(kept);const pantry=s.pantry[0];el('unload').onclick();assert.equal(s.bag.length,0);assert(s.stash.includes(kept));assert.equal(s.pantry[0],pantry+1);assert.equal(s.food[0],0);
 el('restHome').onclick();assert.equal(s.energy,rules.maxEnergy());camp.confirmDeparture();el('modalClose').onclick();assert(!s.atCamp);assert.equal(s.bag.length,0);assert.equal(s.best[a],90);
 el('modalClose').onclick();
 // Returned-item navigation must not use a sorted card's display position.
 fixture();s.bag=[item(a,100)];s.stash=[item(trash,0),item(c,80)];inv.inventoryView.sort='price';inv.inventoryAction('album','bag',0);
 inv.inventoryView.filter='album';inv.renderInventory();let selector='';el('warehouseItems').querySelector=value=>{selector=value;return null;};el('showReturnedItem').onclick();
 assert.equal(inv.inventoryView.filter,'all');assert.equal(selector,'[data-item-place="stash"][data-item-index="0"]');
 // A zero-condition find is still a legitimate first album entry.
 fixture();s.collection=[];s.best={};s.bag=[item(a,0),item(a,0)];s.stash=[];
 assert.equal(plan.bulkPlan('album').length,1);assert.equal(plan.bulkPlan('sale').length,1);inv.openInventoryReview('album');inv.confirmInventoryReview();assert.equal(s.best[a],0);assert.equal(s.collection.length,1);
 console.log('PASS cross-container best/tie protection, nonmutating sort/filter, correct actions after sorting, optional selections/scrap, cancel/double/stale guards, album copy conservation, exact sale proceeds, reload, field/pending guards and return → album → sale → unload → rest → depart');
})().catch(error=>{console.error(error);process.exit(1)});
