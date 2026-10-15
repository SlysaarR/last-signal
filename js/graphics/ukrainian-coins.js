import { conditionProfile, metalPalette, paintWear } from './condition.js?v=0.52.0';
import { coinEdgeSpec } from '../../data/coin-art.js?v=0.52.0';
import { paintCoinReference, onCoinImagesReady, coinFaceImageKey } from './coin-reference.js?v=0.52.0';
import { paintLaterHryvniaPortrait } from './hryvnia-portraits.js?v=0.52.0';
import { paintHryvniaPortrait } from './hryvnia.js?v=0.52.0';
// Original Canvas rendition of the 25-kopiyok reverse; not an exact mint-die reproduction.
// References: museum.mincult.gov.ua/collections/moneta-25-kopiyok-1992-r-125364
// commons.wikimedia.org/wiki/File:Ukraine-25-kopiyok-1992.jpg
import { types } from '../../data/items.js?v=0.52.0';
import { createLazyThumbnails } from './lazy-thumbnails.js?v=0.52.0';
// Shared denomination-side artwork; mint die micro-varieties are intentionally not simulated.
export function isUkrainianCoin(t) {
  return t?.country === 'Україна' && (t.unit?.startsWith('коп') || ([1,2,5,10].includes(t.value) && t.unit?.startsWith('гр')));
}
export function canFlipCoin(t) { return isUkrainianCoin(t); }
export function paintUkrainianCoin(c, item, condition = 75, side = 0) {
  if (side === 2 && canFlipCoin(item)) { paintCoinEdge(c, condition, item); return; }
  if (paintCoinReference(c,item,condition,side)) return;
  const profile = conditionProfile(condition), palette = metalPalette(item, condition);
  const obverse = side === 1 && canFlipCoin(item);
  const seed = (item.value === 25 ? 1992 : item.value * 1992) + (obverse ? 917 : 0);
  const silver = item.material !== 'yellow';
  const hryvnia = item.unit.startsWith('гр');
  const modern = hryvnia && item.year >= 2004;
  const light = silver ? '#eef0ec' : '#f4df98', dark = silver ? '#606b70' : '#74602e';
  const raised = palette.light;
  const wear = 1 - Math.max(0, Math.min(100, condition)) / 100, r = 126;
  let n = seed * 37 + 251;
  const random = () => { n = n * 16807 % 2147483647; return n / 2147483647; };
  c.save();
  const metal = c.createLinearGradient(-100,-120,105,130);
  metal.addColorStop(0, palette.light);
  metal.addColorStop(.32, palette.mid);
  metal.addColorStop(.62, palette.light);
  metal.addColorStop(1, palette.dark);
  c.shadowColor='#0009';c.shadowBlur=13;c.shadowOffsetY=7;
  c.fillStyle=silver?'#505e63':'#514329';c.beginPath();c.ellipse(0,4,r,r,0,0,Math.PI*2);c.fill();
  c.shadowBlur=0;c.shadowOffsetY=0;
  c.fillStyle=metal;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();
  c.save();c.beginPath();c.arc(0,0,r-2,0,Math.PI*2);c.clip();
  // Fine metal grain stays in the same positions across all wear levels.
  for(let i=0;i<700;i++) {c.fillStyle=i%2?'#fff1ab09':'#302b1a0c';c.fillRect((random()-.5)*252,(random()-.5)*252,.4+random()*1.1,.4+random());}
  const relief = draw => {
    c.save();c.globalAlpha=profile.relief;c.translate(.7+profile.polish*.3,1.1+profile.polish*.3);c.fillStyle=light;c.strokeStyle=light;draw();c.restore();
    c.save();c.globalAlpha=profile.relief;c.translate(-.5,-.5);c.fillStyle=dark;c.strokeStyle=dark;draw();c.restore();
    c.save();c.globalAlpha=.9-wear*.66;c.fillStyle=raised;c.strokeStyle=raised;draw();c.restore();
  };
  relief(()=>{c.lineWidth=2.6;c.beginPath();c.arc(0,0,121,0,Math.PI*2);c.stroke();});
  // Flowing border, alternating elongated leaves and berry clusters.
  if (!modern && !obverse) for(let i=0;i<8;i++) {
    c.save();c.rotate((i*45+14)*Math.PI/180);c.translate(0,-109);c.scale(.72,.72);
    relief(()=>{
      c.lineWidth=1.2;c.beginPath();c.moveTo(-23,2);c.bezierCurveTo(-4,-9,15,-8,27,5);c.stroke();
      c.beginPath();c.moveTo(-22,2);c.bezierCurveTo(-14,-3,-14,-15,1,-15);c.bezierCurveTo(-3,-6,13,-10,20,-3);c.bezierCurveTo(9,-1,1,8,-9,5);c.closePath();c.fill();
      c.beginPath();c.moveTo(-16,1);c.quadraticCurveTo(-1,-5,13,-4);c.stroke();
      c.beginPath();c.moveTo(19,2);c.lineTo(14,11);c.stroke();
      for(const [x,y,size] of [[9,10,3.2],[16,11,3.2],[22,9,2.8],[12,17,3.1],[19,17,3],[15,23,2.8]]){c.beginPath();c.arc(x,y,size,0,Math.PI*2);c.fill();}
    });c.restore();
  }
  c.textAlign='center';c.textBaseline='alphabetic';
  if (obverse && modern) {
    if(item.value===1) paintHryvniaPortrait(c,item,relief);
    else paintLaterHryvniaPortrait(c,item,relief);
  } else if (obverse) {
    relief(()=>{
      c.font='bold 26px Georgia,serif';c.fillText('Україна',0,-80,124);
      c.font='bold 24px Georgia,serif';c.fillText(String(item.year),0,106,96);
      c.save();c.translate(0,-3);c.scale(1,.86);
      // Shield and stylized trident based on the 25-kopiyok specimen.
      c.lineWidth=3.5;c.lineJoin='round';
      c.beginPath();c.moveTo(-51,-66);c.lineTo(51,-66);c.lineTo(51,62);c.quadraticCurveTo(24,81,0,87);c.quadraticCurveTo(-24,81,-51,62);c.closePath();c.stroke();
      c.beginPath();c.moveTo(0,-58);c.bezierCurveTo(-14,-35,3,-22,-3,3);c.lineTo(-17,34);c.lineTo(0,67);c.lineTo(17,34);c.lineTo(3,3);c.bezierCurveTo(-3,-22,14,-35,0,-58);c.closePath();c.stroke();
      for(const sign of [-1,1]) {
        c.save();c.scale(sign,1);
        c.beginPath();c.moveTo(0,51);c.lineTo(36,51);c.lineTo(36,-49);c.bezierCurveTo(14,-29,15,-11,19,3);c.bezierCurveTo(42,19,13,31,0,25);c.stroke();
        // Wheat ears above an oak branch on either side of the shield.
        c.lineWidth=2;c.beginPath();c.moveTo(42,84);c.quadraticCurveTo(100,74,85,-13);c.stroke();
        for(let j=0;j<5;j++) {
          const y=55-j*14,x=82-j*1.2;
          c.beginPath();c.ellipse(x-7,y,7,13,-.65,0,Math.PI*2);c.fill();
          c.beginPath();c.ellipse(x+8,y-7,6,12,.65,0,Math.PI*2);c.fill();
        }
        for(let j=0;j<4;j++) {
          const y=-13-j*9;c.beginPath();c.ellipse(80,y,3,6,-.6,0,Math.PI*2);c.ellipse(89,y-3,3,6,.6,0,Math.PI*2);c.fill();
        }
        for(let j=0;j<5;j++){c.beginPath();c.moveTo(76+j*4,-38);c.lineTo(76+j*4,-57);c.stroke();}
        c.restore();
      }
      c.restore();
    });
  } else if (modern) {
    // Denomination face of the 2004/2018 hryvnia family: separate scroll ornament.
    relief(()=>{
      for(const side of [-1,1]) {
        c.save();c.scale(side,1);c.lineWidth=3;
        c.beginPath();c.moveTo(48,-76);c.bezierCurveTo(114,-97,121,-17,98,15);c.bezierCurveTo(78,44,124,60,76,88);c.stroke();
        for(let j=0;j<5;j++){const y=-61+j*31;c.beginPath();c.ellipse(99-Math.abs(j-2)*5,y,9,17,-.5,0,Math.PI*2);c.stroke();}
        c.restore();
      }
      c.font='bold 21px Georgia,serif';c.fillText('УКРАЇНА',0,-53,126);
      c.font='bold 99px Georgia,serif';c.fillText(String(item.value),0,35,item.value===10?132:95);
      c.font='bold 25px Georgia,serif';c.fillText(item.unit.toUpperCase(),0,68,135);
      c.font='18px Georgia,serif';c.fillText(String(item.year),0,100,80);
      // Small stylized trident, drawn as paths to avoid missing font glyphs.
      c.lineWidth=2.2;c.beginPath();c.moveTo(0,-114);c.lineTo(0,-81);c.moveTo(-13,-109);c.lineTo(-13,-86);c.lineTo(13,-86);c.lineTo(13,-109);c.moveTo(-13,-103);c.quadraticCurveTo(0,-99,0,-81);c.quadraticCurveTo(0,-99,13,-103);c.stroke();
    });
  } else {
    relief(()=>{
      c.font='bold '+(item.value<10?116:108)+'px Georgia,serif';c.fillText(String(item.value),0,20,item.value<10?88:132);
      c.font='bold '+(hryvnia?26:27)+'px Georgia,serif';c.fillText(item.unit,0,60,128);
    });
  }
  paintWear(c, item, condition, seed);
  c.save();c.globalAlpha=profile.polish;
  {
    c.lineWidth=2;c.strokeStyle=silver?'#f6fcff':'#fff2bb';
    c.beginPath();c.arc(0,0,121,Math.PI*1.04,Math.PI*1.66);c.stroke();
    c.lineWidth=1.3;c.beginPath();c.arc(0,0,120,.05,.66);c.stroke();
    // Small specular highlights stay on the rim, away from the lettering.
    for (const [x,y] of [[-86,-84],[102,61]]) {
      const glint=c.createRadialGradient(x,y,0,x,y,9);glint.addColorStop(0,'#ffffefee');glint.addColorStop(.2,'#fff8ca88');glint.addColorStop(1,'#fff8ca00');
      c.fillStyle=glint;c.fillRect(x-9,y-9,18,18);
    }
  }
  c.restore();c.restore();c.restore();
}

