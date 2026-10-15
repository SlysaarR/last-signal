const {newRun,root,assert}=require('./harness.cjs');
(async()=>{
 const run=await newRun(),m=name=>run.modules.get(root+'/js/'+name+'.js').namespace;
 const s=m('storage').s,ui=m('ui'),el=id=>run.elements.get(id),plan=m('inventory-plan');
 const types=JSON.parse(run.catalog());
 s.stash=Array.from({length:50000},(_,i)=>({type:i%types.length,condition:i%101}));
 s.bag=[{type:0,condition:0},{type:3,condition:100}];s.collection=[3,4];s.best={3:95,4:100};
 assert.deepEqual(JSON.parse(JSON.stringify(plan.inventorySummary())),JSON.parse(JSON.stringify(plan.inventorySummary(plan.inventoryEntries()))),'allocation-light camp summary matches full planner for 50,000 stored items');
 const saved=JSON.stringify(s);m('camp').renderCamp();assert.equal(JSON.stringify(s),saved,'summary is read only');
 s.atCamp=false;ui.showTab('search');
 const hiddenIds=['warehouseItems','bagItems','items','goalCards','orderCards','routeCards','detectorInfo'];
 let writes=0;
 for(const id of hiddenIds){const node=el(id);let html=node.innerHTML;Object.defineProperty(node,'innerHTML',{get:()=>html,set:value=>{writes++;html=value;}});}
 const stash=s.stash;
 s.stash=new Proxy(stash,{get(){throw Error('Field render must not read/serialize hidden stash');}});
 for(let i=0;i<20;i++){s.energy--;s.coins++;ui.render();}
 assert.equal(writes,0,'full field updates do not rebuild hidden screens');
 assert.equal(el('fieldBag').textContent,'Рюкзак: 2 / 8','field bag status independent of shop rendering');
 assert.equal(el('coins').textContent,s.coins);s.stash=stash;
 s.food=[1,0,0];s.foodUsed=20;ui.render();assert.equal(el('fieldFood').textContent,'Їжа: 1 · спожито 20/50% за виїзд','quick food summary does not depend on opening the shop');
 // Catch-up occurs on navigation, not in the field. Keep visual fixture small.
 s.stash=stash.slice(0,5);s.atCamp=true;
 ui.showTab('inventory');assert(el('warehouseItems').innerHTML.includes('data-item-place="stash"'));
 const inventoryHTML=el('warehouseItems').innerHTML,shown=el('stashShown').textContent;
 ui.showTab('search'); // Camp redirects correctly.
 assert(!el('camp').hidden);s.atCamp=false;ui.showTab('search');
 s.stash.push({type:3,condition:100});s.best[3]=80;ui.render();assert.equal(el('warehouseItems').innerHTML,inventoryHTML);
 s.atCamp=true;ui.showTab('inventory');assert.notEqual(el('stashShown').textContent,shown,'hidden count changes catch up even if the first card stays the same');let reachable=false;for(let page=0;page<6;page++){reachable ||= el('warehouseItems').innerHTML.includes('data-item-index="5"');if(!el('stashNext').disabled)el('stashNext').onclick();}assert(reachable,'new off-page stock remains reachable');
 ui.showTab('collection');assert(el('items').innerHTML.length>0);
 ui.showTab('gear');assert(el('detectorInfo').innerHTML.length>0);
 ui.showTab('journal');assert(el('goalCards').innerHTML.length>0);assert(el('orderCards').innerHTML.length>0);
 console.log('PASS 50,000-item summary parity; 20 field renders read zero stash data and write zero hidden card lists; bag/stats stay current; every tab catches up on opening');
})().catch(e=>{console.error(e);process.exit(1)});
