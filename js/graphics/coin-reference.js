import { coinDesign, coinDesignKey } from '../../data/coin-art.js?v=0.54.1';
import { conditionProfile, metalPalette, paintWear } from './condition.js?v=0.54.1';
import { wornCoinFace } from './coin-surface.js?v=0.54.1';
const images=new Map(),faces=new Map(),listeners=new Set();
let revision=0;
export const coinImageRevision=()=>revision;
export function onCoinImagesReady(fn){listeners.add(fn);return()=>listeners.delete(fn);}
function photo(key,side) {
  const path=key+'-'+side;
  if(!images.has(path) && typeof Image!=='undefined') {
    const entry={image:new Image(),ready:false};images.set(path,entry);
    entry.image.onload=()=>{entry.ready=true;revision++;for(const fn of listeners)fn();};
    entry.image.onerror=()=>{entry.failed=true;};
    entry.image.src='assets/coins/'+path+'.webp?v=0.40.0';
  }
  const entry=images.get(path);return entry?.ready?entry.image:null;
}
// Bounds include the entire original engraving AND its highlight/shadow halo.
// For dates, sample metal along the same radius: straight horizontal sampling
// cuts through the circular borders of modern hryvnias and leaves stripes.
function clearField(c,[x,y,w,h],texture=false) {
  const image=c.getImageData(0,0,512,512),out=c.getImageData(x,y,w,h),src=image.data,dst=out.data;
  for(let v=0;v<h;v++)for(let u=0;u<w;u++) {
    const a=Math.min(1,Math.min(u,v,w-1-u,h-1-v)/3),t=u/(w-1);
    const radius2=(x+u-256)**2+(y+v-256)**2;
    const sample=(side,k)=>{
      let sum=0;
      for(let n=0;n<9;n++) {
        const offset=5+(texture?((u*13+v*7+n*3)%15):n%3*3);
        const sx=side?x+w+offset:x-offset;
        const sy=texture?Math.round(256+Math.sqrt(Math.max(0,radius2-(sx-256)**2))):y+v+(Math.floor(n/3)-1)*3;
        sum+=src[(Math.max(0,Math.min(511,sy))*512+sx)*4+k];
      }
      return sum/9;
    };
    for(let k=0;k<3;k++) {
      const left=sample(0,k),right=sample(1,k);
      const grain=texture?0:(src[(Math.min(511,y+((u*11+v*7)%h))*512+x-7)*4+k]-left)*.12;
      const value=left*(1-t)+right*t+grain;
      dst[(v*w+u)*4+k]=dst[(v*w+u)*4+k]*(1-a)+value*a;
    }
  }
  c.putImageData(out,x,y);
}
function date(c,item,d) {
  const [x,y,w,h]=d.date;
  clearField(c,d.date,!!d.modern);
  const field=c.getImageData(x+Math.floor(w/2)-2,y+Math.floor(h/2)-2,5,5).data;
  const metal=[0,0,0];for(let i=0;i<field.length;i+=4)for(let k=0;k<3;k++)metal[k]+=field[i+k]/25;
  const shade=delta=>`rgb(${metal.map(v=>Math.max(0,Math.min(255,Math.round(v+delta)))).join(',')})`;
  c.save();c.textAlign='center';c.textBaseline='alphabetic';c.font=`${d.font}px Georgia,serif`;
  const label=String(item.year),m=c.measureText(label);
  const ascent=m.actualBoundingBoxAscent||d.font*.75,descent=m.actualBoundingBoxDescent||0;
  // Canvas maxWidth only SHRINKS text. Explicit scaling keeps a replacement
  // date the same size as the source, including on phones with another font.
  c.translate(x+w/2,y+h/2);c.scale((w-(d.modern?24:30))/Math.max(1,m.width),(h-(d.modern?16:26))/Math.max(1,ascent+descent));
  const baseline=(ascent-descent)/2;
  c.lineJoin='round';c.lineWidth=1.25;c.strokeStyle=shade(-70);
  c.strokeText(label,.55,baseline+.55);
  c.strokeStyle=shade(52);c.strokeText(label,-.55,baseline-.55);
  c.fillStyle=shade(8);c.fillText(label,0,baseline);c.restore();
}
function reference(item,side) {
  const key=coinDesignKey(item),d=coinDesign(item);if(!d)return null;
  let exactKey=null,exactSide=d.modern?side:1-side;
  if(item.value===1&&item.unit.startsWith('коп')&&item.year===1992){
    exactKey=item.variant==='1.2АА'?'k1-1992-12':item.variant==='1.11АЕ'&&side===0?'k1-1992-ae':'k1-1992';
  }
  if(item.variant==='1АГс')exactKey='k50-1992-ag';
  if(item.variant==='2АД2')exactKey='h1-2003-ad2';
  if(item.variant==='2(10 к.)АА')exactKey=side===1?'k2-wide':'k2-old';
  return {key:exactKey||key,side:exactSide,exact:!!exactKey};
}
export function coinFaceImageKey(item,side) {
  const r=reference(item,side);if(!r)return '';
  const path=r.key+'-'+r.side;
  return path+':'+!!images.get(path)?.ready+(r.key==='k5'&&item.year>=2000?':'+!!images.get('k1-0')?.ready:'');
}
function face(item,side) {
  const key=coinDesignKey(item),d=coinDesign(item),r=reference(item,side);if(!r)return null;
  const image=photo(r.key,r.side);if(!image)return null;
  if(r.exact)return image;
  const mint=key==='k5'&&item.year>=2000&&side===1?photo('k1',0):null;
  if(key==='k5'&&item.year>=2000&&side===1&&!mint)return null;
  const cacheKey=[key,item.year,item.variant,side].join(':');
  if(faces.has(cacheKey))return faces.get(cacheKey);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const c=canvas.getContext('2d');
  c.drawImage(image,0,0,512,512);
  const dateSide=d.modern?0:1;
  if(side===dateSide){
    if(item.year!==d.year)date(c,item,d);
    if(d.mint&&item.year<2000)clearField(c,d.mint);
    // Annual Kyiv issues bear the mint mark; the 1992 steel specimen does not.
    if(mint)c.drawImage(mint,343,377,39,38,350,397,29,28);
  }
  if(faces.size>=24)faces.delete(faces.keys().next().value);faces.set(cacheKey,canvas);return canvas;
}
export function coinReliefImage(item,condition,side) {
  const source=face(item,side);return source?wornCoinFace(source,condition):null;
}
export function paintCoinReference(c,item,condition,side) {
  const src=face(item,side);if(!src)return false;
  const p=conditionProfile(condition),palette=metalPalette(item,condition);
  c.save();c.beginPath();c.arc(0,0,126,0,Math.PI*2);c.clip();
  // The source specimen supplies lettering, portrait, shield and ornament. Wear
  // is a separate deterministic layer; it never changes a name, date or price.
  c.filter=`saturate(${1-p.wear*.38}) brightness(${1-p.wear*.12})`;
  c.drawImage(wornCoinFace(src,condition),-126,-126,252,252);c.filter='none';
  c.fillStyle=palette.mid;c.globalAlpha=p.wear*.13;c.fillRect(-128,-128,256,256);c.globalAlpha=1;
  paintWear(c,item,condition,(item.year||1992)*31+item.value*17+side*917);
  c.restore();return true;
}
