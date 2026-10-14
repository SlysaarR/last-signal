// Optional native Canvas review: original reconstructions, no external images.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
global.document={createElement:()=>createCanvas(512,512)};
const out=process.env.OUTPUT_DIR;if(out)fs.mkdirSync(out,{recursive:true});
(async()=>{
 if(process.env.FIND_INDEX===undefined){
  assert(out,'OUTPUT_DIR is required for the full review');
  const {spawnSync}=require('node:child_process');
  for(let i=0;i<14;i++){const run=spawnSync(process.execPath,[__filename],{env:{...process.env,FIND_INDEX:String(i)},stdio:'inherit'});assert.equal(run.status,0,'find '+i);}
  for(let page=0;page<2;page++){const sheet=createCanvas(1200,2030),ctx=sheet.getContext('2d');for(let row=0;row<7;row++)ctx.drawImage(await loadImage(path.join(out,'finds-'+(page*7+row)+'.png')),0,row*290);fs.writeFileSync(path.join(out,'page-'+(page+1)+'.png'),sheet.toBuffer('image/png'));}
  return;
 }
 const {findCatalog}=await import('../data/finds.js');
 const {createInspectionModel,drawInspection}=await import('../js/graphics/inspection.js');
 const stats=[];const only=process.env.FIND_INDEX===undefined?null:Number(process.env.FIND_INDEX);
 for(let page=0;page<2;page++){
  if(only!==null&&Math.floor(only/7)!==page)continue;
  const sheet=createCanvas(1200,290),ctx=sheet.getContext('2d');ctx.fillStyle='#101e15';ctx.fillRect(0,0,sheet.width,sheet.height);
  for(let row=0;row<7;row++){
   if(only!==null&&page*7+row!==only)continue;
   const item=findCatalog[page*7+row],model=createInspectionModel(item,85),worn=createInspectionModel(item,12),times=[];
   for(const [col,yaw,pitch,m] of [[0,.2,.18,model],[1,Math.PI+.25,.2,model],[2,1.4,['barrel-key','thimble','crotal-bell'].includes(item.shape)?-1.15:.65,model],[3,.2,.18,worn]]){
    const canvas=createCanvas(300,250),start=performance.now();drawInspection(canvas.getContext('2d'),m,yaw,pitch,true,300,250);times.push(Math.round(performance.now()-start));ctx.drawImage(canvas,col*300,0);
   }
   ctx.fillStyle='#d9e4ce';ctx.font='18px sans-serif';ctx.fillText(item.name+' · 85% / зворот / ребро / 12%',15,277);
   assert(model.triangles.length<=2300,item.shape+' triangle budget');assert(model.textures.length<=3,item.shape+' texture budget');
   stats.push({shape:item.shape,triangles:model.triangles.length,textures:model.textures.length,canvasFrameMs:times});
  }
  if(out)fs.writeFileSync(path.join(out,'finds-'+(only===null?'page'+(page+1):only)+'.png'),sheet.toBuffer('image/png'));
 }
 if(out)fs.writeFileSync(path.join(out,'stats'+(only===null?'':only)+'.json'),JSON.stringify(stats,null,2));
 console.log(JSON.stringify(stats));
})().catch(e=>{console.error(e);process.exitCode=1});
