const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.resolve(__dirname,'../recover.html'),'utf8'),script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
class Target{constructor(){this.listeners={};}addEventListener(t,f){(this.listeners[t]??=new Set()).add(f);}removeEventListener(t,f){this.listeners[t]?.delete(f);}emit(t,e={}){for(const f of this.listeners[t]||[])f(e);}}
function setup(options={}){
  const config={version:'0.55.1',ready:true,reply:'ok',online:true,...options},calls=[],timers=new Map(),elements={update:{disabled:false},status:{textContent:''},open:{hidden:true}};let timerID=0;
  const worker=Object.assign(new Target(),{state:options.installing?'installing':options.active?'activated':'installed',postMessage(data,ports){
    calls.push(data.type);let reply;
    if(data.type==='OFFLINE_STATUS')reply={ok:true,ready:config.ready,version:config.version};
    if(data.type==='OFFLINE_REPAIR')reply={ok:!config.repairFails,ready:!config.repairFails,version:config.version};
    if(data.type==='OFFLINE_APPLY'){
      reply=config.reply==='ok'?{ok:true}:{ok:false,reason:config.reply};
      if(reply.ok&&!config.deferActivation){this.state='activated';this.emit('statechange');}
    }
    if(!config.noReply)queueMicrotask(()=>ports[0].postMessage(reply));
  }});
  const registration={installing:options.installing?worker:null,waiting:options.installing||options.active?null:worker,active:options.active?worker:null,update:async()=>{calls.push('update');if(config.updateFails)throw Error('Network failed');}};
  const sw=Object.assign(new Target(),{register:async(url,opts)=>{calls.push({url,opts});return registration;}});
  class Channel{constructor(){const a={close(){}},b={close(){},postMessage:data=>a.onmessage({data})};this.port1=a;this.port2=b;}}
  const context=vm.createContext({document:{getElementById:id=>elements[id]},window:{isSecureContext:true},location:{href:'https://example.test/last-signal/recover.html'},navigator:{onLine:config.online,...(options.unsupported?{}:{serviceWorker:sw})},URL,MessageChannel:Channel,setTimeout:fn=>{timers.set(++timerID,fn);return timerID;},clearTimeout:id=>timers.delete(id)});
  // Deliberately provide no storage/caches/game APIs: any accidental access fails.
  vm.runInContext(script,context);
  return {config,calls,timers,elements,worker,registration,sw,run:()=>elements.update.onclick()};
}
(async()=>{
  assert(!/<(?:script|link)[^>]+(?:src|href)=/i.test(html),'recovery must not depend on cached game code/styles');
  assert(!/\b(?:localStorage|sessionStorage|indexedDB|caches)\s*[.[]/.test(script),'recovery must leave player storage alone');
  const normal=setup();await normal.run();assert.equal(normal.elements.open.hidden,false);assert.match(normal.elements.status.textContent,/0\.55\.1/);assert.equal(normal.calls.filter(x=>x==='OFFLINE_APPLY').length,1);assert.equal(normal.timers.size,0);
  assert.equal(normal.calls[0].url,'https://example.test/last-signal/sw.js');assert.equal(normal.calls[0].opts.scope,'https://example.test/last-signal/');assert.equal(normal.calls[0].opts.updateViaCache,'none');
  const tabs=setup({reply:'tabs'});await tabs.run();assert(tabs.elements.open.hidden);assert.match(tabs.elements.status.textContent,/інші вкладки/);tabs.config.reply='ok';await tabs.run();assert(!tabs.elements.open.hidden);
  const incomplete=setup({ready:false});await incomplete.run();assert(incomplete.calls.indexOf('OFFLINE_REPAIR')<incomplete.calls.indexOf('OFFLINE_APPLY'));assert(!incomplete.elements.open.hidden);
  for(const opts of [{version:'0.55.0'},{ready:false,repairFails:true},{reply:'incomplete'},{online:false},{updateFails:true}]){const u=setup(opts);await u.run();assert(u.elements.open.hidden);assert(!u.elements.update.disabled);if(opts.reply!=='incomplete')assert(!u.calls.includes('OFFLINE_APPLY'));}
  const unsupported=setup({unsupported:true});assert(unsupported.elements.update.disabled);assert.equal(unsupported.elements.update.onclick,undefined);
  const delayed=setup({deferActivation:true});const promise=delayed.run();await tick();assert(delayed.elements.update.disabled);assert(delayed.elements.open.hidden);delayed.worker.state='activated';delayed.worker.emit('statechange');await promise;assert(!delayed.elements.open.hidden);
  const installing=setup({installing:true});const installingRun=installing.run();await tick();assert(!installing.calls.includes('OFFLINE_APPLY'));installing.registration.waiting=installing.worker;installing.registration.installing=null;installing.worker.state='installed';installing.worker.emit('statechange');await installingRun;assert(!installing.elements.open.hidden);
  const failedInstall=setup({installing:true});const failedRun=failedInstall.run();await tick();failedInstall.worker.state='redundant';failedInstall.worker.emit('statechange');await failedRun;assert(failedInstall.elements.open.hidden);assert(!failedInstall.elements.update.disabled);
  const timeout=setup({noReply:true});const timeoutRun=timeout.run();await tick();[...timeout.timers.values()][0]();await timeoutRun;assert(timeout.elements.open.hidden);assert(!timeout.elements.update.disabled);
  for(const options of [{active:true},{version:'0.56.0'}]){const u=setup(options);await u.run();assert(!u.elements.open.hidden);}
  console.log('PASS independent update recovery, old-version rejection, same-scope registration, download/activation waiting, other-window guard, repair, failure/retry, timeouts and no game storage access');
})().catch(error=>{console.error(error);process.exitCode=1;});
