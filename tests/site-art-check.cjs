// Native Canvas review of the actual procedural terrain, independent of a browser.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
(async()=>{
 const root=path.resolve(__dirname,'..'),version=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/js\/main.js\?v=([^"]+)/)[1];
 const {locations}=await import('../data/locations.js?v='+version);
 const {createSiteLayout}=await import('../data/site-layout.js?v='+version);
 const {paintSiteTerrain}=await import('../js/graphics/site-terrain.js?v='+version);
 const out=process.env.OUTPUT_DIR;if(out)fs.mkdirSync(out,{recursive:true});
 const sheet=createCanvas(920,1672),c=sheet.getContext('2d');c.fillStyle='#0d1913';c.fillRect(0,0,sheet.width,sheet.height);
 const hashes=new Set(),{createHash}=require('node:crypto');
 for(const [i,loc] of locations.entries()){
   const canvas=createCanvas(880,720),ctx=canvas.getContext('2d'),layout=createSiteLayout(loc.terrain,1371+i*7919);
   paintSiteTerrain(ctx,loc,layout);const first=canvas.toBuffer('image/png');
   hashes.add(createHash('sha256').update(first).digest('hex'));paintSiteTerrain(ctx,loc,layout);assert(first.equals(canvas.toBuffer('image/png')),'deterministic paint');
   const x=10+(i%2)*460,y=10+Math.floor(i/2)*418;c.drawImage(canvas,x,y,440,360);c.fillStyle='#d9e7bd';c.font='16px sans-serif';c.fillText(loc.name,x+8,y+386);
   if(out)fs.writeFileSync(path.join(out,loc.terrain+'.png'),first);
 }
 assert.equal(hashes.size,8,'eight visually distinct terrains');
 if(out)fs.writeFileSync(path.join(out,'sites.png'),sheet.toBuffer('image/png'));
 console.log('PASS 8 terrain renders; deterministic canvas output; saved native review sheet');
})().catch(e=>{console.error(e);process.exit(1)});
