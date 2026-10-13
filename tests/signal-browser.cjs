const {withBrowser}=require('./browser-env.cjs'),assert=require('assert/strict');
withBrowser(async(page,{version,screenshot})=>{
 await page.evaluate(async version=>{const {s}=await import('./js/storage.js?v='+version);s.coins=5000;(await import('./js/ui.js?v='+version)).showTab('gear');},version);
 assert.equal(await page.locator('#backpackBadge').textContent(),'Ступінь 1 / 10');
 assert((await page.locator('#backpackInfo').textContent()).includes('12'));
 await page.locator('#upgradeBackpack').click();assert.equal(await page.locator('#backpackBadge').textContent(),'Ступінь 2 / 10');
 assert.equal(await page.locator('#coins').textContent(),'4910');
 const energy=await page.locator('#energy').textContent();await page.locator('#upgrade').click();assert.equal(await page.locator('#energy').textContent(),energy);
 await page.locator('#upgradeShovel').click();await screenshot('workshop-034');
 await page.evaluate(async version=>{const {s}=await import('./js/storage.js?v='+version);s.atCamp=false;s.level=4;s.shovel=1;s.objects=[{type:6,x:.5,y:.52,condition:65,depth:2,dug:false}];s.x=.2;s.y=.52;s.energy=100;(await import('./js/ui.js?v='+version)).showTab('search');},version);
 assert.equal(await page.locator('#strength').textContent(),'00');
 const rect=await page.locator('#field').boundingBox(),cdp=await page.context().newCDPSession(page);
 const y=rect.y+rect.height*.52;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+rect.width*.25,y}]});
 for(const position of [.32,.4,.45,.48,.5])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+rect.width*position,y}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.waitForFunction(()=>document.querySelector('#hint').textContent.includes('Можна копати'));
 const peak=Number(await page.locator('#strength').textContent());assert(peak>0&&peak<100);
 assert((await page.locator('#targetId').textContent()).includes('≈'));
 assert((await page.locator('#hint').textContent()).includes('глибоко'));
 await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-label'),'Вимкнути звук');
 await page.locator('#field').press('ArrowRight');await page.locator('#field').press('ArrowLeft');
 const audio=await page.evaluate(async version=>{const a=await import('./js/audio.js?v='+version);return {state:a.audio.state,sound:a.sound};},version);assert(audio.sound);assert.equal(audio.state,'running');
 await screenshot('search-034');
 console.log('PASS native touch sweep, uncertain conductivity, weak deep peak, depth hint and real WebAudio');
 await page.locator('#dig').click();assert(await page.locator('#excavate').isVisible());assert((await page.locator('#energy').textContent()).startsWith('85 /'));
 await page.reload();assert(await page.locator('#excavate').isVisible());assert((await page.locator('#energy').textContent()).startsWith('85 /'));
 await page.locator('#excSkip').click();assert((await page.locator('#packTitle').textContent()).includes('підвіска'));
 console.log('PASS updated search digs correct saved target and survives reload without duplicate cost');
 await page.evaluate(async version=>{document.querySelector('#packDialog').close();const {s}=await import('./js/storage.js?v='+version);s.pending=null;s.atCamp=true;},version);
 for(const [width,height]of [[320,568],[390,844],[412,915],[844,390]]){
  await page.setViewportSize({width,height});
  for(const tab of ['gear','inventory','search']){
   await page.evaluate(async({version,tab})=>{const {s}=await import('./js/storage.js?v='+version);s.atCamp=tab!=='search';(await import('./js/ui.js?v='+version)).showTab(tab);},{version,tab});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),tab+' overflow '+width);
   if(tab==='search'){
    const box=await page.locator('#field').boundingBox();assert(box.height>=170);
    await page.locator('#dig').scrollIntoViewIfNeeded();
    await page.mouse.wheel(0,200);await page.waitForFunction(()=>scrollY>=Math.min(200,document.documentElement.scrollHeight-innerHeight)-1);
    const dig=await page.locator('#dig').boundingBox(),nav=await page.locator('nav').boundingBox();assert(dig.y+dig.height<=nav.y+1,'nav covers dig at '+width+'x'+height);
   }
  }
 }
 console.log('PASS search, equipment and inventory at four mobile sizes; field and digging remain usable');
 // Genuine old save loaded through startup, then real UI buys with converted credit.
 const fixture=require('./fixtures.json').fixtures.find(f=>f.name==='active trip');
 await page.evaluate(async({state,version})=>{const st=await import('./js/storage.js?v='+version),fmt=await import('./js/backup-format.js?v='+version);st.installBackupState(state,fmt.createBackup(st.s));},{state:fixture.expected,version});await page.reload();
 const migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem('last-signal-v1')).state);
 assert.equal(migrated.gearVersion,2);assert.equal(migrated.energyCapacity,119);assert.equal(migrated.coins,JSON.parse(fixture.saved).state.coins);
 await page.evaluate(async version=>{const {s}=await import('./js/storage.js?v='+version);s.atCamp=true;s.coins=1000;(await import('./js/ui.js?v='+version)).showTab('gear');},version);
 assert((await page.locator('#upgrade').textContent()).includes('132'));await page.locator('#upgrade').click();assert.equal(await page.locator('#coins').textContent(),'868');
 await page.reload();const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('last-signal-v1')).state);
 assert.equal(persisted.level,5);assert.equal(persisted.gearCredit.detector,0);assert.equal(persisted.coins,868);assert.equal(persisted.energyCapacity,119);
 console.log('PASS legacy browser save, preserved energy and money, one-time upgrade credit, reload');
}).catch(e=>{console.error(e);process.exitCode=1});
