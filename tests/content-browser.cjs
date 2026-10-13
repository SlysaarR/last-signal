const {withBrowser}=require('./browser-env.cjs'),assert=require('assert/strict'),fs=require('fs'),path=require('path');
withBrowser(async(page,{version,screenshot})=>{
 const scene=await page.evaluate(async version=>{
  const {types}=await import('./data/items.js?v='+version),{createInspectionModel,drawInspection}=await import('./js/graphics/inspection.js?v='+version);
  const samples=[12,0,7,9,1,8,10,13,14,4,26,29,23,24,25,6];
  const sheet=document.createElement('canvas');sheet.width=1600;sheet.height=1640;const c=sheet.getContext('2d');c.fillStyle='#101e15';c.fillRect(0,0,1600,1640);
  for(let i=0;i<samples.length;i++){
   const id=samples[i],art=document.createElement('canvas');art.width=600;art.height=500;
   drawInspection(art.getContext('2d'),createInspectionModel(types[id],id===12?27:65),.18,.22,true);
   const x=(i%4)*400,y=Math.floor(i/4)*410;c.drawImage(art,x,y,400,334);c.fillStyle='#dce8c5';c.font='18px sans-serif';c.fillText(types[id].name,x+18,y+370);
  }
  return sheet.toDataURL();
 },version);
 if(process.env.INSPECTION_SCREENSHOTS)fs.writeFileSync(path.join(process.env.INSPECTION_SCREENSHOTS,'content-models.png'),Buffer.from(scene.split(',')[1],'base64'));
 await page.evaluate(async version=>{
  const {s}=await import('./js/storage.js?v='+version),{openPacking}=await import('./js/packing.js?v='+version);
  s.atCamp=false;s.pending={type:12,condition:27,spent:4.9,revealed:true};openPacking();
 },version);
 assert(await page.locator('#packFlip').isHidden());await screenshot('washer-card');
 await page.locator('#packArt').press('ArrowRight');await page.locator('#packFlip').waitFor({state:'visible'});
 const bounds=await page.evaluate(()=>{const c=document.querySelector('#packArt').getBoundingClientRect(),b=document.querySelector('#packFlip').getBoundingClientRect();return b.top>=c.top&&b.bottom<=c.bottom&&b.right<=c.right;});assert(bounds);
 await page.locator('#packFlip').click();await page.locator('#packFlip').waitFor({state:'hidden'});
 await page.evaluate(async version=>{
  document.querySelector('#packDialog').close();const {s}=await import('./js/storage.js?v='+version),{emptyProgress}=await import('./data/expeditions.js?v='+version),{types}=await import('./data/items.js?v='+version);
  s.pending=null;s.atCamp=true;s.progress=emptyProgress();s.progress.finds=29;s.collection=[types.findIndex(t=>t.country)];s.best={[s.collection[0]]:100};
  (await import('./js/ui.js?v='+version)).showTab('journal');
 },version);
 assert.equal(await page.locator('#goalCards .goal-card').first().getAttribute('data-goal'),'perfect');
 const money=Number(await page.locator('#coins').textContent());await screenshot('journal-ready');
 await page.locator('[data-claim="perfect"]').click();assert.equal(Number(await page.locator('#coins').textContent()),money+140);
 assert.equal(await page.locator('#goalCards [data-goal="perfect"]').count(),0);assert.equal(await page.locator('#completedGoalCards [data-goal="perfect"]').count(),1);
 assert.equal(await page.locator('#goalCards button').count(),0);console.log('PASS mobile claim reorders goals and removes completed action');
 await page.reload();await page.getByRole('button',{name:'Відкрити щоденник →',exact:true}).click();assert.equal(await page.locator('#completedGoalCards [data-goal="perfect"]').count(),1);
 await page.evaluate(async version=>{const {s}=await import('./js/storage.js?v='+version);s.bag=[{type:12,condition:27},{type:5,condition:65}];s.food=[0,0,0];s.pantry=[0,0,0];(await import('./js/ui.js?v='+version)).showTab('inventory');},version);
 await page.waitForFunction(()=>!!document.querySelector('#bagItems canvas[data-artifact="12"]')?.dataset.rendered);
 assert.equal(await page.locator('#bagItems [data-itemaction="album"][data-index="0"]').count(),0);assert.equal(await page.locator('#bagFood button').count(),0);await screenshot('inventory-polish');
 for(const width of [320,390,768]){
  await page.setViewportSize({width,height:844});
  for(const tab of ['camp','inventory','gear','collection','journal']){
   await page.evaluate(async({version,tab})=>(await import('./js/ui.js?v='+version)).showTab(tab),{version,tab});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tab+' horizontal overflow at '+width);
  }
  await page.evaluate(async version=>{const {s}=await import('./js/storage.js?v='+version);s.atCamp=false;(await import('./js/ui.js?v='+version)).showTab('search');},version);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'search overflow at '+width);
  await page.evaluate(async version=>{(await import('./js/storage.js?v='+version)).s.atCamp=true;},version);
 }
 console.log('PASS six screens at three widths, real model thumbnails, no empty food actions');
 await page.evaluate(async version=>{const {s}=await import('./js/storage.js?v='+version);s.atCamp=false;(await import('./js/ui.js?v='+version)).showTab('camp');},version);
 await page.locator('#startTrip').click();assert.equal(await page.locator('#modalTitle').textContent(),'Завершити виїзд');await page.locator('#modalCancel').click();
 await page.locator('#startTrip').click();await page.locator('#modalClose').click();assert((await page.locator('#campStatus').textContent()).includes('Вдома'));
 console.log('PASS camp return confirmation and cancellation');
}).catch(e=>{console.error(e);process.exitCode=1});
