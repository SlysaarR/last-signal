const {newRun,root,assert}=require('./harness.cjs');
const plain=v=>JSON.parse(JSON.stringify(v));
(async()=>{
 for(const lang of ['uk','en']){
  const r=await newRun(null,false,e=>e.store.set('last-signal-language',lang)),m=n=>r.modules.get(root+'/js/'+n+'.js').namespace,d=n=>r.modules.get(root+'/data/'+n+'.js').namespace,s=m('storage').s,el=id=>r.elements.get(id);
  // The actual main-objective buttons must open the tracked card, not page 1
  // or whichever unrelated page was last browsed. Include a cold journal.
  for(const goal of d('expeditions').goals){
   assert(m('career').trackFocus('goal:'+goal.id));m('ui').showTab('camp');
   el('campObjectiveOpen').onclick();assert.equal(m('layout').currentPane('journal'),'goals');
   assert(el('goalCards').innerHTML.includes('data-goal="'+goal.id+'"'));
  }
  // Visiting from the field's menu preserves the chosen target too.
  m('career').trackFocus('goal:album80');s.atCamp=false;m('ui').showTab('search');el('tripMenu').showModal();el('fieldObjectiveOpen').onclick();assert(!el('tripMenu').open);assert(el('goalCards').innerHTML.includes('data-goal="album80"'));s.atCamp=true;
  m('career').trackFocus(null);
  for(let completed=0;completed<=6;completed++){
   s.career.claimed=d('career').chapters.slice(0,completed).map(c=>c.id);
   m('ui').showTab('journal');m('layout').resetPage('career',completed?0:5);m('ui').render();
   m('ui').showTab('camp');el('campObjectiveOpen').onclick();
   // After completion the main objective may lead to unfinished album sets.
   if(completed<6)assert.equal(m('layout').pageState.career.index,completed);
  }
  s.career.claimed=[];assert(m('orders').acceptOrder('kop10'));assert(m('career').trackFocus('order'));
  assert(m('orders').cancelOrder(s.orders.active));m('ui').showTab('camp');el('campObjectiveOpen').onclick();
  assert.equal(m('layout').currentPane('journal'),'career','a canceled tracked order falls back to its displayed career objective');
  // A payout changes sorted goal order. The next ready payout must be visible.
  s.collection=d('items').types.flatMap((t,id)=>t.kind==='trash'?[]:[id]).slice(0,10);s.best=Object.fromEntries(s.collection.map(id=>[id,50]));
  s.progress=d('expeditions').emptyProgress();s.progress.finds=30;
  m('ui').showTab('journal');m('layout').setPane('journal','goals');m('layout').resetPage('goals',2);m('ui').render();
  assert(el('goalCards').innerHTML.includes('data-claim="album10"'));
  el('goalCards').listeners.click[0]({target:{closest:q=>q==='[data-claim]'?{dataset:{claim:'album10'}}:null}});
  assert(el('goalCards').innerHTML.includes('data-claim="album3"'));assert.equal(m('layout').pageState.goals.index,0);
  const before=plain(s);s.coins=Number.MAX_SAFE_INTEGER;const limitState=JSON.stringify(s);
  assert(!m('progression').claimGoal('album3'));assert.equal(JSON.stringify(s),limitState);s.coins=before.coins;
  // Help reflects visited locations and existing route locks; no RNG or writes.
  s.progress.visited=[0,1,2,3,5,6,7];
  assert.equal(d('expeditions').visitSuggestion(s).route.id,'wander');
  s.collection=d('items').types.flatMap((t,id)=>t.kind==='trash'?[]:[id]).slice(0,24);s.best=Object.fromEntries(s.collection.map(id=>[id,50]));
  const snapshot=JSON.stringify(s),random=r.context.Math.random;r.context.Math.random=()=>{throw Error('Guidance cannot peek at/generate the next destination');};
  const suggestion=d('expeditions').visitSuggestion(s);assert.equal(suggestion.route.id,'distant');assert.match(suggestion.hint,/Забутий торговий шлях/);assert.match(suggestion.hint,/не гарантує/);
  m('journal').openVisitRoute();assert(el('routeDialog').open);assert(el('routeCards').innerHTML.includes('data-route="distant"'));assert.equal(JSON.stringify(s),snapshot,'opening advice must not choose/pay for a route');el('routeDialog').close();
  s.atCamp=false;m('journal').openVisitRoute();assert(!el('routeDialog').open);s.atCamp=true;el('modal').showModal();m('journal').openVisitRoute();assert(!el('routeDialog').open);el('modal').close();
  assert.equal(JSON.stringify(s),snapshot);r.context.Math.random=random;
  s.progress.visited=[0,1,3,4,5,6];assert.equal(d('expeditions').visitSuggestion(s).route.id,'water');
  s.progress.visited=[0,1,2,3,4,7];assert.equal(d('expeditions').visitSuggestion(s).route.id,'rural');
  s.progress.visited=[0,1,2,3,4,5,6,7];assert.equal(d('expeditions').visitSuggestion(s),null);
  s.progress.visited=[0,1,2,3,5,6,7];m('career').trackFocus('goal:visit8');m('ui').showTab('camp');el('campObjectiveOpen').onclick();
  assert(el('goalCards').innerHTML.includes('data-visit-route'));
  if(lang==='en')assert(!/[А-Яа-яІіЇїЄєҐґ]/.test(el('goalCards').innerHTML),'dynamic route guidance is translated');
  s.career.claimed=d('career').chapters.slice(0,3).map(c=>c.id);m('career').trackFocus(null);m('ui').showTab('camp');el('campObjectiveOpen').onclick();
  assert(el('careerCards').innerHTML.includes('data-career-route'));
  if(lang==='en')assert(!/[А-Яа-яІіЇїЄєҐґ]/.test(el('careerCards').innerHTML),'chapter route guidance is translated');
  el('journal').listeners.click[0]({target:{closest:q=>q==='[data-career-route]'?{}:null}});assert(el('routeDialog').open);assert(el('routeCards').innerHTML.includes('data-route="distant"'));el('routeDialog').close();
  assert(m('storage').save());const reload=await newRun(r.store.get('last-signal-v1'),false,e=>e.store.set('last-signal-language',lang));assert.deepEqual(reload.state(),plain(s));
 }
 console.log('PASS UK/EN exact tracked-goal/current-chapter navigation, field menu, canceled-order fallback, next reward, payout overflow, attainable route advice, no RNG/payment/state changes, guards and save reload');
})().catch(error=>{console.error(error);process.exitCode=1;});
