// Headless module/startup and save-compatibility regression checks. No browser dependencies.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),original=fs.readFileSync(path.join(root,'index.html'),'utf8');
const golden=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures.json'),'utf8'));
const {createHash}=require('node:crypto');
const drawContext=new Proxy({createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),getImageData:()=>({data:new Uint8ClampedArray(4)})},{get(t,k){return k in t?t[k]:(()=>{})}});
function env(saved,failStorage=false){
 const listeners={},elements=new Map(),data=[];let seed=12345;const random=()=>{seed=seed*16807%2147483647;return seed/2147483647};
 class El{constructor(tag='div'){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.open=false;this.hidden=false;this.width=600;this.height=500;this.value='';this.textContent='';this.innerHTML='';this.disabled=false;this.classList={add(){},remove(){},toggle(){}};this.listeners={}}append(...xs){this.children.push(...xs)}appendChild(x){this.children.push(x);return x}replaceChildren(...xs){this.children=xs}addEventListener(k,f){(this.listeners[k]??=[]).push(f)}setAttribute(k,v){this[k]=v}getContext(){return drawContext}getBoundingClientRect(){return {width:360,height:300,left:0,top:0}}showModal(){this.open=true}close(){this.open=false}querySelector(){return new El()}setPointerCapture(){} }
 const staticHTML=original.split('<script>')[0];for(const id of [...staticHTML.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]))elements.set(id,new El());
 for(const m of staticHTML.matchAll(/<button[^>]*data-(tab|category|open)="([^"]+)"[^>]*>/g)){const e=new El('button');e.dataset[m[1]]=m[2];data.push(e)}
 for(const m of staticHTML.matchAll(/<button[^>]*data-close="([^"]+)"[^>]*>/g)){const e=new El('button');e.dataset.close=m[1];data.push(e)}
 const document={getElementById(id){assert(elements.has(id),'DOM id '+id);return elements.get(id)},createElement:tag=>new El(tag),querySelectorAll(sel){if(sel==='nav button')return data.filter(e=>e.dataset.tab);const key=sel.match(/data-(\w+)/)?.[1];return key?data.filter(e=>e.dataset[key]):[]}};
 const store=new Map(saved?[['last-signal-v1',saved]]:[]),localStorage={getItem(k){if(failStorage)throw Error('Storage disabled');return store.get(k)||null},setItem(k,v){if(failStorage)throw Error('Storage disabled');store.set(k,v)}};
 const context=vm.createContext({document,localStorage,console,Math:Object.assign(Object.create(Math),{random}),performance:{now:()=>1000},matchMedia:()=>({matches:true}),requestAnimationFrame:()=>1,cancelAnimationFrame(){},ResizeObserver:class{observe(){}},setTimeout,clearTimeout});
 context.window=context;context.addEventListener=(name,fn)=>{(listeners[name]??=[]).push(fn)};context.scrollTo=()=>{};
 return {context,elements,store,listeners};
}
async function newRun(saved,fail){const e=env(saved,fail),modules=new Map();function get(file){file=path.resolve(file);if(!modules.has(file))modules.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context:e.context,identifier:file}));return modules.get(file)}const main=get(root+'/js/main.js');await main.link((specifier,ref)=>get(path.resolve(path.dirname(ref.identifier),specifier.split('?')[0])));await main.evaluate();e.modules=modules;e.state=()=>JSON.parse(JSON.stringify(modules.get(root+'/js/storage.js').namespace.s));e.catalog=()=>JSON.stringify(modules.get(root+'/data/items.js').namespace.types);return e}
(async()=>{
 const advanced=JSON.parse(golden.fixtures.find(x=>x.name==='active trip').saved).state;
 for(const {name,saved,expected} of golden.fixtures){
  const next=await newRun(saved);
  assert.deepEqual(next.state(),expected,name+' save mismatch');
  const existingCatalog=JSON.parse(next.catalog()).slice(0,golden.catalogLength);
  assert.equal(createHash('sha256').update(JSON.stringify(existingCatalog)).digest('hex'),golden.catalogHash,name+' existing item IDs changed');
  assert.deepEqual(JSON.parse(next.store.get('last-signal-v1')),{version:1,state:expected},name+' saved envelope mismatch');
  assert.equal(next.elements.get('bars').children.length,20);
  for(const id of ['dig','foodQuick','sound','finish','startTrip','returnHome','excSkip','leaveFind'])assert.equal(typeof next.elements.get(id).onclick,'function',name+' '+id+' unbound');
  console.log('PASS',name);
 }
 const blocked=await newRun(null,true);assert.equal(blocked.elements.get('saveNote').hidden,false);console.log('PASS unavailable storage warning');
 const run=await newRun(JSON.stringify({version:1,state:advanced}));const mod=f=>run.modules.get(root+'/js/'+f+'.js').namespace;
 mod('search').dig();assert(run.state().pending);assert.equal(run.elements.get('excavate').open,true);
 mod('excavation').collectPending();assert(run.state().pending.revealed);mod('packing').resolvePacking('take');assert.equal(run.state().bag.length,2);assert.equal(run.state().pending,null);assert.equal(run.state().energy,76.2);
 const reloaded=await newRun(run.store.get('last-signal-v1'));assert.deepEqual(reloaded.state(),run.state());console.log('PASS dig → reveal → take → reload');
 const inv=await newRun(null); const ns=f=>inv.modules.get(root+'/js/'+f+'.js').namespace;
 const state=ns('storage').s;
 const coin=JSON.parse(inv.catalog()).findIndex(t=>t.country && t.kind==='coin');
 state.bag=[{type:coin,condition:70}]; ns('inventory').inventoryAction('album','bag',0);
 assert.equal(state.best[coin],70); assert.equal(state.bag.length,0);
 state.bag=[{type:coin,condition:90}]; ns('inventory').inventoryAction('album','bag',0);
 assert.equal(state.best[coin],90); assert.equal(state.stash[0].condition,70);
 ns('inventory').inventoryAction('move','stash',0); assert.equal(state.bag[0].condition,70);
 const before=state.coins; ns('inventory').inventoryAction('sell','bag',0); assert(state.coins>before); assert.equal(state.bag.length,0);
 inv.elements.get('denomFilter').onchange({target:{value:JSON.parse(inv.catalog())[coin].denom}});
 inv.elements.get('missingFilter').onchange({target:{checked:true}});
 assert(!ns('collection').categoryItems().some(t=>t.id===coin));
 assert(ns('collection').categoryItems().every(t=>t.denom===JSON.parse(inv.catalog())[coin].denom));
 console.log('PASS album upgrade → stash → bag → sell; denomination and missing filters');
 const shop=ns('shop'),rules=ns('rules');
 for(const kind of ['detector','shovel','backpack']){
   const key=kind==='detector'?'level':kind;
   for(let level=1;level<100;level++){
     state[key]=level;state.coins=100000;state.atCamp=true;
     const expected=kind==='detector'?rules.maxEnergy(level+1):kind==='shovel'?rules.shovelFactor(level+1):rules.bagCapacity(level+1);
     const cost=rules.upgradeCost(kind);shop.upgradeGear(kind);
     assert.equal(state[key],level+1);assert.equal(state.coins,100000-cost);
     assert.equal(kind==='detector'?rules.maxEnergy():kind==='shovel'?rules.shovelFactor():rules.bagCapacity(),expected);
   }
   const balance=state.coins;shop.upgradeGear(kind);assert.equal(state[key],100);assert.equal(state.coins,balance);
 }
 state.coins=0;state.level=1;shop.upgradeGear('detector');assert.equal(state.level,1);
 state.atCamp=false;state.coins=1000;shop.upgradeGear('detector');assert.equal(state.level,1);
 const count=state.pantry[0];shop.buyFood(0);assert.equal(state.pantry[0],count);
 state.atCamp=true;shop.buyFood(0);assert.equal(state.pantry[0],count+1);shop.transferFood(0,true);assert.equal(state.food[0],1);
 console.log('PASS all 297 upgrade steps, max level, purchase guards and food packing');
 const camp=ns('camp');state.energy=10;state.backpack=1;state.food=[0,0,0];state.bag=Array.from({length:8},()=>({type:0,condition:40}));state.coins=100;
 assert.equal(camp.departureWarnings().length,2);camp.confirmDeparture();assert.equal(inv.elements.get('modalClose').textContent,'Усе одно вирушити');
 inv.elements.get('modalCancel').onclick();assert.equal(state.atCamp,true);assert.equal(state.coins,100);
 inv.elements.get('restHome').onclick();assert.equal(state.energy,rules.maxEnergy());assert.equal(camp.departureWarnings().length,1);
 camp.confirmDeparture();inv.elements.get('modalClose').onclick();assert.equal(state.atCamp,false);assert.equal(state.coins,75);assert.equal(state.bag.length,8);
 inv.elements.get('modalClose').onclick();camp.returnHome();assert.equal(state.atCamp,true);assert.equal(state.lastTrip.travel,25);assert.equal(state.lastTrip.brought,8);
 state.coins=0;camp.confirmDeparture();inv.elements.get('modalClose').onclick();assert.equal(state.coins,0);assert.equal(state.location,0);
 console.log('PASS camp warnings → cancel → rest → paid departure → report → free departure');
})().catch(e=>{console.error(e);process.exit(1)});
