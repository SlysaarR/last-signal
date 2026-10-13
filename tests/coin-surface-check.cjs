// Real Canvas raster checks without a browser. Install @napi-rs/canvas for QA,
// or set CANVAS_MODULE to an existing installation. No game dependency.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {createCanvas,Image}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
global.document={createElement:()=>createCanvas(512,512)};
const loading=[];
global.Image=class extends Image {
  set src(value) {
    const promise=new Promise((resolve,reject)=>{
      const done=this.onload;this.onload=()=>{done?.();resolve();};this.onerror=reject;
    });loading.push(promise);
    super.src=fs.readFileSync(path.join(root,value.split('?')[0]));
  }
};
const digest=canvas=>createHash('sha256').update(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data).digest('hex');
function detail(canvas) {
  const c=createCanvas(256,256),ctx=c.getContext('2d');ctx.drawImage(canvas,0,0,256,256);
  const a=ctx.getImageData(0,0,256,256).data;let energy=0;
  // Inner field excludes the protective rim and source image's background.
  for(let y=50;y<206;y++)for(let x=50;x<206;x++) {
    const i=(y*256+x)*4;
    energy+=Math.abs(a[i]-a[i+4])+Math.abs(a[i]-a[i+1024]);
  }
  return energy;
}
(async()=>{
  const {types}=await import('../data/items.js');
  const {paintCoinReference}=await import('../js/graphics/coin-reference.js');
  const {wornCoinFace}=await import('../js/graphics/coin-surface.js');
  const canvas=createCanvas(256,256),c=canvas.getContext('2d');c.translate(128,128);
  const coins=types.filter(t=>t.country),before=JSON.stringify(coins);
  for(let attempt=0;attempt<3;attempt++) {
    for(const item of coins)for(const side of [0,1])paintCoinReference(c,item,100,side);
    await Promise.all(loading);
  }
  for(const item of coins)for(const side of [0,1]) {
    c.clearRect(-128,-128,256,256);assert(paintCoinReference(c,item,100,side),item.name);
    assert(c.getImageData(128,128,1,1).data[3]>0,'photo must actually render');
  }
  const target=coins.find(t=>t.value===10&&t.year===2014&&t.unit.startsWith('коп'));
  const states=new Set();
  for(let n=0;n<=100;n++) {
    c.clearRect(-128,-128,256,256);paintCoinReference(c,target,n,1);states.add(digest(canvas));
  }
  assert.equal(states.size,101,'every condition has a distinct rendering');
  c.clearRect(-128,-128,256,256);paintCoinReference(c,target,42,1);const stable=digest(canvas);
  c.clearRect(-128,-128,256,256);paintCoinReference(c,target,75,1);
  c.clearRect(-128,-128,256,256);paintCoinReference(c,target,42,1);
  assert.equal(digest(canvas),stable,'wear is stable after switching condition');
  for(const filename of ['k10-0.webp','k10-1.webp','h5-1.webp']) {
    const im=new Image();im.src=fs.readFileSync(path.join(root,'assets/coins',filename));await im.decode();
    assert.strictEqual(wornCoinFace(im,100),im,'pristine source is untouched');
    const values=[100,75,50,25,0].map(n=>detail(wornCoinFace(im,n)));
    assert(values.every((v,i)=>i===0||v<values[i-1]),filename+' relief decreases: '+values);
    assert(values.at(-1)<values[0]*.12,'lowest condition loses engraving, not only colour');
  }
  assert.equal(JSON.stringify(coins),before,'rendering cannot alter coin data');
  console.log(`PASS ${coins.length*2} actual photo faces, 101 conditions, stable wear, pristine source, decreasing relief and immutable catalogue`);
})().catch(e=>{console.error(e);process.exitCode=1});
