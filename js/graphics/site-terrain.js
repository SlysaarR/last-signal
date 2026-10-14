import { siteRandom, shorelineAt } from '../../data/site-layout.js?v=0.47.0';
const W=880,H=720;
function trace(c,points) {
  c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x*W,p.y*H):c.moveTo(p.x*W,p.y*H));
}
function stone(c,x,y,r,angle=0) {
  c.save();c.translate(x,y);c.rotate(angle);
  c.fillStyle='#17221d55';c.beginPath();c.ellipse(3,5,r*1.2,r*.72,0,0,Math.PI*2);c.fill();
  c.fillStyle='#7e8070';c.beginPath();c.moveTo(-r,-r*.3);c.lineTo(-r*.25,-r*.65);c.lineTo(r*.8,-r*.4);c.lineTo(r,r*.2);c.lineTo(r*.1,r*.6);c.lineTo(-r*.8,r*.45);c.closePath();c.fill();
  c.strokeStyle='#cad1ac65';c.lineWidth=1.4;c.beginPath();c.moveTo(-r*.8,-r*.25);c.lineTo(-r*.2,-r*.5);c.lineTo(r*.65,-r*.28);c.stroke();c.restore();
}
function landmark(c,f,random) {
  c.save();c.translate(f.x*W,f.y*H);c.rotate(f.angle);const r=f.size*W;
  if(f.kind==='foundation') {
    c.fillStyle='#303c2666';c.fillRect(-r,-r*.65,r*2,r*1.3);
    c.strokeStyle='#25312277';c.lineWidth=14;c.strokeRect(-r,-r*.65,r*2,r*1.3);
    for(let x=-r;x<=r;x+=12){if(random()>.2)stone(c,x,-r*.65,7,random());if(random()>.25)stone(c,x,r*.65,7,random());}
    for(let y=-r*.5;y<r*.6;y+=12){if(random()>.2)stone(c,-r,y,7,random());if(random()>.3)stone(c,r,y,7,random());}
    for(let i=0;i<9;i++)stone(c,(random()-.5)*r*2.8,(random()-.5)*r*1.9,2+random()*4,random()*3);
    c.strokeStyle='#88935755';c.lineWidth=2;for(let i=0;i<14;i++){const x=(random()-.5)*r*2,y=(random()-.5)*r*1.3;c.beginPath();c.moveTo(x,y);c.lineTo(x+3,y-9);c.stroke();}
  } else if(f.kind==='tree'||f.kind==='brush') {
    c.fillStyle='#101f1b55';c.beginPath();c.ellipse(r*.32,r*.25,r*1.13,r*.83,.2,0,Math.PI*2);c.fill();
    c.strokeStyle='#6b6244';c.lineWidth=5;c.beginPath();c.moveTo(-r*.35,r*.48);c.lineTo(0,0);c.lineTo(r*.44,-r*.3);c.stroke();
    for(let i=0;i<13;i++){
      const a=i*2.4,d=r*(.12+random()*.58),x=Math.cos(a)*d,y=Math.sin(a)*d*.85,size=r*(.28+random()*.24);
      const g=c.createRadialGradient(x-size*.35,y-size*.5,2,x,y,size);
      g.addColorStop(0,f.kind==='tree'?'#647a46':'#819055');g.addColorStop(1,'#273e2b');
      c.fillStyle=g;c.beginPath();c.arc(x,y,size,0,Math.PI*2);c.fill();
      c.strokeStyle='#9ca86633';c.lineWidth=1.4;c.beginPath();c.arc(x-2,y-3,size*.65,3.5,5.7);c.stroke();
    }
  } else if(f.kind==='logs') {
    c.lineCap='round';c.strokeStyle='#19261e66';c.lineWidth=19;c.beginPath();c.moveTo(-r,6);c.lineTo(r,14);c.stroke();
    c.strokeStyle='#776340';c.lineWidth=12;c.beginPath();c.moveTo(-r,0);c.lineTo(r,8);c.stroke();
    c.strokeStyle='#b1a16a88';c.lineWidth=2;c.beginPath();c.moveTo(-r+3,-3);c.lineTo(r-3,5);c.stroke();
    c.strokeStyle='#3a3728';c.lineWidth=2;for(let i=0;i<8;i++){const x=-r+i*r*.25;c.beginPath();c.moveTo(x,-3);c.lineTo(x+5,8);c.stroke();}
    c.fillStyle='#b3a47a';c.beginPath();c.ellipse(r,8,4,6,.1,0,Math.PI*2);c.fill();
  } else {
    for(let i=0;i<11;i++)stone(c,(random()-.5)*r*2,(random()-.5)*r*1.2,3+random()*8,random()*3);
  }
  c.restore();
}
export function paintSiteTerrain(c,loc,layout) {
  const random=siteRandom(layout.seed),sand=layout.terrain==='beach';
  c.save();
  const base=c.createRadialGradient(W*.42,H*.4,40,W*.5,H*.5,W*.72);
  base.addColorStop(0,loc.ground[0]);base.addColorStop(1,loc.ground[1]);c.fillStyle=base;c.fillRect(0,0,W,H);
  for(let i=0;i<45;i++){
    const x=random()*W,y=random()*H,r=30+random()*100,g=c.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,i%2?'#b2b86b10':'#132e241e');g.addColorStop(1,'#00000000');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
  }
  if(layout.terrain==='field'){
    c.strokeStyle='#392f2470';c.lineWidth=9;
    for(let y=-220;y<H+220;y+=34){c.beginPath();c.moveTo(0,y);c.lineTo(W,y+210);c.stroke();c.strokeStyle='#a4915a28';c.lineWidth=2;c.beginPath();c.moveTo(0,y+7);c.lineTo(W,y+217);c.stroke();c.strokeStyle='#392f2470';c.lineWidth=9;}
  }
  for(const path of layout.paths) {
    c.lineJoin='round';c.lineCap='round';trace(c,path.points);c.strokeStyle=sand?'#89754e55':'#a3905a25';c.lineWidth=path.width*W+19;c.stroke();
    trace(c,path.points);c.strokeStyle=sand?'#c2ab7548':'#9a89564f';c.lineWidth=path.width*W;c.stroke();
    c.save();c.translate(-path.width*W*.25,0);trace(c,path.points);c.strokeStyle='#26312638';c.lineWidth=3;c.stroke();c.translate(path.width*W*.5,0);trace(c,path.points);c.stroke();c.restore();
  }
  for(let i=0;i<(sand?420:760);i++){
    const x=random()*W,y=random()*H;c.strokeStyle=i%3?'#b9bd762b':'#152e324f';c.lineWidth=.7+random()*1.4;
    c.beginPath();c.moveTo(x,y);c.lineTo(x+(random()-.5)*7,y-(sand?1:3+random()*8));c.stroke();
  }
  for(let i=0;i<90;i++)stone(c,random()*W,random()*H,1+random()*2.8,random()*3);
  if(layout.water) {
    const water=layout.water,points=water.points.map(p=>water.edge==='right'?{x:p.value,y:p.t}:{x:p.t,y:p.value});
    trace(c,points);c.lineTo(W,H);c.lineTo(water.edge==='right'?W:0,water.edge==='right'?0:H);c.closePath();
    const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'#4b8583');g.addColorStop(1,'#294f56');c.fillStyle=g;c.fill();
    trace(c,points);c.lineWidth=12;c.strokeStyle='#c8c59635';c.stroke();trace(c,points);c.lineWidth=3;c.strokeStyle='#d8dfb66b';c.stroke();
    c.strokeStyle='#cce8df24';c.lineWidth=1.5;
    for(let i=0;i<40;i++){
      const t=random(),edge=shorelineAt(water,t),v=edge+.015+random()*.15;
      const x=water.edge==='right'?v*W:t*W,y=water.edge==='right'?t*H:v*H;
      c.beginPath();c.moveTo(x,y);c.lineTo(x+10+random()*26,y-2);c.stroke();
    }
  }
  for(const feature of layout.features)landmark(c,feature,random);
  const shade=c.createRadialGradient(W*.5,H*.45,160,W*.5,H*.5,W*.7);shade.addColorStop(0,'#00000000');shade.addColorStop(1,'#07160e70');c.fillStyle=shade;c.fillRect(0,0,W,H);
  c.restore();
}
