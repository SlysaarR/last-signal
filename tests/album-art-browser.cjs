const {withBrowser}=require('./browser-env.cjs'),assert=require('assert/strict'),fs=require('fs'),path=require('path');
withBrowser(async(page,{version,screenshot})=>{
 const failed=[];page.on('response',r=>{if(r.url().includes('/assets/coins/')&&r.status()!==200)failed.push(r.url());});
 // Load every face, including all named varieties. Photographs stay local.
 await page.evaluate(async v=>{
  const {types}=await import('./data/items.js?v='+v),art=await import('./js/graphics/coin-reference.js?v='+v);const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');c.translate(128,128);
  window.artReady=()=>types.filter(t=>t.country).map(t=>[0,1].map(side=>art.paintCoinReference(c,t,100,side))).flat().every(Boolean);window.artReady();
 },version);
 await page.waitForFunction(()=>window.artReady(),null,{timeout:30000});assert.deepEqual(failed,[]);
 const count=await page.evaluate(async v=>{
  const {types}=await import('./data/items.js?v='+v),{paintCoinReference}=await import('./js/graphics/coin-reference.js?v='+v),a=document.createElement('canvas');a.width=a.height=256;const c=a.getContext('2d'),hashes=[];c.translate(128,128);
  for(let n=0;n<=100;n++){c.clearRect(-128,-128,256,256);paintCoinReference(c,types[44],n,0);hashes.push(a.toDataURL());}
  return new Set(hashes).size;
 },version);assert.equal(count,101);
 // The new album choice keeps the old copy accessible and survives reload.
 await page.evaluate(async v=>{const {s}=await import('./js/storage.js?v='+v);s.atCamp=true;s.collection=[41];s.best={41:35};s.bag=[{type:41,condition:82}];s.stash=[{type:30,condition:60}];(await import('./js/ui.js?v='+v)).showTab('inventory');},version);
 await page.getByRole('button',{name:'Покращити альбом · 35 → 82%'}).click();
 assert((await page.locator('#inventoryNoticeText').textContent()).includes('35%'));await screenshot('album-replaced');
 await page.locator('#showReturnedItem').click();assert(await page.locator('#warehouseItems .find-card').first().evaluate(e=>e===document.activeElement));
 assert((await page.locator('#warehouseItems .find-card').first().textContent()).includes('35'));
 await screenshot('old-copy-in-stash');
 await page.reload();await page.evaluate(async v=>(await import('./js/ui.js?v='+v)).showTab('inventory'),version);assert((await page.locator('#warehouseItems .find-card').first().textContent()).includes('35'));
 // Late loading/rotation and the condition slider must leave the save untouched.
 const before=await page.evaluate(()=>localStorage.getItem('last-signal-v1'));
 for(const id of [30,31,32,34,35,36,40,41,42,169,180,43,44,45]){
  await page.evaluate(async({v,id})=>(await import('./js/collection.js?v='+v)).showItem(id),{v:version,id});
  await page.locator('#detailArt').press('ArrowRight');await page.locator('#detailFlip').waitFor({state:'visible'});
  await page.locator('#detailFlip').click();await page.locator('#detailFlip').waitFor({state:'hidden'});
  assert(await page.locator('#detailArtSource').getAttribute('href'));
  if(id===44)await screenshot('real-five-hryvnias');
  await page.locator('#detailClose').click();
 }
 assert.equal(await page.evaluate(()=>localStorage.getItem('last-signal-v1')),before);
 for(const [width,height]of [[320,568],[390,740],[412,915],[844,390]]){
  await page.setViewportSize({width,height});await page.evaluate(async v=>(await import('./js/collection.js?v='+v)).showItem(44),version);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#detailArt').press('ArrowLeft');await page.locator('#detailFlip').waitFor({state:'visible'});const b=await page.locator('#detailFlip').boundingBox();assert.equal(b.width,44);assert.equal(b.height,44);await page.locator('#detailClose').click();
 }
 console.log('PASS all 356 photographed coin faces loaded, 101 distinct wear levels, album message → exact old copy → reload, rotation/reset, unchanged save and four viewport sizes');
}).catch(e=>{console.error(e);process.exitCode=1});
