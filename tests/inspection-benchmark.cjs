// Optional native Canvas measurement, isolated per case. No browser/FPS claims.
// CANVAS_MODULE=/absolute/path/to/@napi-rs/canvas node tests/inspection-benchmark.cjs
// INSPECTION_ROOT can point at an archived release for an identical comparison.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const cases=['crotal-bell','thimble','rect-buckle','coin-25'];
if(!process.env.INSPECTION_CASE){
 const rows=[];
 for(const shape of cases){
  const result=spawnSync(process.execPath,[__filename],{env:{...process.env,INSPECTION_CASE:shape},encoding:'utf8',timeout:45000,maxBuffer:1024*1024});
  if(result.status!==0){console.error(result.stderr||result.error||'Case failed: '+shape);process.exit(1);}
  const row=JSON.parse(result.stdout);rows.push(row);console.log(JSON.stringify(row));
 }
 if(process.env.OUTPUT_DIR){fs.mkdirSync(process.env.OUTPUT_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.OUTPUT_DIR,'benchmark.json'),JSON.stringify(rows,null,2));}
}else (async()=>{
 const root=path.resolve(process.env.INSPECTION_ROOT||path.join(__dirname,'..'));
 const {createCanvas,Image}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
 const reads=new Map();let allocations=0;
 global.document={createElement:()=>{
  allocations++;const canvas=createCanvas(512,512),context=canvas.getContext('2d'),read=context.getImageData.bind(context);
  context.getImageData=(...args)=>{reads.set(canvas,(reads.get(canvas)||0)+1);return read(...args);};return canvas;
 }};
 const loading=[];global.requestAnimationFrame=()=>1;global.cancelAnimationFrame=()=>{};
 global.Image=class extends Image{set src(value){loading.push(new Promise((resolve,reject)=>{const done=this.onload;this.onload=()=>{done?.();resolve();};this.onerror=reject;}));super.src=fs.readFileSync(path.join(root,value.split('?')[0]));}};
 const version=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/js\/main.js\?v=([^"]+)/)[1];
 const moduleFile=file=>pathToFileURL(path.join(root,file)).href+'?v='+version;
 const {types}=await import(moduleFile('data/items.js'));
 const {createInspectionModel,drawInspection}=await import(moduleFile('js/graphics/inspection.js'));
 const shape=process.env.INSPECTION_CASE,item=shape==='coin-25'?types.find(t=>t.country&&t.value===25&&t.year===1992):types.find(t=>t.shape===shape);
 if(shape==='coin-25'){
  const {paintCoinReference}=await import(moduleFile('js/graphics/coin-reference.js'));
  const dummy=createCanvas(256,256).getContext('2d');dummy.translate(128,128);
  for(let i=0;i<3;i++){for(const side of [0,1])paintCoinReference(dummy,item,85,side);await Promise.all(loading);}
 }
 const start=performance.now(),model=createInspectionModel(item,85),buildMs=performance.now()-start;
 const canvas=createCanvas(300,250),context=canvas.getContext('2d');
 const draw=(yaw,pitch=.18,zoom=1,pan=[0,0])=>{
  const start=performance.now();drawInspection(context,model,yaw,pitch,true,300,250,zoom,0,pan);
  context.getImageData(0,0,300,250);return performance.now()-start; // include actual readback
 };
 const firstFrameMs=draw(.2),allocationStart=allocations;
 const frames=Array.from({length:8},(_,i)=>draw(.2+i*.17));
 const extraCanvases=allocations-allocationStart;
 const sorted=frames.slice().sort((a,b)=>a-b),zoomMs=draw(.3,.2,2.5,[.12,-.1]);
 // Current renderer should reuse geometry/texture pixels and one frame buffer.
 if(fs.existsSync(path.join(root,'js/graphics/inspection-software.js'))){
  assert(model.textures.every(canvas=>(reads.get(canvas)||0)<=1),'immutable source pixels are read once');
  if(shape!=='coin-25')assert.equal(extraCanvases,0,'rotation allocates no additional canvases');
  const {renderSoftwareMesh,MAX_SOFTWARE_PIXELS}=await import(moduleFile('js/graphics/inspection-software.js'));
  const out=renderSoftwareMesh(model,.3,.2,600,500,2.5,0,[.12,-.1]);assert(out);assert(out.width*out.height<=MAX_SOFTWARE_PIXELS);
  const count=allocations;assert.equal(renderSoftwareMesh(model,.3,.2,600,500,2,0,[0,0]),out);assert.equal(allocations,count,'zoom/pan reuses prelit face and target');
 }
 const round=n=>+n.toFixed(1);
 console.log(JSON.stringify({shape,triangles:model.triangles.length,buildMs:round(buildMs),firstFrameMs:round(firstFrameMs),warmMedianMs:round((sorted[3]+sorted[4])/2),warmMaxMs:round(sorted.at(-1)),zoomMs:round(zoomMs),frames:frames.map(round),extraCanvases}));
})().catch(error=>{console.error(error);process.exit(1)});
