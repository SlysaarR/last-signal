import { setupInspection, clearInspection } from './coin-flip.js?v=0.52.0';
import { onCoinImagesReady } from './graphics/coin-reference.js?v=0.52.0';
import { brushMark, cleaningPercent, visitBrushSegment } from '../data/cleaning.js?v=0.52.0';
import { createSoilBrush } from './graphics/soil-brush.js?v=0.52.0';
// Soil canvas, finger cleaning, dust and reveal progress.
import { types } from '../data/items.js?v=0.52.0';
import { $ } from './dom.js?v=0.52.0';
import { drawArtifact, seededArt } from './graphics/artifacts.js?v=0.52.0';
import { openPacking } from './packing.js?v=0.52.0';
import { s, save } from './storage.js?v=0.52.0';
export const soil = $('soil'),
  dirt = soil.getContext('2d'),
  art = $('artifact').getContext('2d');
export let swept = new Set(),
  brushDown = false,
  lastBrush = null,
  phaseDone = false;
let brushPointer = null;
const soilBrush=createSoilBrush();
let cleaningItem=null,cleaningBase=[],brushFrame=0,brushQueue=[],newMarks=[],brushMarks=new Set(),cellsDirty=false,lastProgress=-1,dustPoint=null;
export function paintSoil() {
  dirt.globalCompositeOperation = 'source-over';
  dirt.clearRect(0, 0, 600, 500);
  const g = dirt.createRadialGradient(290, 220, 30, 300, 250, 400);
  g.addColorStop(0, '#91714b');
  g.addColorStop(.6, '#59442e');
  g.addColorStop(1, '#251e17');
  dirt.fillStyle = g;
  dirt.fillRect(0, 0, 600, 500);
  const rand = seededArt(71 + (s.pending?.type || 0) * 23 + s.day);
  for (let i = 0; i < 350; i++) {
    const x = rand() * 600,
      y = rand() * 500,
      r = 2 + rand() * 13;
    dirt.fillStyle = i % 2 ? '#271e1540' : '#bc996642';
    dirt.beginPath();
    dirt.ellipse(x, y, r, r * .65, rand() * 6, 0, Math.PI * 2);
    dirt.fill();
    dirt.strokeStyle = '#dcc08a18';
    dirt.lineWidth = .7;
    dirt.stroke();
  }
  for (let i = 0; i < 4500; i++) {
    dirt.fillStyle = i % 3 ? '#0c100c24' : '#f3dcad2e';
    const x = rand() * 600,
      y = rand() * 500;
    dirt.fillRect(x, y, .5 + rand() * 2, .5 + rand() * 2);
  }
  for (let i = 0; i < 12; i++) {
    const x = rand() * 600,
      y = rand() * 500;
    dirt.strokeStyle = '#31271b66';
    dirt.lineWidth = 1 + rand() * 2;
    dirt.beginPath();
    dirt.moveTo(x, y);
    dirt.bezierCurveTo(x + 25, y + 20, x - 20, y + 50, x + 10, y + 80);
    dirt.stroke();
  }
  dirt.globalCompositeOperation = 'destination-out';
}
export let dustParticles = [],
  dustFrame = 0,
  dustLast = 0;
