import { detectorLook } from '../../data/gear.js?v=0.35.0';
// The same equipment is drawn in the field and the workshop. No hidden target coordinates.
export function drawDetector(ctx,level,reading={}) {
  const look=detectorLook(level),stage=look.stage,rx=44+stage*4,ry=stage<1?33:stage<3?40:47;
  ctx.save();ctx.rotate(-.2);
  ctx.strokeStyle=reading.pinpoint?'#dbeeb26b':look.accent+'35';ctx.lineWidth=1;
  ctx.setLineDash(reading.mode==='pinpoint'?[2,3]:[4,7]);ctx.beginPath();ctx.arc(0,0,66+stage*4,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  if(reading.mode==='deep'){ctx.strokeStyle=look.accent+'29';ctx.beginPath();ctx.arc(0,0,88,0,Math.PI*2);ctx.stroke();}
  ctx.shadowColor='#0009';ctx.shadowBlur=12;ctx.shadowOffsetY=8;
  ctx.lineCap='round';ctx.strokeStyle=stage>=3?'#131b21':'#1d2a20';ctx.lineWidth=15;ctx.beginPath();ctx.moveTo(0,18);ctx.lineTo(61,140);ctx.stroke();
  ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.strokeStyle=look.shell;ctx.lineWidth=7;ctx.stroke();
  ctx.strokeStyle=look.accent;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(6,27);ctx.lineTo(50,113);ctx.stroke();
  // Each tier gains another shaft marker, so adjacent upgrades are visibly distinct.
  for(let i=0;i<level;i++){const y=31+i*6,x=(y-18)*.5;ctx.strokeStyle=i===level-1?'#edf3d8':look.accent+'88';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-4,y+2);ctx.lineTo(x+4,y-2);ctx.stroke();}
  ctx.lineWidth=14;ctx.strokeStyle='#101b17';ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle=reading.pinpoint?'#e3f5b8':look.accent;ctx.lineWidth=3;ctx.stroke();
  ctx.lineWidth=5;ctx.strokeStyle=look.shell;ctx.beginPath();ctx.moveTo(-rx+6,0);ctx.lineTo(rx-6,0);
  if(stage===0){ctx.moveTo(0,-ry+6);ctx.lineTo(0,ry-6);}
  else {for(const side of [-1,1]){ctx.moveTo(side*8,-ry+6);ctx.bezierCurveTo(side*(rx-10),-ry*.3,side*(rx-10),ry*.3,side*8,ry-6);}}
  if(stage>=3){ctx.moveTo(-rx*.65,-ry*.55);ctx.lineTo(rx*.65,ry*.55);ctx.moveTo(rx*.65,-ry*.55);ctx.lineTo(-rx*.65,ry*.55);}
  ctx.stroke();
  for(let i=0;i<level;i++){const a=Math.PI*1.08+i*.25;ctx.fillStyle=i===level-1?'#f0f6da':look.accent;ctx.beginPath();ctx.arc(Math.cos(a)*rx,Math.sin(a)*ry,2,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle=reading.pinpoint?'#e9f8bd':look.accent;ctx.beginPath();ctx.arc(0,0,stage>=2?5:4,0,Math.PI*2);ctx.fill();
  if(reading.mode==='pinpoint'){ctx.strokeStyle=look.accent;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-22,0);ctx.lineTo(22,0);ctx.moveTo(0,-22);ctx.lineTo(0,22);ctx.stroke();}
  // The controller evolves from a dial to a shielded display with function keys.
  ctx.save();ctx.translate(43,89);ctx.rotate(-.42);
  ctx.fillStyle='#101b17';ctx.fillRect(-22,-22,44,51);ctx.fillStyle=look.shell;ctx.fillRect(-20,-20,40,46);
  if(stage===0){ctx.fillStyle='#abb394';ctx.beginPath();ctx.arc(0,-3,13,Math.PI,Math.PI*2);ctx.fill();ctx.strokeStyle='#263728';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-3);ctx.lineTo(7,-12);ctx.stroke();}
  else {ctx.fillStyle=stage>=3?'#103436':'#192d24';ctx.fillRect(-15,-15,30,23);ctx.fillStyle=look.accent;ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText(String(reading.power||0).padStart(2,'0'),0,1);if(stage>=3){ctx.fillRect(-13,5,Math.round((reading.power||0)*.25),2);}}
  const keys=2+stage;for(let i=0;i<keys;i++){ctx.fillStyle=i===0?look.accent:'#879589';ctx.beginPath();ctx.arc(-12+i*24/(keys-1),17,2,0,Math.PI*2);ctx.fill();}
  ctx.restore();ctx.lineWidth=13;ctx.strokeStyle='#0d1513';ctx.beginPath();ctx.moveTo(55,129);ctx.lineTo(66,153);ctx.stroke();
  ctx.restore();
}
export function drawDetectorPreview(canvas,level) {
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  const gradient=ctx.createRadialGradient(300,115,10,300,115,250);gradient.addColorStop(0,detectorLook(level).shell);gradient.addColorStop(1,'#0e1e16');ctx.fillStyle=gradient;ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.save();ctx.translate(230,72);ctx.rotate(-.65);ctx.scale(1.25,1.25);drawDetector(ctx,level,{power:72,mode:'search'});ctx.restore();
  canvas.dataset.level=String(level);
}
