// audio responsibilities for Last Signal.
import { $ } from './dom.js?v=0.20.0';
export let audio = null,
  sound = false,
  lastBeep = 0;
export function beep(power) {
  if (!sound || !audio || power < 5 || performance.now() - lastBeep < 650 - power * 5) return;
  lastBeep = performance.now();
  const osc = audio.createOscillator(),
    gain = audio.createGain();
  osc.frequency.value = 250 + power * 8;
  gain.gain.setValueAtTime(.035, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .09);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + .1);
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
