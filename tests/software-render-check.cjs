const {newRun,root,assert}=require('./harness.cjs');
const plain=value=>JSON.parse(JSON.stringify(value));
(async()=>{
 const run=await newRun(),ns=name=>run.modules.get(root+'/js/'+name+'.js').namespace;
 const {createRasterTarget,rasterizeMesh,softwareSize,MAX_SOFTWARE_PIXELS}=ns('graphics/inspection-software');
 const graphics=ns('graphics/inspection'),lighting=ns('graphics/inspection-light');
 const texture=(r,g,b,alpha=255)=>({width:2,height:2,data:new Uint8ClampedArray(Array.from({length:4},()=>[r,g,b,alpha]).flat())});
 const red=texture(220,10,10),blue=texture(10,10,220),clear=texture(255,0,0,0);
 const tri=(z,mat=0)=>({points:[[-1,-1,z],[1,-1,z],[0,1,z]],normal:[0,0,1],mat,uv:[[0,512],[512,512],[256,0]]});
 const model=triangles=>({triangles,profile:{polish:.5},reliefMaps:[]});
 const center=target=>Array.from(target.data.slice((Math.floor(target.height*.48)*target.width+Math.floor(target.width*.5))*4,(Math.floor(target.height*.48)*target.width+Math.floor(target.width*.5))*4+4));
 const target=createRasterTarget(80,64),near=tri(.5,0),far=tri(-.5,1);
 rasterizeMesh(model([near,far]),[red,blue],target);assert(center(target)[0]>center(target)[2]);
 const ordered=target.data.slice();rasterizeMesh(model([far,near]),[red,blue],target);assert.deepEqual(target.data,ordered,'depth, not draw order, determines occlusion');
 rasterizeMesh(model([near,far]),[clear,blue],target);assert(center(target)[2]>center(target)[0],'transparent texels do not occlude the back');
 rasterizeMesh(model([{...near,normal:[0,0,-1]}]),[red],target);assert(target.data.every(n=>n===0),'back faces are culled and stale frame cleared');
 rasterizeMesh(model([near]),[red],target,0,0,2.5,0,[.42,-.42]);assert(target.data.some(n=>n>0),'zoom/pan clips safely to the target');
 rasterizeMesh(model([]),[],target);assert(target.depth.every(n=>n===0));assert(target.data.every(n=>n===0));
 for(const [w,h] of [[160,140],[300,250],[600,500],[10000,5000]]){const [rw,rh]=softwareSize(w,h);assert(rw*rh<=MAX_SOFTWARE_PIXELS);assert(rw>0&&rh>0);assert(Math.abs(rw/rh-w/h)<.02);}
 assert.deepEqual(plain(softwareSize(160,140)),[320,280]);
 // An independent ray/plane intersection checks perspective-correct UVs across
 // a tilted square. This also catches cracks along its two-triangle diagonal.
 const a=[-1,-1,.6],b=[1,-1,-.6],c=[1,1,-.6],d=[-1,1,.6];
 const length=Math.hypot(.6,1),normal=[.6/length,0,1/length];
 const square=model([{points:[a,b,c],normal,mat:0,uv:[[0,512],[512,512],[512,0]]},{points:[a,c,d],normal,mat:0,uv:[[0,512],[512,0],[0,0]]}]);
 const gradient={width:32,height:32,data:new Uint8ClampedArray(32*32*4)};
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){const i=(y*32+x)*4;gradient.data.set([x*7,y*7,50,255],i);}
 const t=createRasterTarget(80,64);rasterizeMesh(square,[gradient],t);
 const scale=Math.min(t.width*.36,t.height*.39),[diffuse,shine]=lighting.lightTerms(normal,.5,0);
 let samples=0;
 for(let y=0;y<t.height;y++)for(let x=0;x<t.width;x++) {
  const dx=(x+.5-t.width*.5)/(scale*5),dy=(t.height*.48-y-.5)/(scale*5);
  // Ray: (0,0,5) + distance*(dx,dy,-1); plane z = -0.6*x.
  const distance=5/(1-.6*dx),px=distance*dx,py=distance*dy;
  if(Math.abs(px)>.98||Math.abs(py)>.98)continue;
  const u=Math.max(0,Math.min(31,(px+1)*16-.5)),v=Math.max(0,Math.min(31,(1-py)*16-.5));
  const i=(y*t.width+x)*4;
  assert.equal(t.data[i+3],255,'solid square has no diagonal holes');
  assert(Math.abs(t.data[i]-(u*7*diffuse+shine*255))<1.1,'perspective U');
  assert(Math.abs(t.data[i+1]-(v*7*diffuse+shine*255*.984))<1.1,'perspective V');samples++;
 }
 assert(samples>1500);const unchanged=JSON.stringify(square);
 for(let light=0;light<3;light++)rasterizeMesh(square,[gradient],t,.3,.2,1.7,light,[.1,-.1]);
 assert.equal(JSON.stringify(square),unchanged,'rendering never mutates geometry');
 // Actual mesh openings remain transparent, including the tongue/pin nearby.
 const catalog=JSON.parse(run.catalog());
 for(const shape of ['rect-buckle','annular-brooch']) {
  const m=graphics.createInspectionModel(catalog.find(item=>item.shape===shape),85);
  const textureData=m.textures.map(()=>red),frame=createRasterTarget(160,140);
  rasterizeMesh(m,textureData,frame);
  const x=80,y=Math.round(140*.48-.3*140*.39);
  assert.equal(frame.data[(y*160+x)*4+3],0,shape+' real opening stays open');
  assert(frame.data.some((n,i)=>i%4===3&&n===255),'metal around the opening is visible');
 }
 let visibleReads=0,hiddenReads=0;
 rasterizeMesh(model([near,{...far,normal:[0,0,-1]}]),[()=>{visibleReads++;return {...red,lit:true};},()=>{hiddenReads++;return blue;}],target);
 assert.equal(visibleReads,1);assert.equal(hiddenReads,0,'invisible photographic faces are not relit/read');
 assert.deepEqual(center(target),[220,10,10,255],'prelit photographic face is not shaded twice');
 console.log('PASS pixel-depth occlusion, transparency, culling, frame clearing, bounded resolution, independent perspective reference, seamless quad, actual hollow geometry, lazy face reads and preserved prelit colour');
})().catch(error=>{console.error(error);process.exit(1)});
