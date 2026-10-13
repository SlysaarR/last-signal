import { coinDesign, coinDesignKey } from '../../data/coin-art.js?v=0.36.0';
import { conditionProfile, metalPalette, paintWear } from './condition.js?v=0.36.0';
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
    entry.image.src='assets/coins/'+path+'.webp?v=0.36.0';
  }
  const entry=images.get(path);return entry?.ready?entry.image:null;
}
// Replace only the date/mint-mark field, sampling the adjacent metal. Feathered
// boundaries preserve the photograph's lighting; every inventory year is legible.
function clearField(c,[x,y,w,h],texture=false) {
  const image=c.getImageData(0,0,512,512),out=c.getImageData(x,y,w,h),src=image.data,dst=out.data;
  for(let v=0;v<h;v++)for(let u=0;u<w;u++) {
    const a=Math.min(1,Math.min(u,v,w-1-u,h-1-v)/3),t=u/(w-1);
    const sampleY=texture ? y+((v+u*7)%h) : y+v;
    for(let k=0;k<3;k++) {
      const left=src[(sampleY*512+x-4)*4+k],right=src[(sampleY*512+x+w+3)*4+k];
      const value=left*(1-t)+right*t;
      dst[(v*w+u)*4+k]=dst[(v*w+u)*4+k]*(1-a)+value*a;
    }
  }
  c.putImageData(out,x,y);
}
function date(c,item,d) {
  const [x,y,w,h]=d.date,gold=item.material==='yellow';
  clearField(c,d.date,d.modern && item.value>=5);
  c.save();c.textAlign='center';c.textBaseline='middle';c.font=`bold ${d.font}px Georgia,serif`;
  const label=String(item.year),baseline=y+h*.51;
  c.fillStyle=gold?'#51421c':'#484845';c.fillText(label,x+w/2+1,baseline+1,w-9);
  c.fillStyle=gold?'#fff1b2':'#f4f2e9';c.fillText(label,x+w/2-1,baseline-1,w-9);
  c.fillStyle=gold?'#cbb36c':'#b0afaa';c.fillText(label,x+w/2,baseline,w-9);c.restore();
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
export function paintCoinReference(c,item,condition,side) {
  const src=face(item,side);if(!src)return false;
  const p=conditionProfile(condition),palette=metalPalette(item,condition);
  c.save();c.beginPath();c.arc(0,0,126,0,Math.PI*2);c.clip();
  // The source specimen supplies lettering, portrait, shield and ornament. Wear
  // is a separate deterministic layer; it never changes a name, date or price.
  c.filter=`saturate(${1-p.wear*.48}) contrast(${1-p.wear*.36}) brightness(${1-p.wear*.28}) blur(${p.wear*p.wear*.55}px)`;
  c.drawImage(src,-126,-126,252,252);c.filter='none';
  c.fillStyle=palette.mid;c.globalAlpha=p.wear*.13;c.fillRect(-128,-128,256,256);c.globalAlpha=1;
  paintWear(c,item,condition,(item.year||1992)*31+item.value*17+side*917);
  c.restore();return true;
}
