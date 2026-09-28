const {newRun,root,golden,assert}=require('./harness.cjs');
(async()=>{
 for(const fixture of golden.fixtures){
  const run=await newRun(fixture.saved);const mod=f=>run.modules.get(root+'/js/'+f+'.js').namespace;
  const format=mod('backup-format'),storage=mod('storage');
  const text=format.createBackup(storage.s),parsed=format.parseBackup(text);
  assert.deepEqual(JSON.parse(JSON.stringify(parsed.state)),{...run.state(),earned:run.state().earned??0,found:run.state().found??0},fixture.name+' roundtrip');
 }
 console.log('PASS backup roundtrips for fresh, legacy and pending finds');
 const run=await newRun(null);const mod=f=>run.modules.get(root+'/js/'+f+'.js').namespace;const format=mod('backup-format'),storage=mod('storage');
 const before=JSON.stringify(run.state()),backup=format.createBackup(storage.s);
 for(const bad of ['{}','not json','{"__proto__":{}}',backup.replace('"backupVersion":1','"backupVersion":999'),backup.replace('"level":1','"level":101'),backup.replace('"coins":0','"coins":-1')])assert.throws(()=>format.parseBackup(bad));
 const bad=JSON.parse(backup);bad.state.bag=[{type:999999,condition:50}];assert.throws(()=>format.parseBackup(JSON.stringify(bad)));
 const badCondition=JSON.parse(backup);badCondition.state.energy=null;assert.throws(()=>format.parseBackup(JSON.stringify(badCondition)));
 assert.equal(JSON.stringify(run.state()),before);console.log('PASS invalid files do not mutate state');
 const next=format.parseBackup(backup).state;next.coins=1234;
 storage.installBackupState(next,backup);assert.equal(storage.s.coins,1234);assert.equal(format.parseBackup(run.store.get(storage.RECOVERY_KEY)).state.coins,0);
 run.listeners.pagehide.forEach(fn=>fn());assert.equal(JSON.parse(run.store.get(storage.KEY)).state.coins,1234);
 const reload=await newRun(run.store.get(storage.KEY));assert.equal(reload.state().coins,1234);
 const old=format.parseBackup(run.store.get(storage.RECOVERY_KEY));storage.installBackupState(old.state,format.createBackup(storage.s));assert.equal(storage.s.coins,0);
 console.log('PASS restore → pagehide → reload → recover previous state');
 for(const failAt of [storage.RECOVERY_KEY,storage.KEY]){
  const saved=run.context.localStorage.setItem,oldState=JSON.stringify(run.state()),oldSaved=run.store.get(storage.KEY);
  run.context.localStorage.setItem=(key,value)=>{if(key===failAt)throw Error('quota');saved(key,value)};
  assert.throws(()=>storage.installBackupState(next,format.createBackup(storage.s)));
  assert.equal(JSON.stringify(run.state()),oldState);assert.equal(run.store.get(storage.KEY),oldSaved);
  run.context.localStorage.setItem=saved;
 }
 console.log('PASS failed writes preserve active state and primary save');
 const content=format.createBackup(storage.s);const input=run.elements.get('backupFile');
 await input.onchange({target:{files:[{size:content.length,text:async()=>content}],value:'file'}});
 assert.equal(run.elements.get('backupDialog').open,true);run.elements.get('backupCancel').onclick();assert.equal(run.elements.get('backupDialog').open,false);assert.equal(storage.s.coins,0);
 await input.onchange({target:{files:[{size:6,text:async()=>'{oops'}],value:'file'}});assert.equal(run.elements.get('backupDialog').open,false);assert.equal(storage.s.coins,0);
 console.log('PASS file preview, cancel and invalid input UI');
})().catch(e=>{console.error(e);process.exit(1)});
