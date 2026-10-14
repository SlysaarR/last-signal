import { detectorFeatures, detectorSettings, detectorLook } from '../data/gear.js?v=0.51.0';
import { $ } from './dom.js?v=0.51.0';
import { s, save } from './storage.js?v=0.51.0';
import { busy, renderDetector } from './ui.js?v=0.51.0';
import { draw } from './graphics/field.js?v=0.51.0';
let trail=[],trailScope=null;
export function recordReading(reading,scope) {
  if(scope!==trailScope){trail=[];trailScope=scope;}
  if(s.level<7)return;
  trail.push(reading.power);if(trail.length>32)trail.shift();
}
export function currentTrail(scope) { return scope===trailScope?[...trail]:[]; }
export function setDetectorMode(mode) {
  const f=detectorFeatures(s.level);
  if(s.atCamp||busy()||!['search','pinpoint','deep'].includes(mode)||mode==='pinpoint'&&!f.pinpoint||mode==='deep'&&!f.deep)return false;
  s.detectorSettings={...detectorSettings(s),mode};save();renderDetector();draw();return true;
}
export function toggleIronQuiet() {
  if(s.atCamp||busy()||!detectorFeatures(s.level).ironQuiet)return false;
  const settings=detectorSettings(s);s.detectorSettings={...settings,ironQuiet:!settings.ironQuiet};save();renderDetector();return true;
}
export function renderDetectorControls(reading) {
  const f=detectorFeatures(s.level),settings=detectorSettings(s),look=detectorLook(s.level);
  $('instrument').dataset.stage=String(look.stage);
  $('detectorModel').textContent=look.name;
  $('signalHeading').textContent=settings.mode==='pinpoint'?'ЦЕНТРУВАННЯ':settings.mode==='deep'?'ГЛИБОКИЙ ПОШУК':'СИЛА СИГНАЛУ';
  $('detectorModes').hidden=!f.pinpoint;
  $('fieldModeSummary').hidden=!f.pinpoint;
  $('fieldModeSummary').textContent={search:'Пошук',pinpoint:'Пінпойнт',deep:'Глибокий'}[settings.mode]+(settings.ironQuiet?' · залізо тихіше':'');
  for(const [mode,id]of [['search','modeSearch'],['pinpoint','modePinpoint'],['deep','modeDeep']]){
    $(id).hidden=mode==='deep'&&!f.deep;
    $(id).setAttribute('aria-pressed',String(settings.mode===mode));
  }
  $('ironQuiet').hidden=!f.ironQuiet;
  $('ironQuiet').setAttribute('aria-pressed',String(settings.ironQuiet));
  $('ironQuiet').textContent=settings.ironQuiet?'Залізо: тихіше':'Залізо: звичайний звук';
  const notes=[];
  if(settings.mode==='pinpoint')notes.push('Точний рух · проведи навхрест');
  if(settings.mode==='deep')notes.push('Ширший відгук · більше шуму');
  if(settings.ironQuiet)notes.push('Залізні монети теж звучать тихіше');
  if(f.ground&&s.progress?.active?.condition===2)notes.push('Баланс ґрунту активний');
  if(f.separation&&reading.interference&&reading.power>20)notes.push('Сусідній сигнал');
  $('detectorModeNote').textContent=notes.join(' · ');$('detectorModeNote').hidden=!notes.length;
  $('signalTracePanel').hidden=!f.trace;
  if(f.trace){
    const canvas=$('signalTrace'),ctx=canvas.getContext('2d'),values=currentTrail(s.objects),w=canvas.width,h=canvas.height;
    ctx.clearRect(0,0,w,h);ctx.strokeStyle='#76886a44';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,h-2);ctx.lineTo(w,h-2);ctx.stroke();
    ctx.strokeStyle=look.accent;ctx.lineWidth=2;ctx.beginPath();
    values.forEach((p,i)=>{const x=w-(values.length-1-i)*w/31,y=h-3-p*(h-6)/100;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
    canvas.setAttribute('aria-label',values.length?'Історія сили сигналу: '+values.slice(-8).join(', '):'Історія з’явиться після руху котушки');
  }
}
export function initDetectorControls() {
  for(const [mode,id]of [['search','modeSearch'],['pinpoint','modePinpoint'],['deep','modeDeep']])$(id).onclick=()=>setDetectorMode(mode);
  $('ironQuiet').onclick=toggleIronQuiet;
}
