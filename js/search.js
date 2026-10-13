import { detectorSettings } from '../data/gear.js?v=0.35.0';
import { recordReading } from './detector-controls.js?v=0.35.0';
import { sampleSignal } from './detector.js?v=0.35.0';
import { recordDig } from './progression.js?v=0.35.0';
// search responsibilities for Last Signal.
import { depthLevels } from '../data/balance.js?v=0.35.0';
import { beep } from './audio.js?v=0.35.0';
import { $ } from './dom.js?v=0.35.0';
import { openExcavation } from './excavation.js?v=0.35.0';
import { canvas, draw } from './graphics/field.js?v=0.35.0';
import { digCost, minDig } from './rules.js?v=0.35.0';
import { s, save } from './storage.js?v=0.35.0';
import { busy, render, renderDetector } from './ui.js?v=0.35.0';
let moveFrame = 0, pointerId = null, pointerAnchor = null;
function renderMovement() {
  if (moveFrame) return;
  moveFrame = requestAnimationFrame(() => {
    moveFrame = 0;
    if (s.atCamp || $('search').hidden || busy()) return;
    recordReading(signal(),s.objects);
    renderDetector();
    draw();
  });
}
export function digInfo() {
  const n = signal(),
    info = n.obj && (n.pinpoint || n.power > 35) ? depthLevels[n.obj.depth] : {
      name: 'Глибина невідома · пробна ямка',
      cost: 10
    };
  return {
    ...info,
    cost: digCost(info.cost)
  };
}
export function signal() { return sampleSignal(s.objects,s.x,s.y,s.level,{...detectorSettings(s),soil:s.progress?.active?.condition||0}); }
export function nearest() { const {obj,d}=signal(); return {obj,d}; }
export function move(e) {
  if (s.atCamp || busy()) return;
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const precise=detectorSettings(s).mode==='pinpoint'&&pointerAnchor;
  s.x = Math.max(.02, Math.min(.98, precise?pointerAnchor.x+(e.clientX-pointerAnchor.clientX)/r.width*.45:(e.clientX-r.left)/r.width));
  s.y = Math.max(.02, Math.min(.98, precise?pointerAnchor.y+(e.clientY-pointerAnchor.clientY)/r.height*.45:(e.clientY-r.top)/r.height));
  renderMovement();
  beep(signal());
}
export let dragging = false;
export function dig() {
  const info = digInfo();
  if (s.atCamp || s.energy < info.cost || busy()) return;
  const n = nearest(),
    spent = info.cost;
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
    save();
    render();
    openExcavation();
  } else {
    $('log').textContent = 'Порожня ямка. Витрачено ' + spent + ' сил. Проведи котушкою навхрест і знайди центр відгуку.';
    save();
    render();
  }
}
export function initSearch() {
  for (let i = 0; i < 20; i++) $('bars').appendChild(document.createElement('i'));
  canvas.addEventListener('pointerdown', e => {
    if (s.atCamp || busy() || dragging || (e.button !== undefined && e.button !== 0)) return;
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
    if (s.atCamp || busy()) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
      e.preventDefault();
      if (e.key === ' ') {
        dig();
        return;
      }
      const step=detectorSettings(s).mode==='pinpoint'?.005:.015;
      s.x = Math.max(.02, Math.min(.98, s.x + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0)));
      s.y = Math.max(.02, Math.min(.98, s.y + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0)));
      recordReading(signal(),s.objects);
      renderDetector();
      draw();
      beep(signal());
    }
  });
  $('dig').onclick = dig;
}

