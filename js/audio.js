import { t as localize } from './i18n.js?v=0.55.2';
// audio responsibilities for Last Signal.
import { $ } from './dom.js?v=0.55.2';
export let audio = null,
  sound = false,
  lastBeep = -Infinity;
let pageActive=true,resuming=null,unavailable=false;
const voices=new Set();
let weatherRequested=null,ambience=null,noiseContext=null,noiseBuffer=null;
function stopAmbience(){
 if(!ambience)return;
 const old=ambience;ambience=null;
 try{old.source.stop();}catch{}
 old.source.disconnect();old.filter.disconnect();old.gain.disconnect();
}
function syncAmbience(){
 const context=audio,kind=weatherRequested;
 if(!kind||!sound||!foreground()||context?.state!=='running'){stopAmbience();return;}
 if(ambience?.context===context&&ambience.kind===kind)return;
 stopAmbience();
 if(!context.createBufferSource||!context.createBuffer||!context.createBiquadFilter)return;
 let source,filter,gain;
 try{
   if(noiseContext!==context){
     noiseBuffer=context.createBuffer(1,context.sampleRate*2,context.sampleRate);noiseContext=context;
     const values=noiseBuffer.getChannelData(0);let seed=491049;
     for(let i=0;i<values.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;values[i]=(seed/4294967296-.5)*.7*Math.min(1,i/128,(values.length-1-i)/128);}
   }
   source=context.createBufferSource();source.buffer=noiseBuffer;source.loop=true;
   filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=kind==='rain'?1700:kind==='overcast'?420:250;filter.Q.value=.45;
   gain=context.createGain();gain.gain.setValueAtTime(kind==='rain'?.004:kind==='overcast'?.0025:.0015,context.currentTime);
   source.connect(filter);filter.connect(gain);gain.connect(context.destination);source.start();
   ambience={context,kind,source,filter,gain};
 }catch{try{source?.stop();}catch{}source?.disconnect();filter?.disconnect();gain?.disconnect();}
}
export function setWeatherAmbience(kind){
 weatherRequested=['clear','overcast','rain'].includes(kind)?kind:null;syncAmbience();
}
const foreground=()=>pageActive&&document.visibilityState!=='hidden';
function renderSound() {
  const waiting=sound&&audio?.state!=='running';
  $('sound').textContent=localize(unavailable?'Звук недоступний':waiting?'Звук: пауза':'Звук: '+(sound?'так':'ні'));
  $('sound').setAttribute('aria-label',localize(waiting?'Звук призупинено. Торкнися поля для відновлення або натисни, щоб вимкнути.':sound?'Вимкнути звук':'Увімкнути звук'));
  $('sound').setAttribute('aria-pressed',String(sound));
}
function stopVoices() {
  for(const voice of voices){try{voice.osc.stop();}catch{}voice.dispose();}
}
function pauseAudio() {
  stopVoices();stopAmbience();const context=audio;
  if(context?.state==='running') {
    try {
      Promise.resolve(context.suspend()).then(()=>{
        // A delayed suspend must not silence a page that has already returned.
        if(audio===context&&sound&&foreground())resumeAudio();
        renderSound();
      }).catch(()=>{});
    } catch {}
  }
  renderSound();
}
export function resumeAudio(gesture=false) {
  if(!sound||!foreground())return Promise.resolve(false);
  if(!audio||audio.state==='closed') {
    if(!gesture)return Promise.resolve(false);
    try {
      stopVoices();
      if(audio)audio.onstatechange=null;
      audio=new (window.AudioContext||window.webkitAudioContext)();
      audio.onstatechange=()=>{
        if(audio.state!=='running'){stopVoices();stopAmbience();}
        else if(!sound||!foreground())pauseAudio();
        else {lastBeep=-Infinity;syncAmbience();}
        renderSound();
      };
      unavailable=false;
    } catch {sound=false;unavailable=true;renderSound();return Promise.resolve(false);}
  }
  if(audio.state==='running'){syncAmbience();renderSound();return Promise.resolve(true);}
  // An automatic resume may wait for a gesture. A fresh gesture can retry it.
  if(resuming?.context===audio&&!gesture)return resuming.promise;
  const context=audio,attempt={context,promise:null};resuming=attempt;
  try {
    attempt.promise=Promise.resolve(context.resume()).then(()=>{
      if(audio!==context)return false;
      if(!sound||!foreground()){pauseAudio();return false;}
      lastBeep=-Infinity;syncAmbience();return context.state==='running';
    }).catch(()=>false).finally(()=>{
      if(resuming===attempt)resuming=null;
      renderSound();
    });
  } catch {resuming=null;renderSound();return Promise.resolve(false);}
  renderSound();return attempt.promise;
}
// Pitch follows the uncertain conductivity reading; strength changes cadence and volume.
export function toneSettings(reading) {
  const r=typeof reading==='number'?{power:reading,id:55,tone:'mid',stability:80}:reading;
  return {power:r.power,frequency: r.tone==='low'?155+r.id*3:r.tone==='mid'?340+(r.id-35)*9:650+(r.id-65)*12,
    interval:Math.max(95,540-r.power*4.4),gain:(.008+r.power*.00024)*(r.quiet?.18:1),
    wave:r.tone==='low'?'triangle':'sine',duration:r.stability<40?.055:.095};
}
export function beep(reading) {
  if(!sound||!audio||audio.state!=='running'||!foreground())return;
  const t=toneSettings(reading);
  if (t.power < 5 || performance.now() - lastBeep < t.interval) return;
  lastBeep = performance.now();
  const context=audio;let osc,gain,voice;
  try {
    osc=context.createOscillator();gain=context.createGain();
    voice={osc,dispose(){voices.delete(voice);osc.onended=null;osc.disconnect();gain.disconnect();}};
    voices.add(voice);osc.onended=voice.dispose;
    osc.type=t.wave;osc.frequency.value=t.frequency;
    gain.gain.setValueAtTime(.001,context.currentTime);
    gain.gain.exponentialRampToValueAtTime(t.gain,context.currentTime+.008);
    gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+t.duration);
    osc.connect(gain);gain.connect(context.destination);
    osc.start();osc.stop(context.currentTime+t.duration+.01);
  } catch {
    try{osc?.stop();}catch{}
    if(voice)voice.dispose();else {osc?.disconnect();gain?.disconnect();}
  }
}
export function initAudio() {
  $('sound').onclick = async () => {
    sound=!sound;unavailable=false;renderSound();
    if(!sound){pauseAudio();return;}
    if(await resumeAudio(true))beep(85);
  };
  document.addEventListener('pointerdown',()=>{resumeAudio(true);},{passive:true});
  document.addEventListener('keydown',e=>{if(!e.repeat)resumeAudio(true);});
  document.addEventListener('visibilitychange',()=>{if(foreground())resumeAudio();else pauseAudio();});
  window.addEventListener('pagehide',()=>{pageActive=false;pauseAudio();});
  window.addEventListener('pageshow',()=>{pageActive=true;resumeAudio();});
  renderSound();
}

