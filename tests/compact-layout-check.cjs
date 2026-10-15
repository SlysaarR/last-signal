const {newRun,root,assert}=require('./harness.cjs');
const fs=require('node:fs');
const ns=(run,name)=>run.modules.get(root+'/js/'+name+'.js').namespace;
const ids=html=>[...html.matchAll(/data-item="(\d+)"/g)].map(m=>Number(m[1]));
(async()=>{
 for(const lang of ['uk','en']){
  const r=await newRun(null,false,e=>e.store.set('last-signal-language',lang)),m=n=>ns(r,n),s=m('storage').s,el=id=>r.elements.get(id),layout=m('layout');
  const before=JSON.stringify(s);r.context.Math.random=()=>{throw Error('presentation must not use gameplay RNG');};
  for(const [screen,keys]of Object.entries(layout.panes)){
   m('ui').showTab(screen);
   for(const key of keys){assert(layout.setPane(screen,key));m('ui').render();for(const other of keys)assert.equal(el(screen+'Pane-'+other).hidden,other!==key);}
   assert(!layout.setPane(screen,'__proto__'));assert.equal(layout.currentPane(screen),keys.at(-1));
  }
  assert.equal(JSON.stringify(s),before,'all panes leave progress untouched');
  m('ui').showTab('collection');layout.setPane('collection','catalogue');
  let all=[];
  do{const visible=ids(el('items').innerHTML);assert(visible.length<=4);all.push(...visible);if(el('catalogueNext').disabled)break;el('catalogueNext').onclick();}while(all.length<500);
  assert.equal(new Set(all).size,all.length,'no repeated catalogue cards across pages');assert.deepEqual(all,Array.from(m('collection').categoryItems(),item=>item.id),'every filtered entry is reachable');
  el('denomFilter').onchange({target:{value:'10 копійок'}});assert.equal(layout.pageState.catalogue.index,0);assert(ids(el('items').innerHTML).every(id=>JSON.parse(r.catalog())[id].denom==='10 копійок'));
  el('denomFilter').onchange({target:{value:'all'}});
  for(const [width,height,inventory,collection]of [[320,568,1,2],[390,844,2,6],[844,390,1,2],[1280,720,4,12],[1920,1080,4,12]]){
   r.context.innerWidth=width;r.context.innerHeight=height;layout.refreshLayout();
   assert.equal(layout.pageCapacity('inventory'),inventory);assert.equal(layout.pageCapacity('collection'),collection);assert(ids(el('items').innerHTML).length<=collection);
  }
  el('textSize').onchange({target:{value:'largest'}});assert.equal(layout.pageCapacity('inventory'),1);assert.equal(layout.pageCapacity('collection'),2);assert(ids(el('items').innerHTML).length<=2);
  el('textSize').onchange({target:{value:'normal'}});
  assert.equal(JSON.stringify(s),before);assert.equal(r.frames.size,0,'panes, pagination and resize introduce no animation loop');
 }
 console.log('PASS UK/EN pane isolation, no state/RNG changes, complete nonduplicated catalogue paging, filter reset, five viewport capacities, large text and no added frames');

 const r=await newRun(),m=n=>ns(r,n),s=m('storage').s,el=id=>r.elements.get(id),doc=r.context.document;
 const sheetButton=id=>doc.querySelectorAll('[data-sheet]').find(b=>b.dataset.sheet===id);
 // A route is selectable inside its own sheet, while unrelated dialogs still block it.
 sheetButton('routeDialog').onclick();assert(el('routeDialog').open);
 const choose=()=>el('routeCards').listeners.click[0]({target:{closest:()=>({dataset:{route:'wander'}})}});
 choose();assert(!el('routeDialog').open);assert.equal(s.route,'wander');
 el('helpDialog').showModal();sheetButton('routeDialog').onclick();assert(!el('routeDialog').open);el('helpDialog').close();
 // Controls moved off the field remain usable and preserve gameplay guards.
 m('camp').depart();el('modal').close();s.level=10;m('ui').render();sheetButton('fieldToolsDialog').onclick();assert(el('fieldToolsDialog').open);assert(m('ui').busy());
 const energy=s.energy;m('search').dig();assert(!s.pending);assert.equal(s.energy,energy,'control sheet blocks accidental digs');
 assert(m('detector-controls').setDetectorMode('pinpoint'));assert(m('detector-controls').toggleIronQuiet());assert.equal(s.detectorSettings.mode,'pinpoint');
 el('helpDialog').showModal();assert(!m('detector-controls').setDetectorMode('deep'));el('helpDialog').close();
 const orderLink=doc.querySelectorAll('[data-open]').find(b=>b.dataset.openPane==='orders');orderLink.closest=()=>el('fieldToolsDialog');orderLink.onclick();assert(!el('fieldToolsDialog').open);assert(!el('journal').hidden);assert.equal(m('layout').currentPane('journal'),'orders');
 m('ui').showTab('search');el('tripMenu').showModal();el('fieldObjectiveOpen').onclick();assert(!el('tripMenu').open);assert(!el('journal').hidden);assert.equal(m('layout').currentPane('journal'),'career');
 m('ui').showTab('inventory');m('layout').setPane('inventory','food');m('ui').render();assert.equal(m('layout').currentPane('inventory'),'food','field food remains usable');m('layout').setPane('inventory','stash');m('ui').render();assert.equal(m('layout').currentPane('inventory'),'bag','home storage redirects in the field');
 console.log('PASS route selection in sheet, modal guards, detector mode/iron controls, paused digs, sheet-to-order/goal navigation and field food');

 const html=fs.readFileSync(root+'/index.html','utf8'),css=fs.readFileSync(root+'/css/game-shell.css','utf8');
 assert.match(css,/height:100dvh/);assert.match(css,/grid-template-rows:42px 34px minmax\(0,1fr\) 60px/);assert.match(css,/main>section\{[^}]*overflow:auto/);assert.match(css,/@media\(max-height:540px\) and \(max-width:599px\)/);
 assert(!/font-size:\.(?:6|65)rem/.test(css),'do not solve layout by shrinking labels below 12px');
 assert.match(html,/data-sheet="fieldToolsDialog"/);assert.match(html,/id="coachDialog"/);
 const luminance=hex=>{const rgb=hex.match(/[a-f\d]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
 for(const [name,fg,bg]of [['primary','201d17','eeb76e'],['camp','506372','eee2cb'],['detector','415765','d8e1e5'],['secondary','edf4f8','294155'],['quiet','bbd3e7','172a3b'],['owned card','4c6170','eadfc9']]){
  const l=[luminance(fg),luminance(bg)].sort((a,b)=>b-a);assert((l[0]+.05)/(l[1]+.05)>=4.5,name+' text contrast');
 }
 console.log('PASS viewport-shell CSS contracts, short/large-text scroll fallbacks and six primary palette contrast pairs; not a browser geometry test');
})().catch(error=>{console.error(error);process.exit(1)});