export function scatterDust(x, y) {
  if (document.visibilityState==='hidden'||matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rand = seededArt(Math.round(x * 17 + y * 31 + performance.now()));
  for (let i = 0; i < 3; i++) dustParticles.push({
    x,
    y,
    vx: (rand() - .5) * 150,
    vy: -25 - rand() * 80,
    life: 1,
    r: 1 + rand() * 3
  });
  dustParticles = dustParticles.slice(-55);
  if (!dustFrame) {
    dustLast = performance.now();
    dustFrame = requestAnimationFrame(animateDust);
  }
}
export function animateDust(now) {
  const c = $('dustOverlay').getContext('2d'),
    dt = Math.min(.04, (now - dustLast) / 1000);
  dustLast = now;
  c.clearRect(0, 0, 600, 500);
  if (!$('excavate').open||document.visibilityState==='hidden') {
    dustParticles = [];
    dustFrame = 0;
    return;
  }
  dustParticles = dustParticles.filter(p => p.life > 0);
  for (const p of dustParticles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 180 * dt;
    p.life -= dt * 2.5;
    c.fillStyle = 'rgba(213,185,128,' + Math.max(0, p.life * .7) + ')';
    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    c.fill();
  }
  dustFrame = dustParticles.length ? requestAnimationFrame(animateDust) : 0;
}
export function openExcavation() {
  if (!s.pending) return;
  stopBrush(false);stopDust();cleaningItem=s.pending;
  clearInspection($('artifact'));
  $('excFlip').hidden = true;
  $('artifact').onclick = null;
  $('artifact').onkeydown = null;
  $('artifact').tabIndex = -1;
  $('artifact').setAttribute('role', 'img');
  $('artifact').setAttribute('aria-label', 'Предмет під шаром ґрунту');
  soil.onclick = null;
  drawArtifact(s.pending.type);
  swept = new Set(s.pending.cleanedCells || []);
  cleaningBase=s.pending.cleaning?.base||[...swept];
  brushMarks=new Set(s.pending.cleaning?.marks||[]);lastProgress=-1;
  phaseDone = false;
  brushDown = false;
  brushPointer = null;
  lastBrush = null;
  $('excavate').querySelector('.excavation').classList.remove('done');
  $('excPercent').textContent = '0%';
  $('excStage').textContent = 'РОЗКОПКА / ОЧИЩЕННЯ';
  $('excTitle').textContent = 'Щось є під землею';
  $('excHint').textContent = 'Проведи пальцем по центру, щоб обережно відкрити предмет.';
  $('excProgress').value = 0;
  $('excStatus').textContent = 'Землю прибрано: 0%';
  $('excSkip').hidden = false;
  $('excNext').disabled = true;
  $('excNext').textContent = 'Спочатку прибери землю';
  paintSoil();
  soilBrush.restore(dirt,s.pending.cleaning,[...swept]);
  updateCleaning();
  if (!$('excavate').open) $('excavate').showModal();
}
// The dirt is on its own canvas. Loading the specimen may redraw the metal but
// must never clear soil, reset a brush stroke or change saved cleaning progress.
onCoinImagesReady(()=>{if(s.pending && $('excavate').open && !phaseDone)drawArtifact(s.pending.type);});
function stampAt(x,y) {
  if(cleaningPercent(swept.size)===100)return false;
  const mark=brushMark(x,y);
  if(!brushMarks.has(mark)){brushMarks.add(mark);newMarks.push(mark);}
  const before=swept.size;
  const firstRow=Math.max(0,Math.ceil((y-57-130)/16)),lastRow=Math.min(15,Math.floor((y+57-130)/16));
  const firstCol=Math.max(0,Math.ceil((x-57-180)/16)),lastCol=Math.min(15,Math.floor((x+57-180)/16));
  for (let row=firstRow;row<=lastRow;row++) for (let col=firstCol;col<=lastCol;col++) {
    const gx = 180 + col * 16,
      gy = 130 + row * 16;
    if ((gx-x)**2+(gy-y)**2<=57**2) swept.add(row * 16 + col);
  }
  cellsDirty ||= swept.size!==before;dustPoint={x,y};
  return cleaningPercent(swept.size)<100;
}
function currentCleaning() {return s.pending&&s.pending===cleaningItem&&!s.pending.revealed&&!phaseDone;}
function applyBrushQueue() {
  if(!currentCleaning()){brushQueue=[];return;}
  for(const point of brushQueue) {
    visitBrushSegment(lastBrush||point,point,stampAt);lastBrush=point;
    if(cleaningPercent(swept.size)===100)break;
  }
  brushQueue=[];
}
export function flushBrush() {
  if(brushFrame)cancelAnimationFrame(brushFrame);brushFrame=0;
  if(!currentCleaning()){brushQueue=[];newMarks=[];cellsDirty=false;return;}
  applyBrushQueue();
  if(!newMarks.length&&!cellsDirty)return;
  s.pending.cleanedCells=[...swept];
  if(newMarks.length) {
    s.pending.cleaning??={version:1,base:cleaningBase,marks:[]};
    s.pending.cleaning.marks.push(...newMarks);
    for(const mark of newMarks)soilBrush.paint(dirt,mark);
  }
  newMarks=[];cellsDirty=false;
  updateCleaning();
  if(dustPoint&&!phaseDone)scatterDust(dustPoint.x,dustPoint.y);
  dustPoint=null;
}
export function brushAt(x,y) {
  if(!currentCleaning())return;
  applyBrushQueue();visitBrushSegment({x,y},{x,y},stampAt);flushBrush();
}
function updateCleaning() {
  const progress = cleaningPercent(swept.size);
  if(progress===lastProgress)return;lastProgress=progress;
  $('excProgress').value = progress;
  $('excPercent').textContent = progress + '%';
  $('excStatus').textContent = progress < 35 ? 'Знімай верхній шар ґрунту.' : progress < 75 ? 'Вже видно обриси. Продовжуй очищення.' : 'Ще трохи — предмет майже відкрито.';
  if (progress === 100) {
    phaseDone = true;
    dirt.clearRect(0, 0, 600, 500);
    $('excavate').querySelector('.excavation').classList.add('done');
    $('excStage').textContent = 'ПРЕДМЕТ ВІДКРИТО';
    $('excTitle').textContent = types[s.pending.type].name;
    $('excHint').textContent = 'Оглянь знахідку та виріши, чи взяти її із собою.';
    $('excNext').disabled = false;
    $('excNext').textContent = 'Оглянути знахідку';
    $('excStatus').textContent = 'Очищення завершено. Обертай знахідку пальцем.';
    $('excSkip').hidden = true;
    setupInspection($('artifact'), $('excFlip'), s.pending.type, s.pending.condition, false);
    save();
  }
}
export function brushMove(e) {
  if(!currentCleaning()||document.visibilityState==='hidden')return;
  const r = soil.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const p = {
      x: (e.clientX - r.left) * 600 / r.width,
      y: (e.clientY - r.top) * 500 / r.height
    };
  if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
  brushQueue.push(p);
  // A burst cannot retain an unbounded event list. Geometry has no DOM writes.
  if(brushQueue.length>=128)applyBrushQueue();
  if(!brushFrame)brushFrame=requestAnimationFrame(flushBrush);
}
function stopBrush(flush=true) {
  if(flush)flushBrush();
  if(brushFrame)cancelAnimationFrame(brushFrame);
  brushFrame=0;brushQueue=[];newMarks=[];cellsDirty=false;dustPoint=null;
  const pointer=brushPointer;brushDown=false;brushPointer=null;lastBrush=null;
  if(pointer!==null&&soil.hasPointerCapture?.(pointer))soil.releasePointerCapture(pointer);
}
function stopDust() {
  if(dustFrame)cancelAnimationFrame(dustFrame);
  dustFrame=0;dustParticles=[];$('dustOverlay').getContext('2d').clearRect(0,0,600,500);
}
export function collectPending() {
  if (!s.pending) return;
  stopBrush();stopDust();
  s.pending.revealed = true;
  delete s.pending.cleanedCells;
  delete s.pending.cleaning;
  save();
  $('excavate').close();
  openPacking();
}
export function initExcavation() {
  $('excavate').addEventListener('close',()=>{stopBrush();stopDust();clearInspection($('artifact'));});
  // Registered before the entry point's persistence handlers: never lose the
  // final queued segment when the page goes away before its animation frame.
  window.addEventListener('pagehide',()=>{stopBrush();stopDust();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){stopBrush();stopDust();}});
  soil.addEventListener('pointerdown', e => {
    if (!currentCleaning()||document.visibilityState==='hidden'||(e.button!==undefined&&e.button!==0)) return;
    if (brushDown) return;
    brushDown = true;
    brushPointer = e.pointerId;
    soil.setPointerCapture(e.pointerId);
    lastBrush = null;
    brushMove(e);
  });
  soil.addEventListener('pointermove', e => {
    if (brushDown && brushPointer === e.pointerId) brushMove(e);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) soil.addEventListener(event, e => {
    if (brushPointer !== e.pointerId) return;
    const wasCleaning = brushDown;
    if(event==='pointerup'&&wasCleaning)brushMove(e);
    stopBrush();
    if (wasCleaning) save();
  });
  $('excNext').onclick = () => {
    if (phaseDone && s.pending) collectPending();
  };
  $('excSkip').onclick = collectPending;
  $('excavate').addEventListener('cancel', e => e.preventDefault());
}

