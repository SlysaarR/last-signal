const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const {webcrypto,createHash}=require('node:crypto');
const root=path.resolve(__dirname,'..'),base='https://example.test/last-signal/';
const source=fs.readFileSync(root+'/sw.js','utf8'),template=fs.readFileSync(root+'/scripts/offline-worker.js','utf8');
const release=JSON.parse(source.match(/const RELEASE = ([\s\S]*?);\n\/\/ Bundled/)[1]);
const abs=url=>new URL(url,base).href;
const tick=()=>new Promise(resolve=>setImmediate(resolve));
class Cache {
 constructor(){this.data=new Map();}
 async match(url){return this.data.get(typeof url==='string'?url:url.url)?.clone();}
 async put(url,response){this.data.set(typeof url==='string'?url:url.url,response.clone());}
 async keys(){return [...this.data.keys()].map(url=>({url}));}
 async delete(url){return this.data.delete(url);}
}
class Caches {
 constructor(){this.data=new Map();}
 async open(name){if(!this.data.has(name))this.data.set(name,new Cache());return this.data.get(name);}
 async keys(){return [...this.data.keys()];}
 async delete(name){return this.data.delete(name);}
}
function worker(build=release,cacheStorage=new Caches(),files=null){
 const listeners={},requests=[],messages=[],stats={active:0,max:0,skip:0},client={id:'one',url:base,postMessage:m=>messages.push(m)};
 const windows=[client],options={offline:false,corrupt:null,fail:null};
 const self={registration:{scope:base},clients:{matchAll:async()=>windows},addEventListener:(type,fn)=>listeners[type]=fn,skipWaiting:async()=>{stats.skip++;}};
 const context=vm.createContext({self,caches:cacheStorage,URL,Response,Request,crypto:webcrypto,Uint8Array,AbortController,setTimeout,clearTimeout,console,fetch:async url=>{
  requests.push(url);stats.active++;stats.max=Math.max(stats.max,stats.active);await tick();stats.active--;
  if(options.offline || options.fail===url)throw Error('Network lost');
  const relative=new URL(url).pathname.replace('/last-signal/','');
  let data=files?.get(url) || fs.readFileSync(path.join(root,relative));
  if(options.corrupt===url){data=Buffer.from(data);data[0]^=1;}
  return new Response(data,{status:200});
 }});
 vm.runInContext('const RELEASE = '+JSON.stringify(build)+';\n'+template,context);
 async function event(type,extra={}){const waits=[];let result;listeners[type]({waitUntil:p=>waits.push(p),respondWith:p=>{result=p;},...extra});await Promise.all(waits);return result&&await result;}
 async function message(type,from=client){let result;await event('message',{data:{type},source:from,ports:[{postMessage:value=>{result=value;}}]});return result;}
 return {event,message,cacheStorage,requests,messages,stats,windows,client,options,fetch:(url,mode='same-origin',method='GET')=>event('fetch',{request:{url:abs(url),mode,method}})};
}
function revision(version,id,changes={}){
 const files=new Map(),assets=release.assets.map(a=>{
  const data=changes[a.url] ? Buffer.from(changes[a.url]) : fs.readFileSync(root+'/'+a.url.split('?')[0]);files.set(abs(a.url),data);
  return {...a,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};
 });return {build:{version,id,assets},files};
}
class Target {
 constructor(){this.listeners={};}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
 emit(type,event={}){for(const fn of this.listeners[type]||[])fn(event);}
}
async function ui({activeVersion=release.version,waiting=false,available=true,ready=true,saveOK=true,canUpdate=true}={}){
 const elements=new Map();for(const id of ['offlineSummary','offlineStatus','offlineCheck','appUpdate','appInstall','installHelp','appUpdateDialog'])elements.set(id,Object.assign(new Target(),{hidden:false,disabled:false,open:false,textContent:'',showModal(){this.open=true;},close(){this.open=false;}}));
 const calls=[],timers=new Map();let timerID=0,reloads=0;
 const config={saveOK,canUpdate,ready,reply:'ok',deferApply:false,otherDialog:false};
 const makeWorker=(state,version)=>Object.assign(new Target(),{state,version,postMessage(data,ports){
  calls.push(data.type);let reply;
  if(data.type==='OFFLINE_STATUS')reply={ok:true,ready:config.ready,version:this.version};
  if(data.type==='OFFLINE_REPAIR'){config.ready=true;reply={ok:true,ready:true,version:this.version};}
  if(data.type==='OFFLINE_APPLY'){
   reply=config.reply==='ok'?{ok:true}:{ok:false,reason:config.reply};
   if(reply.ok && !config.deferApply){this.state='activated';this.emit('statechange');}
  }
  queueMicrotask(()=>ports[0].postMessage(reply));
 }});
 const active=makeWorker('activated',activeVersion),next=waiting?makeWorker('installed','0.46.0'):null;
 const reg=Object.assign(new Target(),{active,waiting:next,installing:null,update:async()=>calls.push('update')});
 const sw=Object.assign(new Target(),{register:async(url,opts)=>{calls.push(['register',url,opts]);return reg;}});
 const window=Object.assign(new Target(),{isSecureContext:true,location:{reload:()=>{reloads++;}},matchMedia:()=>({matches:false,addEventListener(){}})});
 const document=Object.assign(new Target(),{baseURI:base+'?v=0.45.0',visibilityState:'visible',getElementById:id=>elements.get(id),querySelector:()=>config.otherDialog?{}:null});
 class Channel {
  constructor(){const a={close(){}},b={close(){},postMessage:data=>a.onmessage?.({data})};this.port1=a;this.port2=b;}
 }
 const navigator=available?{serviceWorker:sw,onLine:true}:{};
 const context=vm.createContext({window,document,navigator,URL,MessageChannel:Channel,WeakSet,Date,console,setTimeout:fn=>{timers.set(++timerID,fn);return timerID;},clearTimeout:id=>timers.delete(id)});
 const mod=new vm.SourceTextModule(fs.readFileSync(root+'/js/offline.js','utf8'),{context});await mod.link(()=>{});await mod.evaluate();
 mod.namespace.initOffline({save:()=>{calls.push('save');return config.saveOK;},canUpdate:()=>config.canUpdate});
 await tick();await tick();return {elements,calls,timers,config,window,document,navigator,reg,sw,next,active,get reloads(){return reloads;}};
}
(async()=>{
 const a=worker();await a.event('install');assert(a.stats.max<=4);assert.equal(a.requests.length,release.assets.length);assert.equal(a.stats.skip,0);
 assert((await a.message('OFFLINE_STATUS')).ready);
 const current=(await a.cacheStorage.keys())[0],cache=await a.cacheStorage.open(current);
 assert.equal((await cache.keys()).length,release.assets.length);
 a.options.offline=true;
 for(const route of ['./','./?v=999','index.html?v=0.45.0'])assert.equal(await (await a.fetch(route,'navigate')).text(),fs.readFileSync(root+'/index.html','utf8'));
 for(const asset of release.assets)assert.equal(Buffer.from(await (await a.fetch(asset.url)).arrayBuffer()).toString('hex'),fs.readFileSync(root+'/'+asset.url.split('?')[0]).toString('hex'));
 assert.equal(a.requests.length,release.assets.length,'offline reads do not touch the network');
 const indexCopy=await cache.match(abs('index.html'));await cache.delete(abs('index.html'));
 const recovery=await a.fetch('./','navigate');assert.equal(recovery.status,503);assert.match(await recovery.text(),/закрий усі вікна/);await cache.put(abs('index.html'),indexCopy);
 assert.equal(await a.fetch('https://catalog.test/coin','navigate'),undefined);
 assert.equal(await a.fetch('../other-app/','navigate'),undefined);
 assert.equal(await a.fetch('./legacy.html','navigate'),undefined);
 assert.equal(await a.fetch('index.html','same-origin','POST'),undefined);
 assert.equal(await a.message('OFFLINE_APPLY',{id:'bad',url:'https://example.test/other-app/'}),undefined);
 assert.equal(a.stats.skip,0);
 console.log('PASS full runtime-package offline start, all game files/images, deep-link queries, bounded downloads and scoped requests');
 // Readiness survives worker termination, and does not confuse a missing image with readiness.
 const restarted=worker(release,a.cacheStorage);restarted.options.offline=true;
 assert((await restarted.message('OFFLINE_STATUS')).ready);
 const coin=release.assets.find(a=>a.url.endsWith('.webp?v=0.40.0')).url;await cache.delete(abs(coin));
 assert.equal((await restarted.message('OFFLINE_STATUS')).ready,false);
 assert.equal((await restarted.fetch(coin)).status,503);
 restarted.options.offline=false;assert((await restarted.message('OFFLINE_REPAIR')).ready);assert.equal(restarted.requests.length,2,'repair fetched only the missing image after one failed offline fetch');
 // A mixed/failed deployment never replaces the working cache. Same URL is not proof of same bytes.
 const r46=revision('0.46.0','next',{ 'index.html':'<html>release 46</html>' });
 const failed=worker(r46.build,a.cacheStorage,r46.files);failed.options.corrupt=abs('index.html');
 await assert.rejects(failed.event('install'));assert.deepEqual(await a.cacheStorage.keys(),[current]);
 assert.equal(await (await a.fetch('./','navigate')).text(),fs.readFileSync(root+'/index.html','utf8'));
 const disconnected=worker(r46.build,a.cacheStorage,r46.files);disconnected.options.fail=abs('index.html');
 await assert.rejects(disconnected.event('install'));assert.deepEqual(await a.cacheStorage.keys(),[current]);
 const partialName='last-signal-offline:/last-signal/:0.46.0:next',partial=await a.cacheStorage.open(partialName),put=partial.put.bind(partial);
 partial.put=async(url,response)=>{if(url===abs('index.html'))throw Error('Quota exceeded');return put(url,response);};
 await assert.rejects(worker(r46.build,a.cacheStorage,r46.files).event('install'));assert.deepEqual(await a.cacheStorage.keys(),[current]);
 const next=worker(r46.build,a.cacheStorage,r46.files);await next.event('install');
 assert.deepEqual(next.requests,[abs('index.html')],'unchanged verified resources are reused without downloads');
 assert.equal(next.stats.skip,0,'ready updates remain waiting');
 next.windows.push({id:'two',url:base+'index.html',postMessage(){}});
 assert.equal((await next.message('OFFLINE_APPLY')).reason,'tabs');assert.equal(next.stats.skip,0);
 next.windows.pop();next.windows.push({id:'else',url:'https://example.test/unrelated/',postMessage(){}});
 assert((await next.message('OFFLINE_APPLY')).ok);assert.equal(next.stats.skip,1);
 await (await a.cacheStorage.open('unrelated-cache')).put(abs('../asset'),new Response('keep'));
 const oldName='last-signal-offline:/last-signal/:0.40.0:old';await a.cacheStorage.open(oldName);
 await next.event('activate');const names=await a.cacheStorage.keys();assert(names.includes(current));assert(names.includes('unrelated-cache'));assert(!names.includes(oldName));assert.equal(names.length,3);
 assert.equal(await (await next.fetch('./?v=0.44.0','navigate')).text(),'<html>release 46</html>');
 console.log('PASS complete-status persistence, missing-cache repair, mixed-deployment rejection, previous-release survival, reusable art, multi-window activation guard and bounded cache cleanup');
 const first=await ui();assert.match(first.elements.get('offlineSummary').textContent,/Готово/);assert.equal(first.reloads,0);
 first.sw.emit('controllerchange');await tick();assert.equal(first.reloads,0,'initial activation cannot reload the game');
 const no=await ui({available:false});assert(no.elements.get('offlineCheck').hidden);assert.match(no.elements.get('offlineSummary').textContent,/недоступний/);
 const u=await ui({waiting:true});const button=u.elements.get('appUpdate');assert.equal(button.hidden,false);
 u.config.canUpdate=false;await button.onclick();assert(!u.calls.includes('save'));assert.equal(u.reloads,0);
 u.config.canUpdate=true;u.config.otherDialog=true;await button.onclick();assert(!u.calls.includes('save'));
 u.config.otherDialog=false;u.config.saveOK=false;await button.onclick();assert.equal(u.calls.at(-1),'save');assert(!u.calls.includes('OFFLINE_APPLY'));assert.equal(u.reloads,0);
 u.config.saveOK=true;u.config.reply='tabs';await button.onclick();assert.equal(u.reloads,0);assert.equal(u.elements.get('appUpdateDialog').open,false);assert.match(u.elements.get('offlineStatus').textContent,/інші вкладки/);
 u.config.reply='ok';u.config.deferApply=true;await button.onclick();assert(u.elements.get('appUpdateDialog').open);assert.equal(u.reloads,0);
 let blocked=false;u.elements.get('appUpdateDialog').emit('cancel',{preventDefault(){blocked=true;}});assert(blocked);
 assert(u.calls.lastIndexOf('save')<u.calls.lastIndexOf('OFFLINE_APPLY'));
 u.next.state='activated';u.next.emit('statechange');u.sw.emit('controllerchange');assert.equal(u.reloads,1,'one reload after successful explicit save/apply only');
 const offlineUpdate=await ui({waiting:true});offlineUpdate.navigator.onLine=false;offlineUpdate.window.emit('offline');assert(!offlineUpdate.elements.get('appUpdate').disabled);await offlineUpdate.elements.get('appUpdate').onclick();assert.equal(offlineUpdate.reloads,1,'fully downloaded update works offline');
 const incomplete=await ui({ready:false});assert.match(incomplete.elements.get('offlineSummary').textContent,/ще не готовий/);await incomplete.elements.get('offlineCheck').onclick();assert(incomplete.calls.includes('OFFLINE_REPAIR'));assert.match(incomplete.elements.get('offlineSummary').textContent,/Готово/);
 incomplete.navigator.onLine=false;incomplete.window.emit('offline');assert(incomplete.elements.get('offlineCheck').disabled);assert.match(incomplete.elements.get('offlineSummary').textContent,/Готово/);
 let prompted=0,prevented=0;first.window.emit('beforeinstallprompt',{preventDefault(){prevented++;},prompt:async()=>{prompted++;},userChoice:Promise.resolve({outcome:'dismissed'})});
 assert.equal(prevented,1);assert.equal(first.elements.get('appInstall').hidden,false);await first.elements.get('appInstall').onclick();assert.equal(prompted,1);assert(first.elements.get('appInstall').hidden);assert.equal(first.reloads,0);
 console.log('PASS first launch, unsupported browser, explicit install prompt, offline status, save-failure and field/dialog guards, multiple windows, modal activation and exactly one saved reload');
 const manifest=JSON.parse(fs.readFileSync(root+'/manifest.webmanifest'));assert.equal(new URL(manifest.start_url,base).href,base);assert.equal(new URL(manifest.scope,base).href,base);assert.equal(manifest.display,'standalone');
 for(const icon of manifest.icons){const data=fs.readFileSync(root+'/'+icon.src),size=Number(icon.sizes.split('x')[0]);assert.equal(data.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size);assert(release.assets.some(a=>a.url===icon.src));}
 assert(release.assets.length>100);assert(!release.assets.some(a=>/tests|docs|README|sources\.json/.test(a.url)));
 console.log('PASS install manifest, PNG dimensions, scoped start URL and runtime-only package');
})().catch(error=>{console.error(error);process.exitCode=1;});
