// Offline asset preparation only; no image service or third-party calls at runtime.
// Run with sharp installed, or set SHARP_MODULE to the installed sharp module.
const fs=require('node:fs/promises'),path=require('node:path'),sharp=require(process.env.SHARP_MODULE||'sharp');
const dir=path.resolve(__dirname,'../assets/coins');
(async()=>{
 const sources=JSON.parse(await fs.readFile(path.join(dir,'sources.json'),'utf8')),downloads=new Map();
 for(const entry of sources){
  if(!downloads.has(entry.image)){
   const response=await fetch(entry.image,{signal:AbortSignal.timeout(30000)});
   if(!response.ok)throw Error(entry.image+': '+response.status);
   downloads.set(entry.image,Buffer.from(await response.arrayBuffer()));
  }
  let image=sharp(downloads.get(entry.image));
  if(entry.crop){const [left,top,width,height]=entry.crop;image=image.extract({left,top,width,height});}
  // The catalogue comparison has two red measuring guides, not coin features.
  if(entry.removeRedGuideLines){
   const {data,info}=await image.raw().toBuffer({resolveWithObject:true}),copy=Buffer.from(data),ch=info.channels;
   for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const i=(y*info.width+x)*ch;
    if(data[i]>data[i+1]*1.55&&data[i]>data[i+2]*1.55&&data[i]>140){const xx=Math.min(info.width-1,x+5);for(let k=0;k<3;k++)copy[i+k]=data[(y*info.width+xx)*ch+k];}
   }
   image=sharp(copy,{raw:info});
  }
  await image.resize(512,512,{fit:'fill'}).webp({quality:90}).toFile(path.join(dir,entry.file));
  console.log(entry.file);
 }
})().catch(e=>{console.error(e);process.exitCode=1});
