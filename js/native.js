import { $ } from './dom.js?v=0.55.4';
import { save } from './storage.js?v=0.55.4';
import { openMainMenu } from './menu.js?v=0.55.4';
import { currentScreen } from './interface.js?v=0.55.4';
import { showTab } from './ui.js?v=0.55.4';

import { androidBridge } from './platform.js?v=0.55.4';

// Called only by the packaged Activity. The normal browser keeps its own lifecycle.
export function initNative() {
  if (!androidBridge()) return;
  window.LastSignalApp = Object.freeze({
    pause() { save(); window.dispatchEvent(new Event('pagehide')); },
    resume() { window.dispatchEvent(new Event('pageshow')); },
    back() {
      const dialog = document.querySelector('dialog[open]');
      if (dialog) {
        const event = new Event('cancel', {cancelable:true});
        if (dialog.dispatchEvent(event)) dialog.close();
        return 'handled';
      }
      if (!save()) return 'handled';
      if (currentScreen() === 'menu') return 'exit';
      if (currentScreen() === 'settings') showTab('menu'); else openMainMenu();
      return 'handled';
    }
  });
  $('menuVersion').textContent = androidBridge().version();
}
