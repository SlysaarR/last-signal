// audio responsibilities for Last Signal.
import { $ } from './dom.js?v=0.42.0';
export let audio = null,
  sound = false,
  lastBeep = 0;
// Pitch follows the uncertain conductivity reading; strength changes cadence and volume.
export function toneSettings(reading) {
  const r=typeof reading==='number'?{power:reading,id:55,tone:'mid',stability:80}:reading;
  return {power:r.power,frequency: r.tone==='low'?155+r.id*3:r.tone==='mid'?340+(r.id-35)*9:650+(r.id-65)*12,
    interval:Math.max(95,540-r.power*4.4),gain:(.008+r.power*.00024)*(r.quiet?.18:1),
    wave:r.tone==='low'?'triangle':'sine',duration:r.stability<40?.055:.095};
}
export function beep(reading) {
  const t=toneSettings(reading);
  if (!sound || !audio || t.power < 5 || document.visibilityState==='hidden' || performance.now() - lastBeep < t.interval) return;
  lastBeep = performance.now();
  const osc = audio.createOscillator(), gain = audio.createGain();
  osc.type=t.wave;
  osc.frequency.value=t.frequency;
  gain.gain.setValueAtTime(.001,audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(t.gain,audio.currentTime+.008);
  gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+t.duration);
  osc.connect(gain);gain.connect(audio.destination);
  osc.onended=()=>{osc.disconnect();gain.disconnect();};
  osc.start();osc.stop(audio.currentTime+t.duration+.01);
}
export function initAudio() {
  $('sound').onclick = async () => {
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      await audio.resume();
      sound = !sound;
      $('sound').textContent = 'Звук: ' + (sound ? 'так' : 'ні');
      $('sound').setAttribute('aria-label', sound ? 'Вимкнути звук' : 'Увімкнути звук');
      if (sound) beep(85);
    } catch (e) {
      $('sound').textContent = 'Звук недоступний';
    }
  };
}

