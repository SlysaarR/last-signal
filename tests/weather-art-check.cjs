// Native Canvas review of the actual ground painter. CSS animation is not a
// browser screenshot and is deliberately outside this offline image check.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {createCanvas}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
(async()=>{
 const {paintSiteTerrain}=await import('../js/graphics/site-terrain.js');
 const {paintEnvironmentGround}=await import('../js/graphics/environment-art.js');
 const {createSiteLayout}=await import('../data/site-layout.js');const {locations}=await import('../data/locations.js');
 const sheet=createCanvas(1320,830),c=sheet.getContext('2d');c.fillStyle='#101c15';c.fillRect(0,0,1320,830);
 const names=['Сухий ґрунт','Вологий ґрунт','Кам’янистий ґрунт'],hashes=new Set();
 for(const [row,terrain] of ['field','forest'].entries())for(const [col,ground] of ['dry','damp','stony'].entries()){
  const canvas=createCanvas(880,720),ctx=canvas.getContext('2d'),loc=locations.find(l=>l.terrain===terrain),layout=createSiteLayout(terrain,491),environment={version:1,weather:'clear',ground};
  const paint=()=>{paintSiteTerrain(ctx,loc,layout);paintEnvironmentGround(ctx,environment,491);};paint();const png=canvas.toBuffer('image/png');paint();assert(png.equals(canvas.toBuffer('image/png')));hashes.add(createHash('sha256').update(png).digest('hex'));
  c.drawImage(canvas,col*440,row*415,440,360);c.fillStyle='#d7e4c3';c.font='18px sans-serif';c.fillText(names[col],col*440+15,row*415+392);
 }
 assert.equal(hashes.size,6);if(process.env.OUTPUT_DIR){fs.mkdirSync(process.env.OUTPUT_DIR,{recursive:true});fs.writeFileSync(path.join(process.env.OUTPUT_DIR,'grounds.png'),sheet.toBuffer('image/png'));}
 console.log('PASS six distinct deterministic ground renders; unchanged base layout and no buried-object input');
})().catch(e=>{console.error(e);process.exit(1)});
