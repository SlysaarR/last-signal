import { paintUkrainianCoin, isUkrainianCoin } from './ukrainian-coins.js?v=0.25.0';
// Procedural find artwork. Coin wreath reference: https://museum.mincult.gov.ua/collections/moneta-25-kopiyok-1992-r-125364
import { types } from '../../data/items.js?v=0.25.0';
import { $ } from '../dom.js?v=0.25.0';
import { s } from '../storage.js?v=0.25.0';
export function seededArt(seed) {
  let n = Math.abs(seed | 0) + 1;
  return () => {
    n = n * 16807 % 2147483647;
    return n / 2147483647;
  };
}
export function paintCoinFace(c, item, condition, side = 0) {
  if (isUkrainianCoin(item)) { paintUkrainianCoin(c, item, condition, side); return; }
  const yellow = item.material === 'yellow',
    r = 126,
    wear = 1 - Math.max(0, Math.min(100, condition)) / 100;
  const light = yellow ? '#ede0a3' : '#e4e7db',
    mid = yellow ? '#b09a55' : '#a5ada5',
    dark = yellow ? '#55482a' : '#434c46';
  const metal = c.createLinearGradient(-r, -r, r, r);
  metal.addColorStop(0, light);
  metal.addColorStop(.3, mid);
  metal.addColorStop(.5, light);
  metal.addColorStop(.72, mid);
  metal.addColorStop(1, dark);
  c.shadowColor = '#030802bb';
  c.shadowBlur = 22;
  c.shadowOffsetY = 13;
  c.fillStyle = dark;
  c.beginPath();
  c.ellipse(0, 5, r, r, 0, 0, Math.PI * 2);
  c.fill();
  c.shadowBlur = 0;
  c.shadowOffsetY = 0;
  c.fillStyle = metal;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 3;
  c.strokeStyle = light;
  c.stroke();
  c.lineWidth = 2;
  c.strokeStyle = dark;
  c.beginPath();
  c.arc(0, 0, r - 7, 0, Math.PI * 2);
  c.stroke();
  const emboss = draw => {
    c.save();
    c.translate(0, 1.5);
    c.fillStyle = light;
    c.strokeStyle = light;
    draw();
    c.restore();
    c.fillStyle = dark;
    c.strokeStyle = dark;
    draw();
  };
  // Stylized leaf-and-berry wreath; mint die varieties are not simulated.
  for (let i = 0; i < 9; i++) {
    const a = (i * 40 + 10) * Math.PI / 180,
      cx = Math.cos(a) * 96,
      cy = Math.sin(a) * 96;
    c.save();
    c.translate(cx, cy);
    c.rotate(a + Math.PI / 2);
    emboss(() => {
      c.lineWidth = 1.2;
      c.beginPath();
      c.moveTo(-16, 5);
      c.quadraticCurveTo(0, -2, 17, 3);
      c.stroke();
      for (const k of [-1, 1]) {
        c.beginPath();
        c.ellipse(k * 7, -3, 4, 10, k * .65, 0, Math.PI * 2);
        c.fill();
      }
      for (const [bx, by] of [[-5, 10], [3, 10], [-1, 17]]) {
        c.beginPath();
        c.arc(bx, by, 3.6, 0, Math.PI * 2);
        c.fill();
      }
    });
    c.restore();
  }
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  emboss(() => {
    c.font = 'bold ' + (String(item.value).length > 1 ? 79 : 93) + 'px Georgia';
    c.fillText(String(item.value), 0, 13);
    c.font = 'bold 22px Georgia';
    c.fillText(item.unit, 0, 46);
  });
  c.save();
  c.beginPath();
  c.arc(0, 0, r - 5, 0, Math.PI * 2);
  c.clip();
  const rand = seededArt((item.year || 1) * 17 + item.value * 33 + Math.round(condition));
  for (let i = 0; i < 160 + wear * 350; i++) {
    const x = (rand() - .5) * r * 2,
      y = (rand() - .5) * r * 2;
    c.fillStyle = i % 2 ? 'rgba(35,40,27,' + (.025 + wear * .15) + ')' : 'rgba(247,236,185,' + (.025 + wear * .03) + ')';
    c.beginPath();
    c.ellipse(x, y, 1 + rand() * (1 + wear * 6), .4 + rand() * 2, rand() * 6, 0, Math.PI * 2);
    c.fill();
  }
  for (let i = 0; i < 15 + wear * 45; i++) {
    const x = (rand() - .5) * 210,
      y = (rand() - .5) * 210;
    c.strokeStyle = 'rgba(35,39,25,' + (.05 + wear * .18) + ')';
    c.lineWidth = .5 + rand();
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + 6 + rand() * 20, y - 3 - rand() * 8);
    c.stroke();
  }
  for (let i = 0; i < wear * 18; i++) {
    const x = (rand() - .5) * 220,
      y = (rand() - .5) * 220;
    const spot = c.createRadialGradient(x, y, 0, x, y, 12 + rand() * 22);
    spot.addColorStop(0, yellow ? '#36473755' : '#44453755');
    spot.addColorStop(1, '#413b2a00');
    c.fillStyle = spot;
    c.fillRect(x - 40, y - 40, 80, 80);
  }
  c.restore();
}
export function drawArtifact(type, target, condition, studio = false, side = 0) {
  const art = target || $('artifact').getContext('2d');
  const item = types[type],
    shape = item.shape;
  condition = condition ?? s.pending?.condition ?? 70;
  art.clearRect(0, 0, 600, 500);
  art.fillStyle = '#30291f';
  art.fillRect(0, 0, 600, 500);
  const ground = art.createRadialGradient(300, 250, 40, 300, 250, 320);
  ground.addColorStop(0, studio ? '#3b4b31' : '#796449');
  ground.addColorStop(1, studio ? '#101e15' : '#201b15');
  art.fillStyle = ground;
  art.fillRect(0, 0, 600, 500);
  const grains = seededArt(type * 39 + 71);
  for (let i = 0; i < 800; i++) {
    art.fillStyle = i % 2 ? '#cdb98c0b' : '#00000012';
    art.fillRect(grains() * 600, grains() * 500, 1 + grains() * 3, 1 + grains() * 2);
  }
  art.save();
  art.translate(300, studio ? 200 : 250);
  if (studio) art.scale(1.15, 1.15);
  art.rotate(isUkrainianCoin(item) ? 0 : studio ? -.08 : -.18);
  if (isUkrainianCoin(item)) {
    paintCoinFace(art, item, condition, side);
    art.restore();
    return;
  }
  art.shadowColor = '#090b08';
  art.shadowBlur = 20;
  art.shadowOffsetY = 12;
  const color = item.country ? item.material === 'yellow' ? '#c6aa59' : '#c2c8c1' : item.name.includes('Золот') ? '#e3bd65' : item.name.includes('Сріб') || shape === 'watch' ? '#bac7bf' : item.kind === 'trash' ? '#887d69' : '#b88748';
  art.fillStyle = color;
  art.strokeStyle = color;
  art.lineWidth = 18;
  if (shape === 'nail' || shape === 'bolt') {
    art.fillStyle = '#867263';
    art.fillRect(-12, -95, 24, 185);
    art.fillRect(-45, -105, 90, 22);
  } else if (shape === 'cap') {
    art.beginPath();
    for (let i = 0; i < 32; i++) {
      const a = i * Math.PI / 16,
        r = i % 2 ? 78 : 90;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      if (i === 0) art.moveTo(x, y);else art.lineTo(x, y);
    }
    art.closePath();
    art.fill();
  } else if (['chain', 'wire'].includes(shape)) {
    art.lineWidth = shape === 'wire' ? 10 : 6;
    for (let i = 0; i < 9; i++) {
      art.beginPath();
      art.ellipse(-100 + i * 25, Math.sin(i * .7) * 26, 20, 12, .5, 0, Math.PI * 2);
      art.stroke();
    }
  } else if (shape === 'can') {
    art.fillRect(-60, -85, 120, 170);
    art.strokeStyle = '#504839';
    art.lineWidth = 6;
    for (const y of [-65, 0, 65]) {
      art.beginPath();
      art.moveTo(-48, y);
      art.lineTo(48, y);
      art.stroke();
    }
  } else if (shape === 'tab' || shape === 'washer' || shape === 'bracelet' || shape === 'earring') {
    art.beginPath();
    art.ellipse(0, 0, shape === 'tab' ? 40 : 80, shape === 'earring' ? 95 : 65, 0, 0, Math.PI * 2);
    art.stroke();
  } else if (shape === 'foil' || shape === 'sheet') {
    art.beginPath();
    art.moveTo(-90, -65);
    art.lineTo(70, -90);
    art.lineTo(90, 50);
    art.lineTo(-55, 90);
    art.closePath();
    art.fill();
    art.strokeStyle = '#524c3c';
    art.lineWidth = 4;
    art.beginPath();
    art.moveTo(-60, -40);
    art.lineTo(50, 40);
    art.lineTo(-30, 65);
    art.stroke();
  } else if (shape === 'key') {
    art.beginPath();
    art.arc(-50, -40, 35, 0, Math.PI * 2);
    art.stroke();
    art.beginPath();
    art.moveTo(-22, -16);
    art.lineTo(70, 80);
    art.lineTo(88, 62);
    art.stroke();
  } else if (shape === 'ring' || shape === 'gemring') {
    art.beginPath();
    art.ellipse(0, 15, 67, 85, 0, 0, Math.PI * 2);
    art.stroke();
    if (shape === 'gemring' || type === 4) {
      art.fillStyle = '#e4eee2';
      art.beginPath();
      art.moveTo(0, -117);
      art.lineTo(30, -86);
      art.lineTo(0, -53);
      art.lineTo(-30, -86);
      art.closePath();
      art.fill();
    }
  } else {
    if (shape === 'watch' || shape === 'pendant') {
      art.beginPath();
      art.arc(0, -110, 18, 0, Math.PI * 2);
      art.stroke();
    }
    art.beginPath();
    art.arc(0, 0, shape === 'pendant' ? 76 : 96, 0, Math.PI * 2);
    art.fill();
  }
  art.shadowBlur = 0;
  art.shadowOffsetY = 0;
  art.strokeStyle = '#3f342b';
  art.lineWidth = 3;
  if (['cap', 'coin', 'button', 'watch', 'pendant'].includes(shape)) {
    art.beginPath();
    art.arc(0, 0, shape === 'pendant' ? 60 : 72, 0, Math.PI * 2);
    art.stroke();
  }
  if (shape === 'coin') {
    art.fillStyle = item.country ? '#394236' : '#624729';
    art.textAlign = 'center';
    art.font = 'bold 64px Georgia';
    art.fillText(item.value || '?', 0, 4);
    art.font = '17px Georgia';
    art.fillText(item.unit ? item.unit.toUpperCase() : 'МОНЕТА', 0, 31);
    art.font = '19px Georgia';
    art.fillText(item.year || 'ПРОТОТИП', 0, 57);
    if (item.country) {
      art.font = '14px Georgia';
      art.fillText('УКРАЇНА', 0, -49);
    }
  }
  if (shape === 'button') {
    for (let x of [-16, 16]) for (let y of [-16, 16]) {
      art.fillStyle = '#443b2c';
      art.beginPath();
      art.arc(x, y, 8, 0, Math.PI * 2);
      art.fill();
    }
  }
  if (shape === 'watch') {
    art.fillStyle = '#e1d8b7';
    art.beginPath();
    art.arc(0, 0, 70, 0, Math.PI * 2);
    art.fill();
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      art.beginPath();
      art.moveTo(Math.sin(a) * 56, Math.cos(a) * 56);
      art.lineTo(Math.sin(a) * 63, Math.cos(a) * 63);
      art.stroke();
    }
    art.lineWidth = 5;
    art.beginPath();
    art.moveTo(-30, -25);
    art.lineTo(0, 0);
    art.lineTo(32, -40);
    art.stroke();
  }
  if (shape === 'pendant') {
    art.fillStyle = '#80602d';
    art.textAlign = 'center';
    art.font = '75px serif';
    art.fillText('✦', 0, 26);
  }
  art.restore();
}
