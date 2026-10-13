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
  const graphics=ns(run,'graphics/inspection'),profile=ns(run,'graphics/condition');
  for(let n=0;n<100;n++){
    const a=profile.conditionProfile(n),b=profile.conditionProfile(n+1);
    assert(a.wear>b.wear&&a.corrosion>b.corrosion&&a.relief<b.relief);
  }
  const model=graphics.createInspectionModel(catalog[id],65);
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
  console.log('PASS continuous drag, multiple pointers, capture loss, redraw coalescing, view cleanup, preview isolation, 101 wear profiles and front/back/rim geometry');
})().catch(e=>{console.error(e);process.exit(1)});
