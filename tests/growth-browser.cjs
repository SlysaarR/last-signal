const {withBrowser}=require('./browser-env.cjs'),assert=require('assert/strict'),fs=require('fs'),path=require('path');
withBrowser(async(page,{version,screenshot})=>{
 const coin=await page.evaluate(async v=>{const {types}=await import('./data/items.js?v='+v);return types.findIndex(t=>t.year===2011&&t.value===1&&t.unit?.includes('коп'));},version);assert(coin>=0);
 for(const host of ['exc','pack','detail']){
  await page.evaluate(async({v,coin,host})=>{
   for(const d of document.querySelectorAll('dialog[open]'))d.close();
   const {s}=await import('./js/storage.js?v='+v);s.atCamp=false;s.pending={type:coin,condition:85,spent:10,cleanedCells:Array.from({length:256},(_,i)=>i)};
   if(host==='exc')(await import('./js/excavation.js?v='+v)).openExcavation();
   if(host==='pack')(await import('./js/packing.js?v='+v)).openPacking();
   if(host==='detail')(await import('./js/collection.js?v='+v)).showItem(coin);
  },{v:version,coin,host});
  const canvas=host==='exc'?'artifact':host==='pack'?'packArt':'detailArt',button=host==='exc'?'excFlip':host==='pack'?'packFlip':'detailFlip';
  for(const [width,height]of [[320,568],[390,740],[412,915],[844,390]]){
   await page.setViewportSize({width,height});await page.locator('#'+canvas).press('ArrowRight');await page.locator('#'+button).waitFor({state:'visible'});
   const a=await page.locator('#'+canvas).boundingBox(),b=await page.locator('#'+button).boundingBox();
   assert(Math.abs(b.width-44)<1&&Math.abs(b.height-44)<1,host+' reset stretched');
   assert(b.x>=a.x&&b.x+b.width<=a.x+a.width+1&&b.y>=a.y&&b.y+b.height<=a.y+a.height+1,host+' reset outside art');
   await page.locator('#'+button).click();await page.locator('#'+button).waitFor({state:'hidden'});
  }
  if(host==='exc'){await page.setViewportSize({width:390,height:740});await page.locator('#artifact').press('ArrowRight');await page.locator('#excFlip').waitFor({state:'visible'});await screenshot('exc-reset-fixed');}
 }
 console.log('PASS completed excavation, packing and collection reset: 44×44, contained, clickable, four viewport sizes');
 const sheet=await page.evaluate(async v=>{
  for(const d of document.querySelectorAll('dialog[open]'))d.close();const {s}=await import('./js/storage.js?v='+v);s.pending=null;s.atCamp=true;
  const {drawDetectorPreview}=await import('./js/graphics/detector-art.js?v='+v),canvas=document.createElement('canvas');canvas.width=1500;canvas.height=360;const ctx=canvas.getContext('2d');ctx.fillStyle='#102016';ctx.fillRect(0,0,1500,360);const unique=[];
  for(let level=1;level<=10;level++){const art=document.createElement('canvas');art.width=600;art.height=250;drawDetectorPreview(art,level);unique.push(art.toDataURL());const x=(level-1)%5*300,y=Math.floor((level-1)/5)*180;ctx.drawImage(art,x,y,300,125);ctx.fillStyle='#d8e8bf';ctx.font='18px sans-serif';ctx.fillText('Сигнал '+String(level).padStart(2,'0'),x+20,y+153);}
  return {png:canvas.toDataURL(),count:new Set(unique).size};
 },version);assert.equal(sheet.count,10);
 if(process.env.INSPECTION_SCREENSHOTS)fs.writeFileSync(path.join(process.env.INSPECTION_SCREENSHOTS,'detector-evolution.png'),Buffer.from(sheet.png.split(',')[1],'base64'));
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(async v=>{const {s}=await import('./js/storage.js?v='+v);s.level=10;s.gearCredit.detector=0;(await import('./js/ui.js?v='+v)).showTab('gear');},version);
 await screenshot('workshop-035');
 assert((await page.locator('#detectorNextFeature').textContent()).includes('Усі функції'));
 await page.locator('.gear-roadmap summary').click();assert.equal(await page.locator('#detectorMilestones .unlocked').count(),9);
 await page.evaluate(async v=>{const {s}=await import('./js/storage.js?v='+v);s.level=2;s.atCamp=false;s.x=.5;s.y=.52;s.objects=[{x:.5,y:.52,type:6,depth:2,condition:65,dug:false}];(await import('./js/ui.js?v='+v)).showTab('search');},version);
 assert(await page.locator('#detectorModes').isHidden());
 await page.evaluate(async v=>{const {s}=await import('./js/storage.js?v='+v);s.level=3;(await import('./js/ui.js?v='+v)).render();},version);
 await page.locator('#detectorModes summary').click();assert(await page.locator('#modeDeep').isHidden());assert(await page.locator('#ironQuiet').isHidden());
 await page.locator('#modePinpoint').click();assert.equal(await page.locator('#modePinpoint').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('#signalHeading').textContent(),'ЦЕНТРУВАННЯ');
 const rect=await page.locator('#field').boundingBox(),cdp=await page.context().newCDPSession(page),start=await page.evaluate(async v=>(await import('./js/storage.js?v='+v)).s.x,version);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:rect.x+60,y:rect.y+rect.height*.5}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:rect.x+140,y:rect.y+rect.height*.5}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const after=await page.evaluate(async v=>(await import('./js/storage.js?v='+v)).s.x,version);assert(Math.abs(after-start-80/rect.width*.45)<.002);
 await page.evaluate(async v=>{const {s}=await import('./js/storage.js?v='+v);s.level=10;s.x=.5;s.y=.52;(await import('./js/ui.js?v='+v)).render();},version);
 await page.locator('#modeDeep').click();await page.locator('#ironQuiet').click();
 assert.equal(await page.locator('#signalHeading').textContent(),'ГЛИБОКИЙ ПОШУК');
 assert((await page.locator('#detectorModeNote').textContent()).includes('Залізні монети'));
 assert((await page.locator('#hint').textContent()).includes('см'));
 await page.locator('#field').press('ArrowRight');assert((await page.locator('#signalTrace').getAttribute('aria-label')).includes('Історія сили'));
 await page.locator('#detectorModes summary').click();await screenshot('search-expert-035');
 await page.reload();await page.locator('#detectorModes summary').click();assert.equal(await page.locator('#modeDeep').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#ironQuiet').getAttribute('aria-pressed'),'true');
 for(const expanded of [true,false])for(const [width,height]of [[320,568],[390,740],[412,915],[844,390]]){
  const open=await page.locator('#detectorModes').getAttribute('open')!==null;if(open!==expanded)await page.locator('#detectorModes summary').click();
  await page.setViewportSize({width,height});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const field=await page.locator('#field').boundingBox();assert(field.height>=170);
  await page.locator('#dig').scrollIntoViewIfNeeded();await page.mouse.wheel(0,800);await page.waitForFunction(()=>Math.abs(scrollY-(document.documentElement.scrollHeight-innerHeight))<2);
  const dig=await page.locator('#dig').boundingBox(),nav=await page.locator('nav').boundingBox();assert(dig.y+dig.height<=nav.y+1,'dig covered at '+width);
 }
 console.log('PASS ten distinct appearances, full unlock roadmap, gated controls, native fine touch, expert functions, persistence and short-screen usability');
}).catch(e=>{console.error(e);process.exitCode=1});
