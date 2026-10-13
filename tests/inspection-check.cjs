const {newRun,root,assert}=require('./harness.cjs');
const ns=(run,name)=>run.modules.get(root+'/js/'+name+'.js').namespace;
const event=(x,y,id=1)=>({clientX:x,clientY:y,pointerId:id,button:0,preventDefault(){}});
(async()=>{
  const run=await newRun(), catalog=JSON.parse(run.catalog());
  const id=catalog.findIndex(t=>t.country&&t.value===1&&t.year===2003&&t.unit.startsWith('гр'));
  ns(run,'collection').showItem(id);
  const canvas=run.elements.get('detailArt'),saved=JSON.stringify(run.state());
  canvas.onpointerdown(event(100,100));
  canvas.onpointermove(event(180,140,2));run.flushFrames();
  assert.equal(Number(canvas.dataset.yaw),0,'a second finger must not rotate');
  for(let x=101;x<=136;x++)canvas.onpointermove(event(x,118));
  assert.equal(run.frames.size,1,'many input events coalesce into one frame');run.flushFrames();
  assert(Math.abs(Number(canvas.dataset.yaw)-Math.PI*.2)<1e-8);
  assert(Math.abs(Number(canvas.dataset.pitch)-Math.PI*.1)<1e-8);
  canvas.onlostpointercapture(event(136,118));
  const angle=canvas.dataset.yaw;canvas.onpointermove(event(210,200));run.flushFrames();assert.equal(canvas.dataset.yaw,angle);
  const slider=run.elements.get('conditionPreview');slider.value=64;slider.oninput();run.flushFrames();
  assert(canvas['aria-label'].includes('64 зі 100'));assert.equal(canvas.dataset.yaw,angle,'wear preview keeps the chosen angle');
  slider.value=65;slider.oninput();run.flushFrames();assert(canvas['aria-label'].includes('65 зі 100'));
  assert.equal(JSON.stringify(run.state()),saved,'preview never changes condition, price or collection');
  run.elements.get('conditionPreviewReset').onclick();run.flushFrames();assert.equal(slider.value,75);
  canvas.onpointerdown(event(100,100));canvas.onpointermove(event(120,110));
  ns(run,'collection').showItem(4);assert.equal(run.frames.size,0,'opening another item cancels the old queued frame');
  assert.equal(Number(canvas.dataset.yaw),0);
  const get=id=>run.elements.get('detailArt'+id);
  canvas.onpointerdown(event(100,100));canvas.onpointerdown(event(200,100,2));
  canvas.onpointermove(event(240,100,2));run.flushFrames();
  assert.equal(Number(canvas.dataset.yaw),0,'pinch cannot rotate');
  assert(Math.abs(Number(canvas.dataset.zoom)-1.4)<1e-8,'pinch follows distance');
  assert(Number(canvas.dataset.pan.split(',')[0])>0,'two fingers can move enlarged detail');
  canvas.onpointerdown(event(20,20,3));canvas.onpointermove(event(500,500,3));run.flushFrames();
  assert(Math.abs(Number(canvas.dataset.zoom)-1.4)<1e-8,'third finger ignored');
  canvas.onpointerup(event(240,100,2));canvas.onpointermove(event(118,100));run.flushFrames();
  assert(Math.abs(Number(canvas.dataset.yaw)-Math.PI*.1)<1e-8,'pinch-to-drag transition has no jump');
  canvas.onpointercancel(event(118,100));const stopped=canvas.dataset.yaw;
  canvas.onpointermove(event(250,250));run.flushFrames();assert.equal(canvas.dataset.yaw,stopped);
  for(let i=0;i<20;i++)get('ZoomIn').onclick();run.flushFrames();
  assert.equal(Number(canvas.dataset.zoom),2.5);assert(get('ZoomIn').disabled);
  get('Turn').onclick();run.flushFrames();assert.equal(Number(canvas.dataset.yaw),Math.PI);
  get('Light').onclick();run.flushFrames();assert.equal(Number(canvas.dataset.light),1);
  canvas.onkeydown({key:'Home',preventDefault(){}});run.flushFrames();
  assert.equal(Number(canvas.dataset.zoom),1);assert.equal(canvas.dataset.pan,'0,0');assert.equal(Number(canvas.dataset.light),0);assert(get('ZoomOut').disabled);
  for(let i=0;i<4;i++)canvas.onkeydown({key:'-',preventDefault(){}});run.flushFrames();assert.equal(Number(canvas.dataset.zoom),1);
  assert.equal(JSON.stringify(run.state()),saved,'zoom, lamp, flip and drag cannot mutate gameplay');
  const graphics=ns(run,'graphics/inspection'),profile=ns(run,'graphics/condition');
  for(let n=0;n<100;n++){
    const a=profile.conditionProfile(n),b=profile.conditionProfile(n+1);
    assert(a.wear>b.wear&&a.corrosion>b.corrosion&&a.relief<b.relief);
  }
  const model=graphics.createInspectionModel(catalog[id],65);
  const rimPoints=side=>model.triangles.filter(t=>t.mat===side).flatMap(t=>t.points).filter(p=>Math.hypot(p[0],p[1])>.5).map(p=>p.slice(0,2).map(v=>v.toFixed(8)).join(',')).sort();
  assert.deepEqual(rimPoints(1),rimPoints(2),'front and back share each nick in the outline');
  const front=graphics.projectModel(model,0,0),back=graphics.projectModel(model,Math.PI,0),edge=graphics.projectModel(model,Math.PI/2,0);
  assert(front.some(t=>t.mat===1)&&!front.some(t=>t.mat===2));
  assert(back.some(t=>t.mat===2)&&!back.some(t=>t.mat===1));
  assert(edge.some(t=>t.mat===3),'the physical rim is visible edge-on');
  for(const shape of new Set(catalog.map(t=>t.shape))) {
    const m=graphics.createInspectionModel(catalog.find(t=>t.shape===shape),0);
    for(const yaw of [0,.71,Math.PI/2,Math.PI]){
      const projected=graphics.projectModel(m,yaw,.35);
      assert(projected.length>0,shape+' has visible geometry from every side');
      assert(projected.every(t=>t.projected.flat().every(Number.isFinite)));
    }
  }
  canvas.onpointerdown(event(100,100));canvas.onpointermove(event(150,100));
  run.elements.get('coinDetail').listeners.close.forEach(fn=>fn());
  assert.equal(run.frames.size,0,'closing cancels queued render');assert.equal(canvas.onpointermove,null);assert(get('Tools').hidden);
  console.log('PASS continuous drag, pinch and pan, gesture transitions, capture loss, zoom bounds, flip/light/reset, keyboard, redraw coalescing, close cleanup, save isolation, 101 wear profiles and shared front/back/rim geometry');
})().catch(e=>{console.error(e);process.exit(1)});
