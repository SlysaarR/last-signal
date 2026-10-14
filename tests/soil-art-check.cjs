// Actual Canvas pixels, independent of browser event/layout emulation.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createCanvas}=require(process.env.CANVAS_MODULE||'@napi-rs/canvas');
(async()=>{
 const version=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/js\/main.js\?v=([^"]+)/)[1];
 const {createSoilBrush}=await import('../js/graphics/soil-brush.js?v='+version);
 const {brushMark,visitBrushSegment}=await import('../data/cleaning.js?v='+version);
 const make=()=>createCanvas(600,500),brush=createSoilBrush(make);
 const base=[34,35,36,50,51,52,66,67,68,82,83];
 const canvas=()=>{const v=make(),c=v.getContext('2d');c.fillStyle='#6b5135';c.fillRect(0,0,600,500);c.globalCompositeOperation='destination-out';return v;};
 const old=canvas(),oldContext=old.getContext('2d');
 // This native backend clears the whole canvas with clearRect + destination-out;
 // source-over gives the intended rectangular reference for comparison.
 oldContext.globalCompositeOperation='source-over';
 for(const cell of base)oldContext.clearRect(172+(cell%16)*16,122+Math.floor(cell/16)*16,16,16);
 const legacy=canvas();brush.restore(legacy.getContext('2d'),undefined,base);
 // All pixels that were fully cleared in old saves remain cleared.
 const alpha=legacy.getContext('2d').getImageData(0,0,600,500).data;
 assert.equal(alpha[3],255,'untouched soil stays opaque');
 for(const cell of base)for(let y=122+Math.floor(cell/16)*16;y<138+Math.floor(cell/16)*16;y++)for(let x=172+(cell%16)*16;x<188+(cell%16)*16;x++)assert.equal(alpha[(y*600+x)*4+3],0);
 const live=canvas(),ctx=live.getContext('2d');brush.restore(ctx,undefined,base);
 const marks=new Set(),pathPoints=[{x:110,y:290},{x:255,y:365},{x:410,y:280},{x:450,y:175}];
 let from=pathPoints[0];for(const to of pathPoints){visitBrushSegment(from,to,(x,y)=>{const mark=brushMark(x,y);if(!marks.has(mark)){marks.add(mark);brush.paint(ctx,mark);}});from=to;}
 const restored=canvas();createSoilBrush(make).restore(restored.getContext('2d'),{version:1,base,marks:[...marks]});
 assert(Buffer.from(ctx.getImageData(0,0,600,500).data).equals(Buffer.from(restored.getContext('2d').getImageData(0,0,600,500).data)),'reloaded mask must match every live RGBA byte');
 const data=ctx.getImageData(0,0,600,500).data;let feather=0;for(let i=3;i<data.length;i+=4)if(data[i]>0&&data[i]<255)feather++;assert(feather>500,'soft brush boundary');
 if(process.env.OUTPUT_DIR){
   fs.mkdirSync(process.env.OUTPUT_DIR,{recursive:true});const sheet=createCanvas(840,768),c=sheet.getContext('2d');c.fillStyle='#101c17';c.fillRect(0,0,840,768);
   for(const [i,[image,label]] of [[old,'Legacy cells before 0.44'],[legacy,'Legacy cells: soft boundary'],[live,'Brush path during cleaning'],[restored,'Restored: identical pixels']].entries()){
     const x=10+i%2*420,y=10+Math.floor(i/2)*384;c.fillStyle='#c0bf91';c.fillRect(x,y,400,333);c.drawImage(image,x,y,400,333);c.fillStyle='#dae6c5';c.font='16px sans-serif';c.fillText(label,x+5,y+358);
   }
   fs.writeFileSync(path.join(process.env.OUTPUT_DIR,'soil-restore.png'),sheet.toBuffer('image/png'));
 }
 console.log('PASS native Canvas: all legacy-cleared pixels retained, soft edge, exact live/restored RGBA equality; '+marks.size+' brush marks');
})().catch(e=>{console.error(e);process.exit(1)});
