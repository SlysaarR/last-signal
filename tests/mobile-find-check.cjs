const {newRun,root,assert}=require('./harness.cjs');
const fs=require('node:fs');
const ns=(run,name)=>run.modules.get(root+'/js/'+name+'.js').namespace;
const plain=value=>JSON.parse(JSON.stringify(value));
const click=(el,action)=>el('packChoices').listeners.click[0]({target:{closest:()=>({dataset:{pack:action}})}});
(async()=>{
 for(const lang of ['uk','en']){
  const r=await newRun(null,false,e=>e.store.set('last-signal-language',lang)),m=n=>ns(r,n),s=m('storage').s,el=id=>r.elements.get(id);
  m('camp').depart();el('modal').close();
  const cap=m('rules').bagCapacity();
  const prepare=(full=true)=>{
   s.bag=Array.from({length:full?cap:0},(_,i)=>({type:i,condition:31+i}));s.food=[0,0,0];
   s.pending={type:30,condition:86,spent:7.5,revealed:true};m('packing').openPacking();
  };
  prepare();const before=JSON.stringify(s),initialFound=s.found||0;
  assert(el('packTake').hidden);assert(!el('packSwap').hidden);assert(el('packSwap').disabled);assert(!el('packReplacementField').hidden);
  assert.equal((el('packReplacement').innerHTML.match(/value="swap:/g)||[]).length,cap,'every physical item is selectable');
  for(const invalid of ['', 'swap:-1','swap:999','food:0','__proto__:0','swap:0.5']){
   el('packReplacement').value=invalid;el('packReplacement').onchange();assert(el('packSwap').disabled);click(el,'replace');assert.equal(JSON.stringify(s),before,'invalid selection cannot discard anything');
  }
  // Explicitly choose a nonfirst item: the physical index and all other finds survive.
  el('packReplacement').value='swap:2';el('packReplacement').onchange();assert(!el('packSwap').disabled);
  const original=plain(s.bag);click(el,'replace');assert.equal(s.bag.length,cap);assert.deepEqual(plain(s.bag[2]),{type:30,condition:86});
  for(let i=0;i<cap;i++)if(i!==2)assert.deepEqual(plain(s.bag[i]),original[i]);
  assert.equal(s.found,initialFound+1);assert.equal(s.pending,null);assert(!el('packDialog').open);
  click(el,'replace');assert.equal(s.found,initialFound+1,'double activation is harmless');

  prepare();s.bag.pop();s.food=[0,1,0];m('packing').openPacking();
  assert.match(el('packReplacement').innerHTML,/value="food:1"/);assert(!/value="food:0"/.test(el('packReplacement').innerHTML));
  const bagBefore=plain(s.bag),energy=s.energy;
  el('packReplacement').value='food:1';el('packReplacement').onchange();click(el,'replace');
  assert.equal(s.food[1],0);assert.equal(s.bag.length,cap);assert.deepEqual(plain(s.bag.slice(0,-1)),bagBefore);assert.equal(s.energy,energy,'discarding food does not consume it for energy');

  prepare();const keep=plain(s.bag);el('leaveFind').onclick();assert.deepEqual(plain(s.bag),keep);assert.equal(s.pending,null);
  prepare(false);assert(!el('packTake').hidden);assert(el('packSwap').hidden);assert(el('packReplacementField').hidden);assert.equal(el('packReplacement').innerHTML,'','no unused choice list for an empty bag');
  click(el,'take');assert.deepEqual(plain(s.bag),[{type:30,condition:86}]);assert.equal(s.pending,null);
  // Reloading a full-bag decision must reopen the decision without auto-selecting a sacrifice.
  prepare();m('storage').save();const loaded=await newRun(r.store.get('last-signal-v1'),false,e=>e.store.set('last-signal-language',lang));
  assert(loaded.elements.get('packDialog').open);assert(loaded.elements.get('packSwap').disabled);assert.equal(loaded.elements.get('packReplacement').value,'');assert.deepEqual(loaded.state().pending,plain(s.pending));
  console.log('PASS '+lang+' normal/full bag, complete replacement list, explicit choice, actual item/food indices, invalid values, leave, double activation and pending reload');
 }
 const r=await newRun(),m=n=>ns(r,n),s=m('storage').s,el=id=>r.elements.get(id);
 for(const [value,label]of [[0,0],[99999,99999],[100000,'100k'],[999999,'999k'],[1000000,'1M'],[1234567,'1.2M'],[999999999,'999.9M']])assert.equal(m('ui').compactResource(value),label);
 s.energy=97.5;s.coins=1234567;s.day=321;const saved=JSON.stringify(s);m('ui').render();
 assert.equal(el('energy').textContent,97.5);assert.equal(el('coins').textContent,'1.2M');assert.equal(el('day').textContent,321);
 assert.match(el('energyStat')['aria-label'],/97\.5 \/ /);assert.match(el('coinsStat').title,/1234567/);assert.equal(el('coinsStat').dataset.tooltip,el('coinsStat')['aria-label']);assert.equal(JSON.stringify(s),saved);
 assert.equal(r.frames.size,0,'compact counters do not add render loops');
 console.log('PASS compact counters, exact accessible values, fractional energy and unchanged state');

 // Cleaning inputs use the actual, ratio-preserving canvas rectangle at every size.
 for(const width of [144,204.48,267,360,600]){
  const run=await newRun(),st=ns(run,'storage').s,exc=ns(run,'excavation');
  st.pending={type:0,condition:75,spent:5};exc.openExcavation();
  const soil=run.elements.get('soil'),rect={left:19,top:41,width,height:width*5/6};soil.getBoundingClientRect=()=>rect;
  exc.brushMove({clientX:rect.left+300/600*rect.width,clientY:rect.top+250/500*rect.height});run.flushFrames();
  const cells=plain(st.pending.cleanedCells);assert(cells.length>0);assert(cells.includes(8*16+8),'brush reaches the same middle cells at '+width);
  assert(run.elements.get('excInspectionOptions').hidden);
  for(let y=130;y<=370;y+=40)for(let x=180;x<=420;x+=40)exc.brushAt(x,y);
  assert(!run.elements.get('excInspectionOptions').hidden);assert(!run.elements.get('excNext').disabled);
 }
 console.log('PASS cleaning coordinates at five canvas sizes and visible controls only after cleaning');

 const html=fs.readFileSync(root+'/index.html','utf8'),css=fs.readFileSync(root+'/css/game-shell.css','utf8').split('/* 0.54.1:')[1];
 for(const id of ['artifact','soil','dustOverlay','packArt','detailArt'])assert.match(html,new RegExp('id="'+id+'" width="600" height="500"'));
 assert.match(css,/#excavate \.excavation\{[^}]*height:auto;aspect-ratio:6 \/ 5/);
 assert.match(css,/#detailArt,#packArt\{[^}]*height:auto;aspect-ratio:6 \/ 5/);
 assert.match(css,/#field\{width:auto;height:auto;max-width:100%;max-height:100%/);
 assert.match(css,/grid-template-rows:auto minmax\(0,1fr\) auto/);
 assert.match(css,/\.find-dialog-body\{[^}]*overflow:auto/);
 const packing=html.split('<dialog id="packDialog"')[1].split('</dialog>')[0];
 const footer=packing.split('<footer class="find-dialog-actions">')[1];assert.match(footer,/id="packChoices"/);assert.match(footer,/id="leaveFind"/);assert(!packing.split('<footer')[0].includes('id="leaveFind"'));
 console.log('PASS canvas/aspect and fixed decision-region source contracts; not a browser geometry test');
})().catch(error=>{console.error(error);process.exit(1)});
