const {newRun,root,assert}=require('./harness.cjs'),fs=require('fs');
(async()=>{
 const r=await newRun(),ns=n=>r.modules.get(root+'/js/'+n+'.js').namespace,s=ns('storage').s;
 s.atCamp=true;s.collection=[30];s.best={30:35};s.bag=[{type:30,condition:72}];s.stash=[{type:3,condition:50}];
 const money=s.coins,inv=ns('inventory');
 assert(inv.itemRows(s.bag,'bag').includes('35 → 72%'));assert(inv.itemRows(s.bag,'bag').includes('Попередній екземпляр 35% → у сховище'));
 inv.inventoryAction('album','bag',0);
 assert.equal(s.best[30],72);assert.equal(s.bag.length,0);assert.equal(s.stash[0].condition,35);assert.equal(s.stash[0].type,30);assert.equal(s.stash[1].type,3);assert.equal(s.coins,money);
 assert(r.elements.get('inventoryNoticeText').textContent.includes('35%'));assert(!r.elements.get('showReturnedItem').hidden);
 s.stash.push({type:30,condition:95});inv.inventoryAction('album','stash',2);
 assert.equal(s.best[30],95);assert.equal(s.stash[0].condition,72);assert.equal(s.stash[1].condition,35);assert.equal(s.collection.length,1);
 const before=JSON.stringify(s);inv.inventoryAction('album','stash',0);assert.equal(JSON.stringify(s),before,'worse or equal cannot consume an item');
 inv.inventoryAction('sell','stash',0);assert.equal(s.coins,money+ns('rules').priceFor(30,72));assert.equal(s.stash[0].condition,35);
 const reload=await newRun(r.store.get('last-signal-v1'));assert.deepEqual(reload.state().stash,JSON.parse(JSON.stringify(s.stash)));assert.equal(reload.state().best[30],95);
 s.bag=[{type:31,condition:81}];inv.inventoryAction('album','bag',0);assert.equal(s.best[31],81);assert.equal(s.stash.length,2,'first album entry returns no phantom item');
 const art=r.modules.get(root+'/data/coin-art.js').namespace,catalog=JSON.parse(r.catalog());
 for(const t of catalog.filter(t=>t.country)){
  const d=art.coinDesign(t),key=art.coinDesignKey(t);assert(d&&art.coinSource(t),t.name);assert(d.diameter>0&&d.thickness>0);
  for(const side of [0,1])assert(fs.existsSync(root+'/assets/coins/'+key+'-'+side+'.webp'),key+' face '+side);
 }
 assert.equal(art.coinEdgeSpec(catalog[40]).teeth,8);assert(art.coinEdgeSpec(catalog[35]).count>art.coinEdgeSpec(catalog[36]).count);assert(art.coinEdgeSpec(catalog[41]).text.includes('2003'));assert.equal(art.coinEdgeSpec(catalog[44]).kind,'sector');
 const sources=JSON.parse(fs.readFileSync(root+'/assets/coins/sources.json'));for(const file of fs.readdirSync(root+'/assets/coins').filter(x=>x.endsWith('.webp')))assert(sources.some(s=>s.file===file),'credit for '+file);
 console.log('PASS album replacements from bag and stash preserve every old condition, reject worse copies, sell/reload, no phantom copies, 178 coin mappings, physical dimensions, variant edges and asset provenance');
})().catch(e=>{console.error(e);process.exitCode=1});
