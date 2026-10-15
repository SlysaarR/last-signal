const {newRun,root,assert}=require('./harness.cjs');
const ns=(r,n)=>r.modules.get(root+'/js/'+n+'.js').namespace;
const plain=v=>JSON.parse(JSON.stringify(v));
(async()=>{
 for(const lang of ['uk','en']){
  const r=await newRun(null,false,e=>e.store.set('last-signal-language',lang)),m=n=>ns(r,n),s=m('storage').s,el=id=>r.elements.get(id),close=()=>el('modalClose').onclick();
  el('startTrip').onclick();assert(el('modal').open);close();close();assert(!s.atCamp);
  const target=s.objects[0];s.x=target.x;s.y=target.y;m('search').dig();assert(s.pending);el('excSkip').onclick();
  el('packChoices').listeners.click[0]({target:{closest:()=>({dataset:{pack:'take'}})}});
  assert.equal(s.bag.length,1);const item=plain(s.bag[0]),money=s.coins;
  s.energy=0;m('ui').render();assert(el('dig').hidden);assert(!el('fieldExit').hidden);assert(!el('fieldExit').disabled);
  el('fieldExit').onclick();el('modalCancel').onclick();assert(!s.atCamp,'cancel preserves the trip');
  el('fieldExit').onclick();close();assert(s.atCamp);assert.equal(m('layout').currentPane('camp'),'report');assert(!el('reportSort').hidden);assert.equal(s.coins,money,'estimated bag value is never paid on return');
  assert.equal(s.lastTrip.brought,1);assert.equal(s.lastTrip.value,m('rules').priceFor(item.type,item.condition));
  const saved=plain(s),reload=await newRun(r.store.get('last-signal-v1'),false,e=>e.store.set('last-signal-language',lang));
  assert.equal(ns(reload,'layout').currentPane('camp'),'report');assert.deepEqual(reload.state(),saved);
  m('inventory').inventoryView.filter='scrap';m('inventory').inventoryView.bagPage=99;m('layout').setPane('inventory','pantry');
  el('reportSort').onclick();assert(!el('inventory').hidden);assert.equal(m('layout').currentPane('inventory'),'bag');assert.equal(m('inventory').inventoryView.filter,'all');assert.equal(m('inventory').inventoryView.bagPage,0);
  const price=m('rules').priceFor(item.type,item.condition);m('inventory').inventoryAction('sell','bag',0);if(el('modal').open)close();assert.equal(s.coins,money+price);
  m('ui').showTab('camp');assert(el('reportSort').hidden);el('reportPrepare').onclick();assert.equal(m('layout').currentPane('camp'),'ready');el('restHome').onclick();assert.equal(s.energy,m('rules').maxEnergy());
  // Opening the menu respects the player's current pane; only an initial resume chooses the report.
  m('menu').openMainMenu();el('continueGame').onclick();assert.equal(m('layout').currentPane('camp'),'ready');
  s.stash=[item];m('ui').render();el('reportSort').onclick();assert.equal(m('layout').currentPane('inventory'),'stash');
  s.guide={version:1,enabled:true,stage:3};m('layout').setPane('inventory','bag');m('ui').render();el('guideAction').onclick();assert.equal(m('layout').currentPane('inventory'),'stash','guide opens the place holding the finds');
  console.log('PASS '+lang+' departure → excavation → take → empty energy → cancel/return → report → reload → filtered inventory → sale → free rest; stash-only guide');
 }
 const r=await newRun(),m=n=>ns(r,n),s=m('storage').s,el=id=>r.elements.get(id);
 m('camp').depart();el('modal').close();s.energy=0;s.food=[1,0,0];m('ui').render();assert(!el('fieldExit').hidden);m('shop').eatFood(0);assert(!el('dig').hidden);assert(el('fieldExit').hidden);
 el('helpDialog').showModal();el('fieldExit').onclick();assert(!el('modal').open,'another modal still blocks return');el('helpDialog').close();
 s.pending={type:0,condition:40,spent:5};s.energy=0;m('ui').render();assert(el('fieldExit').disabled);el('fieldExit').onclick();assert(!s.atCamp);s.pending=null;
 m('camp').returnHome();
 // A ready goal can be reached even when its paged list was left on the last page.
 s.collection=[0,1,2];s.best={0:40,1:40,2:40};m('ui').showTab('journal');m('layout').pageState.goals.index=11;
 m('ui').showTab('camp');assert(!el('reportReward').hidden);const funds=s.coins;el('reportReward').onclick();assert.equal(m('layout').currentPane('journal'),'goals');assert.equal(m('layout').pageState.goals.index,0);assert.match(el('goalCards').innerHTML,/data-claim="album3"/);assert.equal(s.coins,funds);
 // Later ready chapters open their own page, never the first completed chapter.
 s.career={version:1,claimed:['first'],focus:null,field:{deep:0,returns:0}};s.collection=Array.from({length:10},(_,i)=>i);s.best=Object.fromEntries(s.collection.map(id=>[id,90]));s.progress.visited=[0,1,2,3,4];s.orders={version:1,completed:1,active:null};
 m('ui').showTab('journal');m('layout').pageState.career.index=5;m('ui').showTab('camp');assert.equal(m('camp').readyTripReward().pane,'career');el('reportReward').onclick();assert.equal(m('layout').currentPane('journal'),'career');assert.equal(m('layout').pageState.career.index,1);assert.match(el('careerCards').innerHTML,/data-career-claim="paths"/);
 console.log('PASS food restores digging, modal/pending guards, ready-goal page and later-chapter shortcut without automatic payouts');

 const poor=await newRun(),pm=n=>ns(poor,n),ps=pm('storage').s,pe=id=>poor.elements.get(id);
 for(let i=0;i<6;i++){ps.coins=0;assert(pm('camp').depart());pe('modal').close();ps.energy=0;pm('camp').returnHome();pe('reportPrepare').onclick();pe('restHome').onclick();assert.equal(ps.energy,pm('rules').maxEnergy());}
 assert(!pm('rules').canLeave(),'full map blocks new scouting rather than deleting a site');
 const first=ps.atlas.sites[0],stored=plain(first.field);pm('atlas-state').selectSite(first.id);assert.equal(pm('rules').travelCost(),0);assert(pm('camp').depart());pe('modal').close();assert.deepEqual(plain(ps.objects),stored.objects,'free revisits do not regenerate loot');pm('camp').returnHome();
 assert(pm('atlas-state').forgetSite(first.id));pm('atlas-state').selectSite(null);assert(pm('rules').canLeave());assert(pm('camp').depart());assert.equal(ps.coins,0);assert(ps.emergency);
 console.log('PASS zero-coupon/zero-energy recovery, six-site map, free persistent revisit and explicit slot freeing for a new free site');
})().catch(e=>{console.error(e);process.exit(1)});
