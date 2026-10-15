import { t as localize } from './i18n.js?v=0.53.0';
import { detectorSettings } from '../data/gear.js?v=0.53.0';
import { recordReading } from './detector-controls.js?v=0.53.0';
import { sampleSignal, nearestTarget } from './detector.js?v=0.53.0';
import { recordDig } from './progression.js?v=0.53.0';
import { findChallenge } from './career.js?v=0.53.0';
import { toggleFieldMark } from './field-notes.js?v=0.53.0';
// search responsibilities for Last Signal.
import { depthLevels } from '../data/balance.js?v=0.53.0';
import { beep } from './audio.js?v=0.53.0';
import { $ } from './dom.js?v=0.53.0';
import { openExcavation } from './excavation.js?v=0.53.0';
import { canvas, draw } from './graphics/field.js?v=0.53.0';
import { digCost, minDig } from './rules.js?v=0.53.0';
import { s, save } from './storage.js?v=0.53.0';
import { busy, render, renderDetector } from './ui.js?v=0.53.0';
let moveFrame = 0, pointerId = null, pointerAnchor = null;
function renderMovement() {
  if (moveFrame) return;
  moveFrame = requestAnimationFrame(() => {
    moveFrame = 0;
    if (s.atCamp || $('search').hidden || busy()||document.visibilityState==='hidden') return;
    const reading=signal();
    recordReading(reading,s.objects);
    renderDetector(reading);
    draw(reading);
    beep(reading);
  });
}
export function digInfo(n=signal(),underCoil=nearest()) {
  // Cost and recovered item must refer to the same physical hole even when
  // a stronger neighbouring signal dominates the detector display.
  const target=underCoil.obj&&underCoil.d<=.035?underCoil.obj:n.power>35?n.obj:null,
    info = target ? depthLevels[target.depth] : {
      name: 'Глибина невідома · пробна ямка',
      cost: 10
    };
  return {
    ...info,
    cost: digCost(info.cost)
  };
}
export function signal() { return sampleSignal(s.objects,s.x,s.y,s.level,{...detectorSettings(s),soil:s.progress?.active?.condition||0}); }
export function nearest() { return nearestTarget(s.objects,s.x,s.y); }
export function move(e) {
  if (s.atCamp || busy()||$('search').hidden||document.visibilityState==='hidden') return;
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const precise=detectorSettings(s).mode==='pinpoint'&&pointerAnchor;
  s.x = Math.max(.02, Math.min(.98, precise?pointerAnchor.x+(e.clientX-pointerAnchor.clientX)/r.width*.45:(e.clientX-r.left)/r.width));
  s.y = Math.max(.02, Math.min(.98, precise?pointerAnchor.y+(e.clientY-pointerAnchor.clientY)/r.height*.45:(e.clientY-r.top)/r.height));
  renderMovement();
}
export let dragging = false;
export function dig() {
  if(s.atCamp||busy())return;
  const n = nearest(),info = digInfo(signal(),n);
  if (s.energy < info.cost) return;
  const spent = info.cost;
  recordDig(!!n.obj && n.d <= .035);
  s.energy = Math.round((s.energy - spent) * 10) / 10;
  s.holes.push({
    x: s.x,
    y: s.y
  });
  if (n.obj && n.d <= .035) {
    n.obj.dug = true;
    s.pending = {
      type: n.obj.type,
      condition: n.obj.condition,
      spent
    };
    const challenge=findChallenge(n.obj);if(challenge)s.pending.careerFind=challenge;
    save();
    render();
    openExcavation();
  } else {
    $('log').textContent = localize('Порожня ямка. Витрачено ' + spent + ' сил. Проведи котушкою навхрест і знайди центр відгуку.');
    save();
    render();
  }
}
export function initSearch() {
  const stop=()=>{
    if(moveFrame)cancelAnimationFrame(moveFrame);moveFrame=0;
    const pointer=pointerId;dragging=false;pointerId=null;pointerAnchor=null;
    if(pointer!==null&&canvas.hasPointerCapture?.(pointer))canvas.releasePointerCapture(pointer);
  };
  window.addEventListener('pagehide',stop);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stop();});
  for (let i = 0; i < 20; i++) $('bars').appendChild(document.createElement('i'));
  canvas.addEventListener('pointerdown', e => {
    if (s.atCamp || busy() || dragging || $('search').hidden || document.visibilityState==='hidden' || (e.button !== undefined && e.button !== 0)) return;
    dragging = true;
    pointerId = e.pointerId;
    pointerAnchor={x:s.x,y:s.y,clientX:e.clientX,clientY:e.clientY};
    canvas.setPointerCapture(e.pointerId);
    move(e);
  });
  canvas.addEventListener('pointermove', e => {
    if ((dragging && e.pointerId === pointerId) || (!dragging && e.pointerType === 'mouse')) move(e);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, e => {
    if (e.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
    pointerAnchor = null;
    save();
  });
  canvas.addEventListener('keydown', e => {
    if (s.atCamp || busy()||$('search').hidden||document.visibilityState==='hidden') return;
    if(e.code==='KeyM'||e.key==='m'||e.key==='M'){e.preventDefault();if(!e.repeat)toggleFieldMark();return;}
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
      e.preventDefault();
      if (e.key === ' ') {
        dig();
        return;
      }
      const step=detectorSettings(s).mode==='pinpoint'?.005:.015;
      s.x = Math.max(.02, Math.min(.98, s.x + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0)));
      s.y = Math.max(.02, Math.min(.98, s.y + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0)));
      const reading=signal();
      recordReading(reading,s.objects);
      renderDetector(reading);
      draw(reading);
      beep(reading);
    }
  });
  $('dig').onclick = dig;
}

