import { currentEnvironment, environmentKey } from '../../data/environment.js?v=0.51.0';
import { paintEnvironmentGround } from './environment-art.js?v=0.51.0';
import { activeSite } from '../../data/atlas.js?v=0.51.0';
import { createSiteLayout } from '../../data/site-layout.js?v=0.51.0';
import { paintSiteTerrain } from './site-terrain.js?v=0.51.0';
import { drawDetector } from './detector-art.js?v=0.51.0';
// field responsibilities for Last Signal.
import { $ } from '../dom.js?v=0.51.0';
import { signal } from '../search.js?v=0.51.0';
import { s } from '../storage.js?v=0.51.0';
import { currentLocation } from '../world.js?v=0.51.0';
export const canvas = $('field'),
  ctx = canvas.getContext('2d');
export function paintTerrain(ctx) {
  paintBaseTerrain(ctx);paintEnvironmentGround(ctx,currentEnvironment(s),s.site?.seed||1);
}
function paintBaseTerrain(ctx) {
  if(s.site){paintSiteTerrain(ctx,currentLocation(),createSiteLayout(currentLocation().terrain,s.site.seed));return;}
  const loc = currentLocation(),
    w = 880,
    h = 720;
  ctx.fillStyle = '#304331';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(380, 300, 50, 420, 360, 590);
  g.addColorStop(0, loc.ground[0]);
  g.addColorStop(1, loc.ground[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  let seed = 47 + (activeSite(s)?.createdDay || s.day) * 101 + (s.location + 1) * 317;
  function rand() {
    seed = seed * 16807 % 2147483647;
    return seed / 2147483647;
  }
  for (let i = 0; i < (loc.terrain === 'beach' ? 450 : 760); i++) {
    const x = rand() * w,
      y = rand() * h;
    ctx.strokeStyle = i % 3 ? '#8a99652e' : '#152e3270';
    ctx.lineWidth = 1 + rand() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + rand() * 10 - 5, y - 4 - rand() * 12);
    ctx.stroke();
  } // Terrain is decoration only: it never reveals item positions.
  ctx.save();
  if (loc.terrain === 'road') {
    ctx.fillStyle = '#2c3633';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(125, 0);
    ctx.lineTo(45, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d0c5a877';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(112, 0);
    ctx.lineTo(32, h);
    ctx.stroke();
  }
  if (loc.terrain === 'field') {
    ctx.strokeStyle = '#30271944';
    ctx.lineWidth = 16;
    for (let y = -200; y < h + 200; y += 90) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y + 200);
      ctx.stroke();
    }
  }
  if (loc.terrain === 'beach') {
    ctx.fillStyle = '#437c7e';
    ctx.beginPath();
    ctx.moveTo(760, 0);
    ctx.bezierCurveTo(820, 220, 710, 440, 770, 720);
    ctx.lineTo(w, h);
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#cbdab688';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(748, 0);
    ctx.bezierCurveTo(808, 220, 698, 440, 758, 720);
    ctx.stroke();
  }
  if (loc.terrain === 'fair') {
    ctx.strokeStyle = '#b49c6c44';
    ctx.lineWidth = 46;
    ctx.beginPath();
    ctx.moveTo(0, 520);
    ctx.lineTo(880, 200);
    ctx.moveTo(300, 0);
    ctx.lineTo(520, 720);
    ctx.stroke();
    ctx.strokeStyle = '#736653';
    ctx.lineWidth = 7;
    for (const p of [[50, 95], [730, 540], [110, 600]]) {
      ctx.strokeRect(p[0], p[1], 65, 35);
    }
  }
  if (loc.terrain === 'trail') {
    ctx.strokeStyle = '#a2926744';
    ctx.lineWidth = 80;
    ctx.beginPath();
    ctx.moveTo(150, 0);
    ctx.bezierCurveTo(680, 180, 160, 500, 650, 720);
    ctx.stroke();
    ctx.fillStyle = '#172f2766';
    for (const p of [[20, 50], [810, 150], [60, 620]]) {
      ctx.beginPath();
      ctx.arc(p[0], p[1], 95, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (loc.terrain === 'forest' || loc.terrain === 'orchard') {
    const points=loc.terrain==='orchard'?[[90,100],[390,90],[750,120],[80,600],[390,640],[750,590]]:[[20,90],[820,60],[850,610],[30,690]];
    for(const [x,y] of points){
      ctx.fillStyle='#132b2266';ctx.beginPath();ctx.ellipse(x+30,y+40,85,45,.4,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#9d997148';ctx.lineWidth=4;
      for(let i=0;i<5;i++){const a=i*1.26;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+Math.cos(a)*35,y+Math.sin(a)*25,x+Math.cos(a)*72,y+Math.sin(a)*53);ctx.stroke();}
      ctx.fillStyle='#263e2b';ctx.beginPath();ctx.arc(x,y,loc.terrain==='forest'?68:38,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#85966155';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x-8,y-5,loc.terrain==='forest'?53:26,3.5,5.9);ctx.stroke();
    }
  }
  if (loc.terrain === 'river') {
    ctx.fillStyle='#376b6e';ctx.beginPath();ctx.moveTo(0,555);ctx.bezierCurveTo(290,490,530,670,880,545);ctx.lineTo(880,720);ctx.lineTo(0,720);ctx.closePath();ctx.fill();
    ctx.strokeStyle='#bfd2b965';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,550);ctx.bezierCurveTo(290,485,530,665,880,540);ctx.stroke();
    ctx.strokeStyle='#d7e5cf28';ctx.lineWidth=2;for(let i=0;i<22;i++){const x=rand()*880,y=620+rand()*90;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+20+rand()*50,y-3);ctx.stroke();}
  }
  ctx.restore();

  // Decorative texture is seeded by the location, never by hidden finds.
  for (let i = 0; i < 110; i++) {
    const x = rand() * w,
      y = rand() * h,
      r = 2 + rand() * 6;
    ctx.fillStyle = i % 3 ? '#17271938' : '#ddcdaa32';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * .55, rand() * 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e3d4aa22';
    ctx.lineWidth = .8;
    ctx.beginPath();
    ctx.moveTo(x - r * .4, y - r * .2);
    ctx.lineTo(x + r * .5, y - r * .3);
    ctx.stroke();
  }
  if (loc.terrain !== 'beach' && loc.terrain !== 'road') for (let i = 0; i < 95; i++) {
    const x = rand() * w,
      y = rand() * h;
    ctx.strokeStyle = i % 2 ? '#b7bd6f44' : '#182c1877';
    ctx.lineWidth = 1.4;
    for (let j = 0; j < 4; j++) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (rand() - .5) * 13, y - 7, x + (rand() - .5) * 25, y - 8 - rand() * 13);
      ctx.stroke();
    }
  }
  const shade = ctx.createRadialGradient(w * .48, h * .43, 80, w * .5, h * .5, w * .65);
  shade.addColorStop(0, '#00000000');
  shade.addColorStop(1, '#07140e88');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
}
export var terrainLayer, terrainKey;
let groundLayer,groundKey='',holesRef,holesCount=-1,marksRef;
function paintHoles(c,w,h) {
  for(const hole of s.holes){
    const x=hole.x*w,y=hole.y*h;
    c.fillStyle='#162015';c.beginPath();c.ellipse(x,y,24,15,-.2,0,Math.PI*2);c.fill();
    c.strokeStyle='#a2936466';c.lineWidth=4;c.stroke();
    c.fillStyle='#080f0b77';c.beginPath();c.ellipse(x+2,y+3,17,9,-.2,0,Math.PI*2);c.fill();
  }
}
function paintMarks(c,w,h) {
  c.save();c.font='bold 20px ui-monospace,monospace';c.textAlign='center';c.textBaseline='middle';
  for(const [index,mark] of (s.fieldMarks||[]).entries()){
    const x=mark.x*w,y=mark.y*h,cx=Math.max(18,Math.min(w-18,x)),cy=Math.max(18,Math.min(h-18,y<56?y+32:y-32));
    c.strokeStyle='#17251c';c.lineWidth=5;c.beginPath();c.moveTo(x,y);c.lineTo(cx,cy);c.stroke();
    c.strokeStyle='#dfebae';c.lineWidth=2;c.stroke();
    c.fillStyle='#dce9a6';c.beginPath();c.arc(cx,cy,16,0,Math.PI*2);c.fill();c.strokeStyle='#1b3023';c.lineWidth=3;c.stroke();
    c.fillStyle='#203322';c.fillText(String(index+1),cx,cy+1);
  }
  c.restore();
}
export function draw(n=signal()) {
  const key=environmentKey(currentEnvironment(s))+':'+s.location+':'+s.emergency+':'+(s.site?s.site.version+':'+s.site.seed:'legacy:'+(activeSite(s)?.createdDay||s.day));
  if(!terrainLayer||key!==terrainKey){
    terrainLayer=terrainLayer||document.createElement('canvas');terrainLayer.width=880;terrainLayer.height=720;
    paintTerrain(terrainLayer.getContext('2d'));terrainKey=key;
  }
  const rect=canvas.getBoundingClientRect();
  if(rect.width&&rect.height){const height=Math.round(880*rect.height/rect.width);if(canvas.height!==height)canvas.height=height;}
  const w=canvas.width,h=canvas.height,nextGroundKey=key+':'+w+':'+h;
  // Holes append; marks are replaced on each edit. Restores replace references.
  // No traversal/serialization of these lists during ordinary coil movement.
  if(!groundLayer||groundKey!==nextGroundKey||holesRef!==s.holes||holesCount!==s.holes.length||marksRef!==s.fieldMarks){
    groundLayer=groundLayer||document.createElement('canvas');groundLayer.width=w;groundLayer.height=h;
    const c=groundLayer.getContext('2d');c.drawImage(terrainLayer,0,0,w,h);paintHoles(c,w,h);paintMarks(c,w,h);
    groundKey=nextGroundKey;holesRef=s.holes;holesCount=s.holes.length;marksRef=s.fieldMarks;
  }
  ctx.drawImage(groundLayer,0,0,w,h);
  ctx.save();ctx.translate(s.x*w,s.y*h);drawDetector(ctx,s.level,n);ctx.restore();
}
