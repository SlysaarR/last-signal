// Soil canvas, finger cleaning, dust and reveal progress.
import { types } from '../data/items.js?v=0.19.0';
import { $ } from './dom.js?v=0.19.0';
import { drawArtifact, seededArt } from './graphics/artifacts.js?v=0.19.0';
import { openPacking } from './packing.js?v=0.19.0';
import { s, save } from './storage.js?v=0.19.0';
export const soil = $('soil'),
  dirt = soil.getContext('2d'),
  art = $('artifact').getContext('2d');
export let swept = new Set(),
  brushDown = false,
  lastBrush = null,
  phaseDone = false;
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
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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
  if (!$('excavate').open) {
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
  drawArtifact(s.pending.type);
  swept = new Set();
  phaseDone = false;
  brushDown = false;
  lastBrush = null;
  $('excavate').querySelector('.excavation').classList.remove('done');
  $('excPercent').textContent = '0%';
  $('excStage').textContent = 'РОЗКОПКА / ОЧИЩЕННЯ';
  $('excTitle').textContent = 'Щось є під землею';
  $('excHint').textContent = 'Проведи пальцем по центру, щоб обережно відкрити предмет.';
  $('excProgress').value = 0;
  $('excStatus').textContent = 'Землю прибрано: 0%';
  $('excNext').disabled = true;
  $('excNext').textContent = 'Спочатку прибери землю';
  paintSoil();
  if (!$('excavate').open) $('excavate').showModal();
}
export function brushAt(x, y) {
  if (!s.pending || phaseDone) return;
  const radius = 64,
    g = dirt.createRadialGradient(x, y, 42, x, y, radius);
  g.addColorStop(0, '#000');
  g.addColorStop(.75, '#000');
  g.addColorStop(1, '#0000');
  dirt.fillStyle = g;
  dirt.beginPath();
  dirt.arc(x, y, radius, 0, Math.PI * 2);
  dirt.fill();
  scatterDust(x, y);
  for (let row = 0; row < 16; row++) for (let col = 0; col < 16; col++) {
    const gx = 180 + col * 16,
      gy = 130 + row * 16;
    if (Math.hypot(gx - x, gy - y) <= radius - 7) swept.add(row * 16 + col);
  }
  const progress = Math.min(100, Math.round(swept.size / 256 / .78 * 100));
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
    $('excStatus').textContent = 'Очищення завершено.';
  }
}
export function brushMove(e) {
  const r = soil.getBoundingClientRect(),
    p = {
      x: (e.clientX - r.left) * 600 / r.width,
      y: (e.clientY - r.top) * 500 / r.height
    };
  const from = lastBrush || p,
    steps = Math.max(1, Math.ceil(Math.hypot(p.x - from.x, p.y - from.y) / 12));
  for (let i = 1; i <= steps; i++) brushAt(from.x + (p.x - from.x) * i / steps, from.y + (p.y - from.y) * i / steps);
  lastBrush = p;
}
export function collectPending() {
  if (!s.pending) return;
  s.pending.revealed = true;
  save();
  $('excavate').close();
  openPacking();
}
export function initExcavation() {
  soil.addEventListener('pointerdown', e => {
    if (brushDown) return;
    brushDown = true;
    soil.setPointerCapture(e.pointerId);
    lastBrush = null;
    brushMove(e);
  });
  soil.addEventListener('pointermove', e => {
    if (brushDown) brushMove(e);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) soil.addEventListener(event, () => {
    brushDown = false;
    lastBrush = null;
  });
  $('excNext').onclick = () => {
    if (phaseDone && s.pending) collectPending();
  };
  $('excSkip').onclick = collectPending;
  $('excavate').addEventListener('cancel', e => e.preventDefault());
}
