const {newRun,root,assert,golden}=require('./harness.cjs');
const plain=v=>JSON.parse(JSON.stringify(v));
const ns=(r,name)=>r.modules.get(root+'/js/'+name+'.js').namespace;
const data=(r,name)=>r.modules.get(root+'/data/'+name+'.js').namespace;
const close=r=>{if(r.elements.get('modal').open)r.elements.get('modalClose').onclick();};
const finish=(r,action='take')=>{ns(r,'excavation').collectPending();ns(r,'packing').resolvePacking(action);};
function add(r,id,condition=100){const s=ns(r,'storage').s;if(!s.collection.includes(id))s.collection.push(id);s.best[id]=condition;}
(async()=>{
 const r=await newRun(),m=name=>ns(r,name),s=m('storage').s,c=m('career'),d=data(r,'career'),el=id=>r.elements.get(id);
 assert.equal(s.career,undefined);const initial=plain(s);c.careerSnapshot();m('career-ui').renderCareer();m('career-ui').renderAlbumSets();assert.deepEqual(plain(s),initial,'rendering never creates progress or awards');
 assert.equal(d.albumSets.length,8);assert.equal(d.chapters.length,6);assert.equal(d.chapters.reduce((sum,v)=>sum+v.reward,0),500);
 const catalogue=JSON.parse(r.catalog());
 for(const set of d.albumSets)for(const row of set.slots){assert(row.ids.length>0,'every slot must be obtainable: '+row.label);assert.equal(new Set(row.ids).size,row.ids.length);assert(row.ids.every(id=>catalogue[id]?.country==='Україна'&&!catalogue[id].legacy));}
 const change=d.albumSets[0],coin=change.slots[0].ids[0];s.bag=[{type:coin,condition:100}];s.stash=[{type:coin,condition:100}];assert.equal(c.careerSnapshot().sets[0].value,0,'bag/stash are not album');
 s.bag=[];s.stash=[];change.slots.forEach(row=>add(r,row.ids[0],89));assert(c.careerSnapshot().sets[0].done);assert(!c.careerSnapshot().sets.at(-1).done);assert.equal(c.careerSnapshot().sets.at(-1).value,0);
 change.slots.forEach(row=>add(r,row.ids[0],90));assert(c.careerSnapshot().sets.at(-1).done,'condition boundary is inclusive');
 const alt=change.slots[0].ids[1];if(alt!==undefined)add(r,alt);assert.equal(c.careerSnapshot().sets[0].value,6,'variants do not duplicate slots');
 const allGoals=data(r,'expeditions').goals;
 assert.equal(new Set(d.chapters.flatMap(ch=>ch.needs.filter(n=>n.goal).map(n=>n.goal))).size,allGoals.length,'all existing goals are integrated');
 s.progress=data(r,'expeditions').emptyProgress();s.progress.finds=30;assert(c.careerSnapshot().current.ready);
 assert(!c.claimChapter('paths'));const before=s.coins;assert(c.claimChapter('first'));assert.equal(s.coins,before+35);assert(!c.claimChapter('first'));assert.equal(c.careerSnapshot().rank,'Шукач');
 s.progress.claimed=allGoals.map(g=>g.id);s.orders={completed:1,active:null};
 assert(c.careerSnapshot().current.ready,'existing completed goals count without replaying');
 s.atCamp=false;assert(!c.claimChapter('paths'));s.atCamp=true;s.pending={type:coin,condition:50,spent:10};assert(!c.claimChapter('paths'));s.pending=null;assert(c.claimChapter('paths'));assert(!c.claimChapter('signal'),'new field skill is not invented from history');
 assert(c.trackFocus('set:change'));assert.equal(c.mainObjective().kind,'Набір альбому');assert.equal(c.mainObjective().value,6);assert(!c.trackFocus('set:unknown'));assert(!c.trackFocus('order'));
 assert(c.trackFocus('goal:album3'));assert.equal(c.mainObjective().kind,'Ціль колекціонера');assert(c.trackFocus(null));assert.equal(c.mainObjective().title,'Повернення за сигналом');
 m('storage').save();const resumed=await newRun(r.store.get('last-signal-v1'));assert.deepEqual(resumed.state().career,plain(s.career));
 const backup=m('backup-format'),portable=backup.parseBackup(backup.createBackup(s)).state;assert.deepEqual(plain(portable.career),plain(s.career));
 console.log('PASS eight obtainable sets, alternative/year/condition slots, no bag credit, all 12 original goals, old progress, sequential and one-time camp rewards, tracking and portable saves');
 // Real trip: a mark from the initial visit is recorded only on a subsequent arrival.
 const f=await newRun(),fm=n=>ns(f,n),fs=fm('storage').s;fs.coins=1000;fm('camp').depart();close(f);
 const site=fs.atlas.sites[0],target=fs.objects[0];target.depth=2;target.condition=60;fs.x=target.x;fs.y=target.y;
 assert(fm('field-notes').toggleFieldMark());assert.equal(fm('career').findChallenge(target).returned,false,'new mark on first visit is not a return');
 const marks=plain(fs.fieldMarks);fm('camp').returnHome();fm('atlas-state').selectSite(site.id);fm('camp').depart();close(f);
 assert.deepEqual(plain(fs.progress.active.returnMarks),marks);fs.energy=100;fm('search').dig();assert(fs.pending.careerFind.deep);assert(fs.pending.careerFind.returned);assert.equal(fs.career,undefined,'digging alone awards nothing');
 const pendingRun=await newRun(f.store.get('last-signal-v1'));assert(pendingRun.state().pending.careerFind.returned);finish(pendingRun);
 assert.equal(ns(pendingRun,'storage').s.career.field.returns,1);assert.equal(ns(pendingRun,'storage').s.career.field.deep,1);const kept=plain(ns(pendingRun,'storage').s);ns(pendingRun,'packing').resolvePacking('take');assert.deepEqual(plain(ns(pendingRun,'storage').s),kept,'repeated packing cannot duplicate credit');
 finish(f,'leave');assert.equal(fs.career,undefined,'leaving the find gives no field challenge credit');
 const next=fs.objects.find(o=>!o.dug);next.depth=2;fs.x=next.x;fs.y=next.y;fs.energy=100;fs.fieldMarks=[{x:next.x,y:next.y}];
 assert.equal(fm('career').findChallenge(next).returned,Math.hypot(next.x-marks[0].x,next.y-marks[0].y)<=.04,'newly moved marker cannot forge a pre-arrival marker');
 fs.objects=Array.from({length:5},(_,i)=>({x:.1+i*.15,y:.2,type:0,condition:60,depth:2,dug:false}));
 for(const obj of fs.objects){obj.depth=2;fs.x=obj.x;fs.y=obj.y;fs.energy=100;fs.bag=[];fm('search').dig();finish(f);}
 assert.equal(fs.career.field.deep,3,'skill counter is bounded at requirement');
 fm('camp').returnHome();assert.equal(fs.progress.history[0].returnMarks,undefined,'old marker snapshots do not bloat history');
 const noMarks=await newRun(),nm=n=>ns(noMarks,n),nstate=nm('storage').s;nstate.coins=100;nm('camp').depart();close(noMarks);const nid=nstate.atlas.activeId;nm('camp').returnHome();nm('atlas-state').selectSite(nid);nm('camp').depart();close(noMarks);assert.equal(nstate.progress.active.returnMarks,undefined,'a revisit alone invents no markers');
 console.log('PASS marked revisit through real excavation/reload/packing, no first-visit or new-marker credit, leave/repeat guards, bounded deep challenge and compact history');
 // All chapter conditions and only 500 total new coupons, without changing old goal claims.
 d.albumSets.forEach(set=>set.slots.forEach(row=>add(r,row.ids[0],100)));s.career.field={returns:1,deep:3};
 const goalsBefore=plain(s.progress.claimed),coinsBefore=s.coins;
 for(const chapter of d.chapters.slice(2)){assert.equal(c.careerSnapshot().current.id,chapter.id);assert(c.claimChapter(chapter.id));assert(!c.claimChapter(chapter.id));}
 assert.equal(s.coins-coinsBefore,415);assert.equal(c.careerSnapshot().current,null);assert.equal(c.careerSnapshot().rank,'Хранитель колекції');assert.deepEqual(plain(s.progress.claimed),goalsBefore);
 assert(c.mainObjective().text.includes('покращувати'));s.coins=Number.MAX_SAFE_INTEGER;s.career.claimed=[];assert(!c.claimChapter('first'),'overflow rejected');s.coins=415;
 const text=backup.createBackup(s);
 for(const mutate of [v=>v.career.version=2,v=>v.career.claimed=['paths'],v=>v.career.claimed=['first','first'],v=>v.career.focus='bad',v=>v.career.field.deep=4,v=>v.career.field.returns=-1,v=>v.career.field.deep=.5]){const value=JSON.parse(text);mutate(value.state);assert.throws(()=>backup.parseBackup(JSON.stringify(value)));}
 const bad=JSON.parse(text).state;bad.career.focus='unknown';const raw=JSON.stringify({version:1,state:bad}),protectedRun=await newRun(raw);assert.equal(protectedRun.store.get('last-signal-v1'),raw);assert.equal(protectedRun.elements.get('saveNote').hidden,false);
 const fieldBackup=JSON.parse(ns(pendingRun,'backup-format').createBackup(ns(pendingRun,'storage').s));fieldBackup.state.pending={type:0,condition:50,spent:10,careerFind:{deep:true,returned:false}};backup.parseBackup(JSON.stringify(fieldBackup));fieldBackup.state.pending.careerFind.deep='yes';assert.throws(()=>backup.parseBackup(JSON.stringify(fieldBackup)));
 const activeCopy=JSON.parse(nm('backup-format').createBackup(nstate));activeCopy.state.progress.active.returnMarks=[{x:2,y:.5}];assert.throws(()=>backup.parseBackup(JSON.stringify(activeCopy)));
 console.log('PASS complete career reward budget, independent old payouts, invalid/future/duplicate data and corrupted local-save protection');
 // Exercise the real delegated UI callbacks and reject actions while a dialog is open.
 const v=await newRun(),vm=n=>ns(v,n),vs=vm('storage').s,ve=id=>v.elements.get(id);
 [2,3,4].forEach(id=>add(v,id));vs.progress=data(v,'expeditions').emptyProgress();vs.progress.finds=30;vm('ui').showTab('journal');
 const click=(container,selector,dataset)=>ve(container).listeners.click[0]({target:{closest:q=>q===selector?{dataset}:null}});
 assert(ve('careerCards').innerHTML.includes('data-career-claim="first"'));
 ve('modal').showModal();click('journal','[data-career-claim]',{careerClaim:'first'});assert.equal(vs.career,undefined);ve('modal').close();
 click('journal','[data-career-claim]',{careerClaim:'first'});assert.equal(vs.career.claimed[0],'first');const uiMoney=vs.coins;
 click('journal','[data-career-claim]',{careerClaim:'first'});assert.equal(vs.coins,uiMoney);
 click('journal','[data-focus]',{focus:'goal:album10'});assert.equal(vs.career.focus,'goal:album10');
 click('journal','[data-career-album]',{});assert.equal(ve('collection').hidden,false);assert.equal(ve('albumSets').open,true);
 click('collection','[data-focus]',{focus:'set:change'});assert.equal(vs.career.focus,'set:change');vm('ui').showTab('camp');assert.equal(ve('campObjectiveTitle').textContent,'Розмінна шістка');
 ve('campObjectiveOpen').onclick();assert.equal(vm('collection').setFilter,'change');assert.equal(ve('collection').hidden,false);
 vm('orders').acceptOrder(data(v,'orders').orderOffers(0)[0].id);ve('trackOrder').onclick();assert.equal(vm('career').mainObjective().kind,'Польове замовлення');
 vm('orders').cancelOrder(vs.orders.active);assert.equal(vm('career').mainObjective().title,vm('career').careerSnapshot().current.name);
 console.log('PASS real UI claim/track/browse actions, dialog guard, double click, camp objective and canceled-order fallback');
 // Album browsing isolates missing slots and supports quality upgrades to already owned coins.
 const u=await newRun(),um=n=>ns(u,n),us=um('storage').s,ud=data(u,'career');add(u,ud.albumSets[0].slots[0].ids[0],89);
 um('collection').showSetItems('change');assert(!um('collection').categoryItems().some(t=>ud.albumSets[0].slots[0].ids.includes(t.id)));
 um('collection').showSetItems('fineChange');assert(um('collection').categoryItems().some(t=>t.id===ud.albumSets[0].slots[0].ids[0]),'owned low-condition coin remains a needed upgrade');
 u.elements.get('clearSetFilter').onclick();assert.equal(um('collection').setFilter,null);
 const ui=um('ui');us.atCamp=false;ui.showTab('search');let writes=0;for(const id of ['careerCards','albumSetCards'])Object.defineProperty(u.elements.get(id),'innerHTML',{get:()=>'',set:()=>{writes++;}});
 us.stash=new Proxy(us.stash,{get(){throw Error('Career must not read stash during field render');}});
 const snapshot=um('career').careerSnapshot();for(let i=0;i<20;i++){us.energy--;ui.render();assert.equal(um('career').careerSnapshot(),snapshot);}
 assert.equal(writes,0);assert(u.elements.get('fieldObjectiveTitle').textContent);assert.equal(us.career,undefined);
 console.log('PASS missing-set browser, condition upgrades, no hidden-card/stash work, cached progress on ordinary field updates and read-only main objective');
})().catch(error=>{console.error(error);process.exitCode=1;});
