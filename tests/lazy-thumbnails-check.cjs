const fs=require('node:fs'),vm=require('node:vm');
const {newRun,root,assert}=require('./harness.cjs');
async function fixture(withObserver=true) {
  let now=0,nextFrame=0,revision=0,cost=0,observer;
  const frames=new Map(),events={},nodes=[],painted=[];
  const listen=(name,fn)=>(events[name]??=[]).push(fn);
  const document={visibilityState:'visible',querySelectorAll:()=>nodes,addEventListener:listen};
  const window={innerWidth:320,innerHeight:568,addEventListener:listen};
  const context=vm.createContext({document,window,performance:{now:()=>now},requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id)});
  if(withObserver)context.IntersectionObserver=class {
    constructor(callback,options){this.callback=callback;this.options=options;this.targets=new Set();observer=this;}
    observe(node){this.targets.add(node);}unobserve(node){this.targets.delete(node);}
  };
  const module=new vm.SourceTextModule(fs.readFileSync(root+'/js/graphics/lazy-thumbnails.js','utf8'),{context});
  await module.link(()=>{throw Error('Unexpected import');});await module.evaluate();
  const queue=module.namespace.createLazyThumbnails({selector:'canvas',key:node=>node.id+':'+revision,paint:node=>{node.width=node.height=260;painted.push(node.id);now+=cost;}});
  const add=(id,top=0)=>{const node={id,top,width:1,height:1,isConnected:true,hidden:false,dataset:{},closest(){return this.hidden?{}:null;},getBoundingClientRect(){return {top:this.top,bottom:this.top+90,left:0,right:90,width:90,height:90};}};nodes.push(node);return node;};
  const tick=()=>{const pending=[...frames.values()];frames.clear();for(const fn of pending)fn();};
  const drain=()=>{let n=0;while(frames.size){assert(++n<200,'queue settles');tick();}};
  return {nodes,painted,frames,queue,document,add,tick,drain,get observer(){return observer;},enter:(...targets)=>observer.callback(targets.map(target=>({target,isIntersecting:true}))),leave:(...targets)=>observer.callback(targets.map(target=>({target,isIntersecting:false}))),event:name=>events[name]?.forEach(fn=>fn()),bump:()=>revision++,setCost:ms=>cost=ms};
}
(async()=>{
  const f=await fixture();for(let i=0;i<250;i++)f.add(i,i*100);
  f.queue.refresh();assert.equal(f.observer.targets.size,250);assert.equal(f.frames.size,0);assert.equal(f.painted.length,0,'registration paints nothing');
  assert(f.nodes.every(node=>node.width===1),'unseen canvases keep tiny buffers');
  f.enter(...f.nodes.slice(0,12));assert.equal(f.frames.size,1);
  f.tick();assert.equal(f.painted.length,2,'at most two paintings per frame');
  f.leave(...f.nodes.slice(2,12));f.drain();assert.equal(f.painted.length,2,'fast scrolling cancels queued offscreen art');
  f.bump();f.queue.invalidate();f.drain();assert.deepEqual(f.painted,[0,1,0,1],'image readiness repaints only near canvases');
  f.queue.invalidate();f.queue.refresh();f.drain();assert.equal(f.painted.length,4,'matching keys skip work');
  f.enter(f.nodes[2],f.nodes[3]);f.nodes[2].hidden=true;f.nodes[3].isConnected=false;f.drain();
  assert.equal(f.painted.length,4,'hidden tabs and removed nodes are checked again at paint time');assert(!f.observer.targets.has(f.nodes[3]));
  f.nodes[2].hidden=false;f.queue.refresh();f.drain();assert(f.painted.includes(2),'cached tab resumes without rebuilding DOM');
  f.bump();f.queue.invalidate();f.document.visibilityState='hidden';f.event('visibilitychange');assert.equal(f.frames.size,0);
  const before=f.painted.length;f.queue.invalidate();f.drain();assert.equal(f.painted.length,before,'hidden document does no work');
  f.document.visibilityState='visible';f.event('visibilitychange');f.drain();assert.equal(f.painted.length,before+3,'return catches up loaded images');
  // A completed canvas stays observed so an image loaded while offscreen catches up.
  f.leave(f.nodes[0]);f.bump();f.queue.invalidate();f.drain();const offscreen=f.painted.filter(id=>id===0).length;
  f.enter(f.nodes[0]);f.drain();assert.equal(f.painted.filter(id=>id===0).length,offscreen+1);
  // Filter/category replacement releases every old observer reference.
  for(const node of f.nodes)node.isConnected=false;f.nodes.length=0;const replacement=f.add('replacement');
  f.queue.refresh();assert.equal(f.observer.targets.size,1);f.enter(replacement);f.drain();
  f.observer.callback([{target:{isConnected:false},isIntersecting:true}]);f.drain();
  const slow=await fixture();slow.setCost(7);for(let i=0;i<6;i++)slow.add(i);
  slow.queue.refresh();slow.enter(...slow.nodes);slow.tick();assert.equal(slow.painted.length,1,'one slow drawing yields before starting another');slow.drain();assert.equal(slow.painted.length,6);
  const fallback=await fixture(false),near=fallback.add('near',100),far=fallback.add('far',1000),hidden=fallback.add('hidden',100);hidden.hidden=true;
  fallback.queue.refresh();fallback.drain();assert.deepEqual(fallback.painted,['near']);
  near.top=-300;far.top=300;fallback.event('scroll');fallback.event('scroll');assert.equal(fallback.frames.size,1,'fallback scroll scans coalesce');fallback.drain();assert.deepEqual(fallback.painted,['near','far']);
  hidden.hidden=false;fallback.queue.refresh();fallback.drain();assert(fallback.painted.includes('hidden'));
  fallback.bump();fallback.queue.invalidate();far.top=1500;fallback.drain();assert.equal(fallback.painted.filter(id=>id==='far').length,1,'fallback rechecks a scroll that beats the next frame');
  fallback.document.visibilityState='hidden';fallback.event('visibilitychange');fallback.bump();fallback.queue.invalidate();assert.equal(fallback.frames.size,0);
  fallback.document.visibilityState='visible';fallback.event('visibilitychange');fallback.drain();
  assert.equal(fallback.painted.filter(id=>id==='hidden').length,3);
  // Exercise the real coin wiring, not just a stand-in painter.
  const run=await newRun(),art=run.modules.get(root+'/js/graphics/ukrainian-coins.js').namespace,types=JSON.parse(run.catalog());
  const type=types.findIndex(t=>t.country==='Україна'&&t.value===25),canvas=run.context.document.createElement('canvas');
  canvas.isConnected=true;canvas.closest=()=>null;canvas.width=canvas.height=1;
  canvas.dataset={coinArt:String(type),condition:'65',side:'0'};
  canvas.getBoundingClientRect=()=>({top:20,bottom:110,left:0,right:90,width:90,height:90});
  run.context.innerWidth=320;run.context.innerHeight=568;
  const query=run.context.document.querySelectorAll;run.context.document.querySelectorAll=selector=>selector==='canvas[data-coin-art]'?[canvas]:query(selector);
  assert(art.coinMarkup(type,65).includes('width="1" height="1"'));
  art.renderCoinThumbnails();assert.equal(canvas.width,1);run.flushFrames();run.flushFrames();
  assert.equal(canvas.width,260);assert.equal(canvas.height,260);assert(canvas.dataset.rendered.startsWith(type+':65:0:'));
  const key=canvas.dataset.rendered;canvas.dataset.condition='20';art.renderCoinThumbnails();run.flushFrames();run.flushFrames();assert.notEqual(canvas.dataset.rendered,key);
  console.log('PASS 250 lazy registrations, tiny initial buffers, two-per-frame/time-target batches, fast scroll cancellation, image readiness, unchanged keys, cached tabs, hidden/resumed pages, detached-node cleanup, no-observer fallback and real coin rendering');
})().catch(e=>{console.error(e);process.exit(1)});
