// field responsibilities for Last Signal.
import { $ } from '../dom.js?v=0.20.0';
import { signal } from '../search.js?v=0.20.0';
import { s } from '../storage.js?v=0.20.0';
import { currentLocation } from '../world.js?v=0.20.0';
export const canvas = $('field'),
  ctx = canvas.getContext('2d');
export function paintTerrain(ctx) {
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
  let seed = 47 + s.day * 101 + (s.location + 1) * 317;
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
export function draw() {
  const key = s.day + ':' + s.location + ':' + s.emergency;
  if (!terrainLayer || key !== terrainKey) {
    terrainLayer = document.createElement('canvas');
    terrainLayer.width = 880;
    terrainLayer.height = 720;
    paintTerrain(terrainLayer.getContext('2d'));
    terrainKey = key;
  }
  const rect = canvas.getBoundingClientRect();
  if (rect.width && rect.height) {
    const height = Math.round(880 * rect.height / rect.width);
    if (canvas.height !== height) canvas.height = height;
  }
  const w = canvas.width,
    h = canvas.height;
  ctx.drawImage(terrainLayer, 0, 0, w, h);
  for (const hole of s.holes) {
    const x = hole.x * w,
      y = hole.y * h;
    ctx.fillStyle = '#162015';
    ctx.beginPath();
    ctx.ellipse(x, y, 24, 15, -.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#a2936466';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = '#080f0b77';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 3, 17, 9, -.2, 0, Math.PI * 2);
    ctx.fill();
  }
  const n = signal(),
    x = s.x * w,
    y = s.y * h;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-.2);
  ctx.strokeStyle = '#d5e4b329';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 7]);
  ctx.beginPath();
  ctx.arc(0, 0, 66, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.shadowColor = '#0009';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 9;
  ctx.strokeStyle = '#15231b';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(55, 125);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.strokeStyle = '#899b83';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#101d15';
  ctx.beginPath();
  ctx.ellipse(0, 0, 45, 32, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = n.power > 84 ? '#e2f3b0' : '#b8c6a1';
  ctx.beginPath();
  ctx.ellipse(0, 0, 47, 34, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#17251c';
  ctx.beginPath();
  ctx.moveTo(-38, 0);
  ctx.lineTo(38, 0);
  ctx.moveTo(0, -26);
  ctx.lineTo(0, 26);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#819373';
  ctx.stroke();
  ctx.fillStyle = n.power > 84 ? '#e4f6a7' : '#bdcf9c';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
