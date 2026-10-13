// Native Canvas QA; no browser or game dependency. Optional OUTPUT_DIR keeps review frames.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas,Image}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),loading=[];
global.document={createElement:()=>createCanvas(512,512)};
global.requestAnimationFrame=()=>1;global.cancelAnimationFrame=()=>{};
const version=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/js\/main.js\?v=([^"]+)/)[1];
global.Image=class extends Image {
  set src(value) {
    loading.push(new Promise((resolve,reject)=>{const done=this.onload;this.onload=()=>{done?.();resolve();};this.onerror=reject;}));
    super.src=fs.readFileSync(path.join(root,value.split('?')[0]));
  }
};
const out=process.env.OUTPUT_DIR;if(out)fs.mkdirSync(out,{recursive:true});
function mapEnergy(map) {
  let energy=0;
  for(let y=40;y<216;y++)for(let x=40;x<216;x++){const i=(y*256+x)*4;energy+=Math.hypot(map.data[i]-127.5,map.data[i+1]-127.5);}
  return energy;
}
(async()=>{
  const {types}=await import('../data/items.js?v='+version);
  const {paintCoinReference,coinReliefImage}=await import('../js/graphics/coin-reference.js?v='+version);
  const {makeReliefMap,relightFace}=await import('../js/graphics/inspection-light.js?v='+version);
  const {createInspectionModel,drawInspection}=await import('../js/graphics/inspection.js?v='+version);
  const coins=[types.find(t=>t.country&&t.value===25&&t.year===1992),types.find(t=>t.country&&t.value===5&&t.unit.startsWith('гр'))];
  const dummy=createCanvas(256,256).getContext('2d');dummy.translate(128,128);
  for(let i=0;i<3;i++){for(const item of coins)for(const side of [0,1])paintCoinReference(dummy,item,100,side);await Promise.all(loading);}
  const dataBefore=JSON.stringify(coins),montage=createCanvas(1600,1000),mc=montage.getContext('2d');
  const conditions=[100,70,35,0];
  for(let row=0;row<coins.length;row++) {
    const item=coins[row],energies=conditions.map(condition=>mapEnergy(makeReliefMap(coinReliefImage(item,condition,0),condition)));
    assert(energies.every((v,i)=>i===0||v<energies[i-1]),'micro-relief fades: '+energies);
    assert(energies.at(-1)<energies[0]*.18,'worn relief cannot retain pristine shine');
    for(let col=0;col<conditions.length;col++) {
      const model=createInspectionModel(item,conditions[col]),canvas=createCanvas(400,400);
      assert(model.reliefMaps[1].map&&model.reliefMaps[2].map,'both photo faces have relief');
      drawInspection(canvas.getContext('2d'),model,.2,.15,true,400,400,1,0);
      mc.drawImage(canvas,col*400,row*500);mc.fillStyle='#d5e5c9';mc.font='20px sans-serif';mc.fillText(item.denom+' · '+conditions[col]+'%',col*400+20,row*500+430);
    }
  }
  // Broad photographic shadows are not protrusions.
  const smooth=createCanvas(256,256),sc=smooth.getContext('2d'),g=sc.createLinearGradient(0,0,256,0);
  g.addColorStop(0,'#777');g.addColorStop(1,'#bbb');sc.fillStyle=g;sc.fillRect(0,0,256,256);
  assert(mapEnergy(makeReliefMap(smooth,100))<30000,'broad smooth shading remains flat');
  const model=createInspectionModel(coins[0],85),map=model.reliefMaps[1].map;
  const left=relightFace(model.textures[1],map,1,0,0,model.profile.polish,0).getContext('2d').getImageData(0,0,256,256).data;
  const right=relightFace(model.textures[1],map,1,0,0,model.profile.polish,1).getContext('2d').getImageData(0,0,256,256).data;
  let min=1000,max=-1000;for(let y=50;y<206;y++)for(let x=50;x<206;x++){const i=(y*256+x)*4,d=right[i]-left[i];min=Math.min(min,d);max=Math.max(max,d);}
  assert(max-min>8,'lamp changes local detail, not just uniform brightness');
  const views=[[0,0,1,0],[0,0,1,1],[Math.PI,.12,1,1],[Math.PI/2,.25,1.6,0],[.3,.2,2.2,2]];
  const strip=createCanvas(views.length*400,400),cs=strip.getContext('2d');
  const times=[];
  for(let i=0;i<views.length;i++){const [yaw,pitch,zoom,light]=views[i],canvas=createCanvas(400,400),start=performance.now();drawInspection(canvas.getContext('2d'),model,yaw,pitch,true,400,400,zoom,light);times.push(Math.round(performance.now()-start));cs.drawImage(canvas,i*400,0);}
  assert.equal(JSON.stringify(coins),dataBefore,'artwork never mutates catalogue');
  if(out) {
    fs.writeFileSync(path.join(out,'wear.png'),montage.toBuffer('image/png'));
    fs.writeFileSync(path.join(out,'views.png'),strip.toBuffer('image/png'));
    const fixture={triangles:model.triangles,polish:model.profile.polish,textures:[],reliefs:[],views};
    for(let i=0;i<model.textures.length;i++) {
      const p='texture-'+i+'.rgba';fs.writeFileSync(path.join(out,p),model.textures[i].getContext('2d').getImageData(0,0,512,512).data);fixture.textures.push(p);
      const map=model.reliefMaps[i]?.map;
      if(map){const p='normal-'+i+'.rgba';fs.writeFileSync(path.join(out,p),map.data);fixture.reliefs.push({path:p,side:model.reliefMaps[i].side});}else fixture.reliefs.push(null);
    }
    fs.writeFileSync(path.join(out,'mesh.json'),JSON.stringify(fixture));
  }
  console.log('PASS both metal families and faces, monotone relief loss, flat broad shadows, local lamp response and immutable catalogue; fallback frame ms:',times);
})().catch(e=>{console.error(e);process.exitCode=1});
