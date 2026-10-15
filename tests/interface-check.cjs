const {newRun,root,golden,assert}=require('./harness.cjs');
const mod=(run,name)=>run.modules.get(root+'/js/'+name+'.js').namespace;
(async()=>{
  const run=await newRun(),el=id=>run.elements.get(id),doc=run.context.document;
  const ui=mod(run,'ui'),presentation=mod(run,'interface');
  const saved=run.store.get('last-signal-v1'),state=JSON.stringify(run.state());
  assert.equal(doc.activeElement,null,'startup does not steal focus');
  for(const value of ['large','largest','normal']){
    el('textSize').onchange({target:{value}});
    assert.equal(doc.documentElement.dataset.textSize,value);
    assert.equal(run.store.get(presentation.TEXT_SIZE_KEY),value);
    assert.equal(el('textSize').value,value);
  }
  assert.equal(run.store.get('last-signal-v1'),saved,'presentation writes cannot rewrite the game save');
  assert.equal(JSON.stringify(run.state()),state,'text setting cannot touch loot, energy, progress or RNG');
  for(const [stored,expected] of [['large','large'],['largest','largest'],['2000%','normal'],['__proto__','normal']]){
    const reload=await newRun(saved,false,e=>e.store.set(presentation.TEXT_SIZE_KEY,stored));
    assert.equal(reload.context.document.documentElement.dataset.textSize,expected);
    assert.equal(reload.elements.get('textSize').value,expected);
  }
  const blocked=await newRun(null,true);
  blocked.elements.get('textSize').onchange({target:{value:'largest'}});
  assert.equal(blocked.context.document.documentElement.dataset.textSize,'largest');
  assert.match(blocked.elements.get('textSizeNote').textContent,/не дозволяє/);
  assert.equal(blocked.elements.get('saveNote').hidden,false,'presentation errors cannot hide save warnings');
  console.log('PASS local text preference, reload, invalid input, blocked storage; game save unchanged');

  const screens={camp:'campTitle',inventory:'inventoryTitle',gear:'gearTitle',collection:'collectionTitle',journal:'journalTitle',atlas:'atlasTitle'};
  const nav=doc.querySelectorAll('[data-tab]');
  for(const [screen,target] of Object.entries(screens)){
    ui.showTab(screen);
    assert.equal(doc.activeElement,el(target));
    assert.equal(el(target).scrollOptions.block,'nearest');
    assert.equal(el('skipToScreen').href,'#'+target);
    for(const other of [...Object.keys(screens),'search'])assert.equal(el(other).hidden,other!==screen);
    const parent=['journal','atlas'].includes(screen)?'camp':screen;
    for(const button of nav)assert.equal(button['aria-current'],button.dataset.tab===parent?(parent===screen?'page':'location'):'false');
  }
  ui.showTab('search');assert.equal(doc.activeElement,el('campTitle'),'search at camp redirects consistently');
  mod(run,'storage').s.atCamp=false;ui.showTab('search');assert.equal(doc.activeElement,el('field'),'keyboard can resume coil control immediately');
  const selected=doc.activeElement;ui.showTab('__proto__');assert.equal(doc.activeElement,selected);assert.equal(el('search').hidden,false);
  el('helpDialog').showModal();el('openHelp').focus();presentation.focusScreen('camp');assert.equal(doc.activeElement,el('openHelp'),'modal focus is not stolen');el('helpDialog').close();
  ui.showTab('collection');el('sound').focus();let prevented=false;
  el('skipToScreen').onclick({preventDefault(){prevented=true}});
  assert(prevented);assert.equal(doc.activeElement,el('collectionTitle'));assert.equal(el('collectionTitle').scrollOptions.block,'start');
  console.log('PASS screen focus, current navigation, camp redirect, modal guard and skip link');

  let resize,observed,height=76,writes=0;
  const measured=await newRun(null,false,e=>{
    const rootStyle=e.context.document.documentElement.style;
    rootStyle.setProperty=function(k,v){this[k]=v;writes++};
    e.elements.get('gameNav').getBoundingClientRect=()=>({height});
    e.context.ResizeObserver=class{constructor(fn){this.fn=fn}observe(target){if(target===e.elements.get('gameNav')){resize=this.fn;observed=target}}};
  });
  assert.equal(observed,measured.elements.get('gameNav'));assert.equal(writes,1);
  resize();assert.equal(writes,1,'same nav size does not write CSS again');
  height=121.2;resize();assert.equal(measured.context.document.documentElement.style['--nav-height'],'122px');assert.equal(writes,2);
  assert.equal(measured.frames.size,0,'navigation observer does not start a frame loop');
  const pending=golden.fixtures.find(f=>f.name==='hidden find').saved;
  const resumed=await newRun(pending);
  assert(resumed.elements.get('excavate').open);assert.equal(resumed.context.document.activeElement,null,'startup leaves resumed modal autofocus to the browser');
  console.log('PASS navigation height reacts to wrapping without repeated writes; pending dig still resumes');
})().catch(e=>{console.error(e);process.exit(1)});
