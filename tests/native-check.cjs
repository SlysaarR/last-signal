const {newRun,root,assert}=require('./harness.cjs');
function setup(e){
 e.context.location={origin:'https://appassets.androidplatform.net',pathname:'/assets/game/index.html'};
 e.context.LastSignalAndroid={version:()=> 'native-test',exportBackup:text=>{e.exported=text;return true;}};
 e.context.Event=class{constructor(type,options={}){this.type=type;this.cancelable=options.cancelable;this.defaultPrevented=false;}preventDefault(){if(this.cancelable)this.defaultPrevented=true;}};
 e.context.dispatchEvent=event=>{for(const fn of e.listeners[event.type]||[])fn(event);return !event.defaultPrevented;};
 for(const el of e.elements.values())el.dispatchEvent=event=>{for(const fn of el.listeners[event.type]||[])fn(event);return !event.defaultPrevented;};
}
(async()=>{
 const browser=await newRun(null,false,e=>{e.context.LastSignalAndroid={version:()=> 'spoof',exportBackup:()=>true};},{start:false});
 assert.equal(browser.context.LastSignalApp,undefined,'ordinary browser cannot activate the native bridge');
 const run=await newRun(null,false,setup,{start:false}),app=run.context.LastSignalApp;
 const storage=run.modules.get(root+'/js/storage.js').namespace;
 assert(app);assert.equal(run.elements.get('menuVersion').textContent,'native-test');
 assert.equal(run.elements.get('offlineCheck').hidden,true);
 assert.equal(app.back(),'exit');run.elements.get('continueGame').onclick();assert.equal(app.back(),'handled');
 assert.equal(run.context.document.documentElement.dataset.screen,'menu');
 const dialog=run.elements.get('backupDialog');dialog.showModal();assert.equal(app.back(),'handled');assert.equal(dialog.open,false);
 const guarded=run.elements.get('packDialog');guarded.showModal();app.back();assert.equal(guarded.open,true,'pending-find cancel guard is respected');guarded.close();
 storage.s.coins=4321;app.pause();assert.equal(JSON.parse(run.store.get(storage.KEY)).state.coins,4321);
 app.resume();run.elements.get('backupExport').onclick();assert.equal(JSON.parse(run.exported).state.coins,4321);
 assert.match(run.elements.get('backupStatus').textContent,/Обери/,'success waits for actual file write');
 run.context.dispatchEvent({type:'last-signal-backup-export',detail:{status:'saved'}});assert.match(run.elements.get('backupStatus').textContent,/Копію збережено/);
 run.context.dispatchEvent({type:'last-signal-backup-export',detail:{status:'cancelled'}});assert.match(run.elements.get('backupStatus').textContent,/скасовано/);assert.equal(storage.s.coins,4321);
 run.elements.get('continueGame').onclick();run.context.localStorage.setItem=()=>{throw Error('quota');};assert.equal(app.back(),'handled');assert.notEqual(run.context.document.documentElement.dataset.screen,'menu','failed save prevents leaving gameplay');
 console.log('PASS native origin, offline branch, back/dialog guards, lifecycle save, native export confirmation and storage failure');
})().catch(e=>{console.error(e);process.exit(1)});
