import { recordDig } from './progression.js?v=0.32.0';
// search responsibilities for Last Signal.
import { depthLevels } from '../data/balance.js?v=0.32.0';
import { beep } from './audio.js?v=0.32.0';
import { $ } from './dom.js?v=0.32.0';
import { openExcavation } from './excavation.js?v=0.32.0';
import { canvas, draw } from './graphics/field.js?v=0.32.0';
import { digCost, minDig } from './rules.js?v=0.32.0';
import { s, save } from './storage.js?v=0.32.0';
import { busy, render, renderDetector } from './ui.js?v=0.32.0';
let moveFrame = 0, pointerId = null;
function renderMovement() {
  if (moveFrame) return;
  moveFrame = requestAnimationFrame(() => {
    moveFrame = 0;
    if (s.atCamp || $('search').hidden || busy()) return;
    renderDetector();
    draw();
  });
}
export function digInfo() {
  const n = signal(),
    info = n.obj && n.power > 35 ? depthLevels[n.obj.depth] : {
      name: 'Глибина невідома · пробна ямка',
      cost: 10
    };
  return {
    ...info,
    cost: digCost(info.cost)
  };
}
export function nearest() {
  let obj = null,
    d = Infinity;
  for (const o of s.objects) {
    if (o.dug) continue;
    const dd = Math.hypot(o.x - s.x, (o.y - s.y) * 720 / 880);
    if (dd < d) {
      d = dd;
      obj = o;
    }
  }
  return {
    obj,
    d
  };
}
export function signal() {
  const n = nearest();
  return {
    ...n,
    power: Math.max(0, Math.round(100 * (1 - n.d / (.205 * (1 + (s.level - 1) * .5 / 99)))))
  };
}
export function move(e) {
  if (s.atCamp || busy()) return;
  const r = canvas.getBoundingClientRect();
  if (!r.width || !r.height) return;
  s.x = Math.max(.02, Math.min(.98, (e.clientX - r.left) / r.width));
  s.y = Math.max(.02, Math.min(.98, (e.clientY - r.top) / r.height));
  renderMovement();
  beep(signal().power);
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
    $('log').textContent = 'Порожня ямка. Витрачено ' + spent + ' сил. Шукай самий пік сигналу.';
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
      s.x = Math.max(.02, Math.min(.98, s.x + (e.key === 'ArrowRight' ? .015 : e.key === 'ArrowLeft' ? -.015 : 0)));
      s.y = Math.max(.02, Math.min(.98, s.y + (e.key === 'ArrowDown' ? .015 : e.key === 'ArrowUp' ? -.015 : 0)));
      renderDetector();
      draw();
      beep(signal().power);
    }
  });
  $('dig').onclick = dig;
}

