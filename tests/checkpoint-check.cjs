const {newRun,root,assert}=require('./harness.cjs');
const ns=(r,n)=>r.modules.get(root+'/js/'+n+'.js').namespace;
(async()=>{
 const r=await newRun(),st=ns(r,'storage'),cp=ns(r,'checkpoint');
 assert.equal(cp.readCheckpoint().state.coins,0);
 const first=r.store.get(cp.CHECKPOINT_KEY);
 st.s.coins=123;assert(st.save());assert.equal(r.store.get(cp.CHECKPOINT_KEY),first,'ordinary writes are throttled');
 r.listeners.pagehide.forEach(fn=>fn());assert.equal(cp.readCheckpoint().state.coins,123);
 const second=r.store.get(cp.CHECKPOINT_KEY);r.listeners.pagehide.forEach(fn=>fn());assert.equal(r.store.get(cp.CHECKPOINT_KEY),second,'unchanged duplicate lifecycle events do not rewrite copies');
 // A later malformed primary must not erase the last valid checkpoint at startup.
 const broken=await newRun('{broken',false,e=>e.store.set(cp.CHECKPOINT_KEY,second),{start:false});
 const bs=ns(broken,'storage');assert.equal(broken.store.get(bs.KEY),'{broken');assert.equal(broken.store.get(cp.CHECKPOINT_KEY),second);
 broken.elements.get('backupAutoRecovery').onclick();assert(broken.elements.get('backupDialog').open);assert.equal(bs.s.coins,0);
 broken.elements.get('backupCancel').onclick();assert.equal(broken.store.get(bs.KEY),'{broken');
 let reloads=0;broken.context.location={reload(){reloads++;}};
 broken.elements.get('backupAutoRecovery').onclick();broken.elements.get('backupConfirm').onclick();
 assert.equal(bs.s.coins,123);assert.equal(reloads,1);broken.listeners.pagehide.forEach(fn=>fn());
 assert.equal(JSON.parse(broken.store.get(bs.KEY)).state.coins,123,'pagehide cannot overwrite the restored state');
 // Exhausting space for the optional copy leaves both primary and prior copy intact.
 const write=r.context.localStorage.setItem;
 r.context.localStorage.setItem=(k,v)=>{if(k===cp.CHECKPOINT_KEY)throw Error('quota');write(k,v);};
 st.s.coins=456;assert(st.save({checkpoint:true}));assert.equal(JSON.parse(r.store.get(st.KEY)).state.coins,456);assert.equal(r.store.get(cp.CHECKPOINT_KEY),second);
 assert.match(r.elements.get('backupAutoStatus').textContent,/не оновлено/);assert.equal(r.elements.get('backupAutoRecovery').disabled,false);
 r.context.localStorage.setItem=write;assert(st.save({checkpoint:true}));assert.equal(cp.readCheckpoint().state.coins,456);
 const valid=r.store.get(cp.CHECKPOINT_KEY);st.s.coins=-1;st.save({checkpoint:true});assert.equal(r.store.get(cp.CHECKPOINT_KEY),valid,'invalid game state never replaces a validated copy');
 const en=await newRun(null,false,e=>e.store.set('last-signal-language','en'));assert.match(en.elements.get('backupAutoStatus').textContent,/Automatic backup/);assert(!/[А-Яа-яІіЇїЄєҐґ]/.test(en.elements.get('backupAutoStatus').textContent));
 // A partially cleaned find is restored with exactly the same cost and brush marks.
 const dig=await newRun();ns(dig,'camp').depart();dig.elements.get('modal').close();
 const ds=ns(dig,'storage');ds.s.energy=41.5;ds.s.pending={type:30,condition:86,spent:7.5};ns(dig,'excavation').openExcavation();ns(dig,'excavation').brushAt(220,180);
 ds.save({checkpoint:true});const snapshot=ns(dig,'checkpoint').readCheckpoint();
 assert.equal(snapshot.state.energy,41.5);assert(snapshot.state.pending.cleanedCells.length>0);assert(snapshot.state.pending.cleanedCells.length<256);
 assert.equal(JSON.stringify(snapshot.state.pending),JSON.stringify(ds.s.pending));
 console.log('PASS throttled automatic backups, duplicate events, corrupt primary recovery, explicit preview/confirm, write failures, UK/EN and partial finds');
})().catch(e=>{console.error(e);process.exit(1)});