export function coinMarkup(type, condition, className='coin-thumb', side=0) {
  return `<canvas class="${className}" width="1" height="1" data-coin-art="${type}" data-condition="${condition}" data-side="${side}" role="img" aria-label="${types[type].denom}, стан ${condition} зі 100"></canvas>`;
}
const thumbnails=createLazyThumbnails({
  selector:'canvas[data-coin-art]',
  key:canvas=>canvas.dataset.coinArt+':'+canvas.dataset.condition+':'+canvas.dataset.side+':'+coinFaceImageKey(types[Number(canvas.dataset.coinArt)],Number(canvas.dataset.side)),
  paint:canvas=>{
    // CSS reserves the final footprint; allocate the bitmap only on first use.
    if(canvas.width!==260)canvas.width=260;
    if(canvas.height!==260)canvas.height=260;
    const c=canvas.getContext('2d');c.clearRect(0,0,260,260);c.save();c.translate(130,128);c.scale(.94,.94);
    paintUkrainianCoin(c,types[Number(canvas.dataset.coinArt)],Number(canvas.dataset.condition),Number(canvas.dataset.side));c.restore();
  },
});
export function renderCoinThumbnails() { thumbnails.refresh(); }
onCoinImagesReady(thumbnails.invalidate);

// Schematic edge inspection, enlarged thickness for readability; sector reeding.
export function coinEdgeType(item) { return coinEdgeSpec(item).kind; }
export function paintCoinEdge(c, condition=75, item={value:25,material:'yellow'}) {
  const silver=item.material!=='yellow', edge=coinEdgeType(item);
  const tone=(gold,white)=>silver?white:gold;
  const wear=1-Math.max(0,Math.min(100,condition))/100, perfect=condition===100;
  c.save();c.rotate(-.13);
  const metal=c.createLinearGradient(0,-24,0,24);
  metal.addColorStop(0,perfect?tone('#fff0b3','#f5fcff'):tone('#d4bd76','#cdd7d9'));metal.addColorStop(.22,perfect?tone('#f5d47b','#dce7eb'):tone('#a08b4b','#94a1a6'));
  metal.addColorStop(.55,perfect?tone('#a88130','#7e919b'):tone('#6c5c32','#59686e'));metal.addColorStop(.82,perfect?tone('#edd18c','#e5eff3'):tone('#ad9656','#acb9be'));metal.addColorStop(1,tone('#514326','#445057'));
  c.shadowColor='#0009';c.shadowBlur=15;c.shadowOffsetY=12;
  c.beginPath();c.moveTo(-120,-16);c.quadraticCurveTo(0,-29,120,-16);c.quadraticCurveTo(131,0,120,16);c.quadraticCurveTo(0,29,-120,16);c.quadraticCurveTo(-131,0,-120,-16);c.closePath();c.fillStyle=metal;c.fill();
  c.shadowBlur=0;c.shadowOffsetY=0;c.save();c.clip();
  for(let x=-119;edge!=='smooth' && edge!=='lettered' && x<120;x+=4) {
    // Alternating reeded and smooth sectors; not a die-variety tooth count.
    if(edge==='sector' && Math.floor((x+120)/36)%2===1)continue;
    const bow=5*(1-(x/126)**2);c.lineWidth=1.4;c.strokeStyle=`rgba(38,30,15,${.6-wear*.3})`;
    c.beginPath();c.moveTo(x,-16-bow);c.lineTo(x,16+bow);c.stroke();
    c.strokeStyle=`rgba(${silver ? "231,244,251" : "255,235,161"},${.75-wear*.5})`;c.lineWidth=.8;c.beginPath();c.moveTo(x+1.2,-16-bow);c.lineTo(x+1.2,16+bow);c.stroke();
  }
  if(edge==='lettered') {
    c.textAlign='center';c.textBaseline='middle';c.font='bold 16px Georgia,serif';
    const text=coinEdgeSpec(item).text;
    c.fillStyle=tone('#f7dfa0','#e1edf0');c.fillText(text,.6,1,215);
    c.fillStyle=tone('#5b461d','#42535c');c.fillText(text,0,0,215);
  }
  if(!perfect) for(let i=0;i<42;i++) {const x=Math.sin(i*13.4)*120,y=Math.cos(i*7.9)*20;c.fillStyle=`rgba(48,48,27,${wear*.45})`;c.beginPath();c.ellipse(x,y,2+wear*4,1+wear*3,i,0,Math.PI*2);c.fill();}
  c.fillStyle=`rgba(55,48,30,${wear*.3})`;c.fillRect(-130,-30,260,60);c.restore();
  c.lineWidth=perfect?2:1.2;c.strokeStyle=perfect?tone('#fff1ba','#f5fcff'):tone('#cab574','#cbd9de');c.beginPath();c.moveTo(-118,-16);c.quadraticCurveTo(0,-29,118,-16);c.stroke();
  c.restore();
}

