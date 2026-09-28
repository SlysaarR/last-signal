// Original Canvas rendition of the 25-kopiyok reverse; not an exact mint-die reproduction.
// References: museum.mincult.gov.ua/collections/moneta-25-kopiyok-1992-r-125364
// commons.wikimedia.org/wiki/File:Ukraine-25-kopiyok-1992.jpg
export function paint25(c, condition = 75, seed = 1992) {
  const wear = 1 - Math.max(0, Math.min(100, condition)) / 100, r = 126;
  let n = seed * 37 + 251;
  const random = () => { n = n * 16807 % 2147483647; return n / 2147483647; };
  c.save();
  const metal = c.createLinearGradient(-100,-120,105,130);
  metal.addColorStop(0, wear > .6 ? '#97865a' : '#d8c47b');
  metal.addColorStop(.32, wear > .6 ? '#786c45' : '#b6a15d');
  metal.addColorStop(.62, wear > .6 ? '#918053' : '#cab46b');
  metal.addColorStop(1, '#6b5c32');
  c.shadowColor='#0009';c.shadowBlur=13;c.shadowOffsetY=7;
  c.fillStyle='#514329';c.beginPath();c.ellipse(0,4,r,r,0,0,Math.PI*2);c.fill();
  c.shadowBlur=0;c.shadowOffsetY=0;
  c.fillStyle=metal;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();
  c.save();c.beginPath();c.arc(0,0,r-2,0,Math.PI*2);c.clip();
  // Fine metal grain stays in the same positions across all wear levels.
  for(let i=0;i<1600;i++) {c.fillStyle=i%2?'#fff1ab0d':'#302b1a16';c.fillRect((random()-.5)*252,(random()-.5)*252,.4+random()*1.1,.4+random());}
  const relief = draw => {
    c.save();c.globalAlpha=1-wear*.63;c.translate(.7,1.1);c.fillStyle='#f4df98';c.strokeStyle='#ecd38a';draw();c.restore();
    c.save();c.globalAlpha=1-wear*.58;c.translate(-.5,-.5);c.fillStyle='#74602e';c.strokeStyle='#69582d';draw();c.restore();
    c.save();c.globalAlpha=.9-wear*.5;c.fillStyle='#c6ac5e';c.strokeStyle='#baa15a';draw();c.restore();
  };
  relief(()=>{c.lineWidth=2.6;c.beginPath();c.arc(0,0,121,0,Math.PI*2);c.stroke();});
  // Flowing border, alternating elongated leaves and berry clusters.
  for(let i=0;i<8;i++) {
    c.save();c.rotate((i*45+14)*Math.PI/180);c.translate(0,-105);
    relief(()=>{
      c.lineWidth=1.2;c.beginPath();c.moveTo(-23,2);c.bezierCurveTo(-4,-9,15,-8,27,5);c.stroke();
      c.beginPath();c.moveTo(-22,2);c.bezierCurveTo(-14,-3,-14,-15,1,-15);c.bezierCurveTo(-3,-6,13,-10,20,-3);c.bezierCurveTo(9,-1,1,8,-9,5);c.closePath();c.fill();
      c.beginPath();c.moveTo(-16,1);c.quadraticCurveTo(-1,-5,13,-4);c.stroke();
      c.beginPath();c.moveTo(19,2);c.lineTo(14,11);c.stroke();
      for(const [x,y,size] of [[9,10,3.2],[16,11,3.2],[22,9,2.8],[12,17,3.1],[19,17,3],[15,23,2.8]]){c.beginPath();c.arc(x,y,size,0,Math.PI*2);c.fill();}
    });c.restore();
  }
  c.textAlign='center';c.textBaseline='alphabetic';
  relief(()=>{c.font='bold 123px Georgia,serif';c.fillText('25',0,20,176);c.font='bold 35px Georgia,serif';c.fillText('копійок',0, 73,179);});
  // Wear dulls the raised design; irregular corrosion is strongest at the rim.
  for(let i=0;i<38;i++) {
    const a=random()*Math.PI*2,dist=65+random()*60,x=Math.cos(a)*dist,y=Math.sin(a)*dist,size=5+random()*25;
    const patch=c.createRadialGradient(x,y,0,x,y,size);
    patch.addColorStop(0,`rgba(39,54,32,${wear*wear*(.2+random()*.45)})`);patch.addColorStop(.6,`rgba(71,61,34,${wear*.15})`);patch.addColorStop(1,'#463d2500');c.fillStyle=patch;c.fillRect(x-size,y-size,size*2,size*2);
  }
  for(let i=0;i<95;i++) {
    const x=(random()-.5)*240,y=(random()-.5)*240,len=2+random()*19;
    c.strokeStyle=`rgba(48,39,22,${.035+wear*.23})`;c.lineWidth=.3+random()*.8;c.beginPath();c.moveTo(x,y);c.lineTo(x+len,y-len*.4);c.stroke();
  }
  c.fillStyle=`rgba(58,54,32,${wear*.2})`;c.fillRect(-r,-r,r*2,r*2);
  c.restore();c.restore();
}

export function isCoin25(t) { return !!t?.country && t.value === 25 && t.unit?.startsWith('коп'); }
export function coin25Markup(type, condition, className='coin25-thumb') {
  return `<canvas class="${className}" width="260" height="260" data-coin25="${type}" data-condition="${condition}" role="img" aria-label="25 копійок, стан ${condition} зі 100"></canvas>`;
}
export function renderCoin25Thumbnails() {
  document.querySelectorAll('canvas[data-coin25]').forEach(canvas => {
    const key=canvas.dataset.coin25+':'+canvas.dataset.condition;
    if(canvas.dataset.rendered===key)return;
    const c=canvas.getContext('2d');c.clearRect(0,0,260,260);c.save();c.translate(130,128);c.scale(.94,.94);paint25(c,Number(canvas.dataset.condition),1992);c.restore();canvas.dataset.rendered=key;
  });
}
