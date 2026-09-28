import { initBackup } from './backup.js?v=0.24.0';
// Only application entry point. Restore state, initialize screens, then resume the active trip/find.
import { initAudio } from './audio.js?v=0.24.0';
import { initCamp } from './camp.js?v=0.24.0';
import { initCollection } from './collection.js?v=0.24.0';
import { initDialogs } from './dialogs.js?v=0.24.0';
import { initExcavation, openExcavation } from './excavation.js?v=0.24.0';
import { initInventory } from './inventory.js?v=0.24.0';
import { initPacking, openPacking } from './packing.js?v=0.24.0';
import { initSearch } from './search.js?v=0.24.0';
import { initShop } from './shop.js?v=0.24.0';
import { loadGame, s, save } from './storage.js?v=0.24.0';
import { initUI, showTab } from './ui.js?v=0.24.0';
import { generate } from './world.js?v=0.24.0';
loadGame();
if (!s.objects.length && !s.atCamp) generate();
initShop();
initInventory();
initCamp();
initCollection();
initSearch();
initAudio();
initDialogs();
initExcavation();
initPacking();
initUI();
initBackup();
window.addEventListener('pagehide', save);
showTab(s.atCamp ? 'camp' : 'search');
save();
if (s.pending) {
  if (s.pending.revealed) openPacking();else openExcavation();
}
