const {newRun,root,assert}=require('./harness.cjs');
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
(async()=>{
 const r=await newRun(),audio=r.modules.get(root+'/js/audio.js').namespace,button=r.elements.get('sound');
 const contexts=[];let now=1000;r.context.performance.now=()=>now;
 class Context {
   constructor(){this.state='suspended';this.currentTime=1;this.destination={};this.oscillators=[];this.gains=[];this.resumes=[];this.suspends=[];this.resumeCalls=0;contexts.push(this);}
   change(state){this.state=state;this.onstatechange?.();}
   resume(){this.resumeCalls++;if(this.rejectResume)return Promise.reject(Error('gesture needed'));if(this.deferResume)return new Promise(resolve=>this.resumes.push(()=>{this.change('running');resolve();}));this.change('running');return Promise.resolve();}
   suspend(){if(this.deferSuspend)return new Promise(resolve=>this.suspends.push(()=>{this.change('suspended');resolve();}));this.change('suspended');return Promise.resolve();}
   createOscillator(){const o={frequency:{value:0},stopped:0,disconnected:0,connect(){},disconnect(){this.disconnected++;},start(){this.started=true;},stop(time){if(time===undefined)this.stopped++;}};this.oscillators.push(o);return o;}
   createGain(){const g={gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnected:0,disconnect(){this.disconnected++;}};this.gains.push(g);return g;}
 }
 r.context.AudioContext=Context;
 const event=(name,e={})=>r.listeners[name]?.forEach(fn=>fn(e));
 audio.beep(90);event('document:pointerdown');await settle();assert.equal(contexts.length,0,'silent startup and gestures cannot enable audio');
 await button.onclick();const c=contexts[0];assert(audio.sound);assert.equal(c.oscillators.length,1);assert.equal(button['aria-pressed'],'true');
 audio.beep(90);assert.equal(c.oscillators.length,1,'cadence guards duplicate consumers');now+=1000;audio.beep(90);assert.equal(c.oscillators.length,2);
 c.oscillators[0].onended();assert(c.oscillators[0].disconnected);assert(c.gains[0].disconnected);
 r.context.document.visibilityState='hidden';event('document:visibilitychange');await settle();
 assert.equal(c.state,'suspended');assert(c.oscillators[1].stopped);assert(c.oscillators[1].disconnected);assert(audio.sound,'user preference survives interruption');
 now+=1000;audio.beep(90);assert.equal(c.oscillators.length,2);event('document:pointerdown');await settle();assert.equal(c.state,'suspended');
 r.context.document.visibilityState='visible';event('document:visibilitychange');await settle();assert.equal(c.state,'running');audio.beep(90);assert.equal(c.oscillators.length,3);
 event('pagehide');await settle();now+=1000;audio.beep(90);assert.equal(c.oscillators.length,3,'pagehide blocks audio even before visibility changes');
 event('pageshow');await settle();assert.equal(c.state,'running');audio.beep(90);assert.equal(c.oscillators.length,4);
 // Failed automatic resume remains quiet; the next gesture retries, without a
 // pile of oscillators or repeated attempts for every pointermove.
 c.rejectResume=true;c.change('interrupted');event('document:visibilitychange');await settle();
 const calls=c.resumeCalls,count=c.oscillators.length;assert.equal(button.textContent,'Звук: пауза');
 for(let i=0;i<100;i++){now+=100;audio.beep(90);}assert.equal(c.oscillators.length,count);assert.equal(c.resumeCalls,calls);
 c.rejectResume=false;event('document:pointerdown');await settle();assert.equal(c.state,'running');audio.beep(90);assert.equal(c.oscillators.length,count+1);
 await button.onclick();assert(!audio.sound);assert.equal(c.state,'suspended');assert.equal(button['aria-pressed'],'false');
 event('pageshow');event('document:pointerdown');event('document:keydown',{repeat:false});await settle();assert(!audio.sound);assert.equal(c.state,'suspended');
 // Disabling while resume is unresolved must win over its late completion.
 c.deferResume=true;const enabling=button.onclick();assert(audio.sound);assert.equal(c.resumes.length,1);
 await button.onclick();assert(!audio.sound);const before=c.oscillators.length;c.resumes.shift()();await enabling;await settle();
 assert.equal(c.state,'suspended');assert(!audio.sound);assert.equal(c.oscillators.length,before);
 // A foreground gesture may retry a pending automatic resume.
 c.deferResume=false;await button.onclick();c.deferResume=true;c.change('suspended');event('document:visibilitychange');
 assert.equal(c.resumes.length,1);event('document:pointerdown');assert.equal(c.resumes.length,2);
 c.resumes.shift()();c.resumes.shift()();await settle();assert.equal(c.state,'running');c.deferResume=false;
 // A slow suspend finishing after a return is repaired.
 c.deferSuspend=true;r.context.document.visibilityState='hidden';event('document:visibilitychange');
 r.context.document.visibilityState='visible';event('document:visibilitychange');await settle();assert(c.suspends.length);
 c.deferSuspend=false;for(const complete of c.suspends.splice(0))complete();await settle();assert.equal(c.state,'running');
 c.change('closed');event('document:pointerdown');await settle();assert.equal(contexts.length,2);assert.equal(audio.audio.state,'running');
 assert.equal(c.onstatechange,null,'retired context has no retained state handler');
 await button.onclick();assert(!audio.sound);
 const unsupported=await newRun(),u=unsupported.modules.get(root+'/js/audio.js').namespace;
 await unsupported.elements.get('sound').onclick();assert(!u.sound);assert.equal(unsupported.elements.get('sound').textContent,'Звук недоступний');
 console.log('PASS silent startup, cadence and voice disposal, hide/show/BFCache, interrupted and rejected resumes, gesture retry, no silent-context backlog, rapid off during resume, delayed suspend, closed-context replacement and unavailable audio');
})().catch(e=>{console.error(e);process.exit(1)});
