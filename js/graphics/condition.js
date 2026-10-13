// One continuous, deterministic wear profile. Condition never seeds the pattern.
export const clampCondition = value => Math.max(0, Math.min(100, Number(value) || 0));
export function conditionProfile(value) {
  const quality = clampCondition(value) / 100, wear = 1 - quality;
  return { quality, wear, corrosion: wear ** 1.6, polish: quality ** 4, relief: 1 - wear * .76 };
}
export function artRandom(seed) {
  let n = Math.abs(seed | 0) % 2147483646 + 1;
  return () => { n = n * 16807 % 2147483647; return n / 2147483647; };
}
export function mixMetal(a, b, amount) {
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * amount)).join(',')})`;
}
export function metalPalette(item, condition) {
  const { wear } = conditionProfile(condition);
  const gold = item.material === 'yellow' || /Золот/.test(item.name);
  const iron = item.metal === 'iron' && !item.country;
  const silver = !!(item.material && item.material !== 'yellow' || /Сріб|Алюм/.test(item.name) || ['watch', 'foil', 'tab', 'can', 'gemring'].includes(item.shape));
  const bright = gold ? [235,205,126] : iron ? [170,177,176] : silver ? [211,224,229] : [184,138,86];
  const tarnish = gold ? [101,94,54] : iron ? [99,78,62] : silver ? [91,103,104] : [102,65,40];
  return { gold, silver, iron, light: mixMetal(bright, tarnish, wear * .66), mid: mixMetal(bright.map(v=>v*.78), tarnish, wear*.65), dark: mixMetal(bright.map(v=>v*.43), tarnish.map(v=>v*.7), wear), corrosion: gold ? (item.material==='yellow'?'50,72,48':'96,78,44') : iron ? '126,65,32' : silver ? '54,65,67' : '75,91,57' };
}
// Coordinates are in the existing artwork's -126…126 space; caller clips to the object.
export function paintWear(c, item, condition, seed = 1) {
  const p = conditionProfile(condition), palette = metalPalette(item, condition), random = artRandom(seed);
  c.save();
  for (let i=0; i<90; i++) {
    const x=(random()-.5)*252, y=(random()-.5)*252, size=4+random()*27;
    const onset=random()*.65, intensity=Math.max(0,(p.wear-onset)/(1-onset));
    const spot=c.createRadialGradient(x,y,0,x,y,size*(.45+p.wear*.8));
    spot.addColorStop(0,`rgba(${palette.corrosion},${intensity*.8})`);
    spot.addColorStop(.55,`rgba(${palette.corrosion},${intensity*.36})`);
    spot.addColorStop(1,`rgba(${palette.corrosion},0)`);
    c.fillStyle=spot;c.fillRect(x-size*1.3,y-size*1.3,size*2.6,size*2.6);
  }
  for (let i=0; i<180; i++) {
    const x=(random()-.5)*250,y=(random()-.5)*250,len=2+random()*24,angle=-.65+random()*.7;
    const onset=random()*.85, strength=Math.max(0,(p.wear-onset)/(1-onset));
    c.lineWidth=.3+random()*.8;
    c.strokeStyle=`rgba(26,30,24,${strength*.58})`;
    c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(angle)*len,y+Math.sin(angle)*len);c.stroke();
    c.strokeStyle=`rgba(246,238,199,${strength*.22})`;
    c.beginPath();c.moveTo(x,y+.65);c.lineTo(x+Math.cos(angle)*len,y+Math.sin(angle)*len+.65);c.stroke();
  }
  for (let i=0; i<300; i++) {
    const x=(random()-.5)*252,y=(random()-.5)*252,r=.2+random()*1.4;
    c.fillStyle=`rgba(25,31,25,${p.corrosion*(.1+random()*.4)})`;
    c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
  }
  c.fillStyle=`rgba(${palette.corrosion},${p.wear*.15})`;c.fillRect(-128,-128,256,256);
  c.restore();
}
