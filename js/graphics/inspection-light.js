// Conservative photographic micro-relief, not a reconstruction of the mint die.
// Extract only local detail from the clean worn specimen, before generated patina.
const SIZE=256, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const unit=v=>{const length=Math.hypot(...v)||1;return v.map(x=>x/length);};
export const inspectionLights=[[-.6,.7,1],[.7,.35,1],[.05,1,1]].map(unit);
export const inspectionLightNames=['зліва','справа','зверху'];
function canvas(){const c=document.createElement('canvas');c.width=c.height=SIZE;return c;}
export function makeReliefMap(source,condition) {
  if(!source)return null;
  const work=canvas(),c=work.getContext('2d');
  // Match paintCoinReference's 126/128 radius inside the 512px face texture.
  c.filter='blur(.65px)';c.drawImage(source,2,2,SIZE-4,SIZE-4);
  const fine=c.getImageData(0,0,SIZE,SIZE).data;
  c.clearRect(0,0,SIZE,SIZE);c.filter='blur(3px)';c.drawImage(source,2,2,SIZE-4,SIZE-4);
  const broad=c.getImageData(0,0,SIZE,SIZE).data,heights=new Float32Array(SIZE*SIZE);
  const quality=clamp(Number(condition)||0,0,100)/100;
  for(let p=0;p<heights.length;p++) {
    const i=p*4,lum=a=>(a[i]*.2126+a[i+1]*.7152+a[i+2]*.0722);
    // Broad shading/colour stains are not height. Colour differences suppress
    // patina boundaries too; residual photographic ambiguity stays deliberately shallow.
    const chroma=Math.max(fine[i],fine[i+1],fine[i+2])-Math.min(fine[i],fine[i+1],fine[i+2]);
    heights[p]=clamp((lum(fine)-lum(broad))/255,-.22,.22)*(1-chroma/340);
  }
  const map=canvas(),ctx=map.getContext('2d'),image=ctx.createImageData(SIZE,SIZE);
  for(let y=0;y<SIZE;y++)for(let x=0;x<SIZE;x++) {
    const p=y*SIZE+x,i=p*4,r=Math.hypot(x-127.5,y-127.5);
    const strength=(.12+.88*quality)*clamp((123-r)/6,0,1);
    let nx=(heights[y*SIZE+Math.max(0,x-1)]-heights[y*SIZE+Math.min(255,x+1)])*1.65*strength;
    let ny=(heights[Math.min(255,y+1)*SIZE+x]-heights[Math.max(0,y-1)*SIZE+x])*1.65*strength;
    const limit=Math.min(1,.24/(Math.hypot(nx,ny)||1));nx*=limit;ny*=limit;
    const normal=unit([nx,ny,1]);
    for(let k=0;k<3;k++)image.data[i+k]=Math.round((normal[k]+1)*127.5);
    image.data[i+3]=255;
  }
  ctx.putImageData(image,0,0);return {canvas:map,data:image.data,size:SIZE};
}
export function turnNormal([x,y,z],yaw,pitch) {
  const xx=x*Math.cos(yaw)+z*Math.sin(yaw),zz=z*Math.cos(yaw)-x*Math.sin(yaw);
  return [xx,y*Math.cos(pitch)-zz*Math.sin(pitch),y*Math.sin(pitch)+zz*Math.cos(pitch)];
}
export function lightTerms(n,polish,light=0) {
  const l=inspectionLights[light]||inspectionLights[0],half=unit([l[0],l[1],l[2]+1]);
  const dot=v=>n.reduce((s,x,i)=>s+x*v[i],0);
  return [.70+.30*Math.max(0,dot(l)),Math.pow(Math.max(0,dot(half)),18+polish*62)*(.02+polish*.16)];
}
// Canvas fallback uses the same normal orientation, lamp and shading as WebGL.
export function relightFace(texture,map,side,yaw,pitch,polish,light=0) {
  const out=canvas(),c=out.getContext('2d');c.drawImage(texture,0,0,SIZE,SIZE);
  const image=c.getImageData(0,0,SIZE,SIZE),data=image.data;
  const l=inspectionLights[light]||inspectionLights[0],half=unit([l[0],l[1],l[2]+1]);
  const localL=turnNormal(l,0,-pitch),localH=turnNormal(half,0,-pitch);
  const lamp=turnNormal(localL,-yaw,0),h=turnNormal(localH,-yaw,0);
  for(let i=0;i<data.length;i+=4) {
    let nx=(map.data[i]/127.5-1)*side,ny=map.data[i+1]/127.5-1,nz=(map.data[i+2]/127.5-1)*side;
    const length=Math.hypot(nx,ny,nz);nx/=length;ny/=length;nz/=length;
    const diffuse=.70+.30*Math.max(0,nx*lamp[0]+ny*lamp[1]+nz*lamp[2]);
    const shine=Math.pow(Math.max(0,nx*h[0]+ny*h[1]+nz*h[2]),18+polish*62)*(.02+polish*.16)*255;
    data[i]=data[i]*diffuse+shine;data[i+1]=data[i+1]*diffuse+shine*.984;data[i+2]=data[i+2]*diffuse+shine*.9;
  }
  c.putImageData(image,0,0);return out;
}
