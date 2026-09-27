// Only application entry point. Restore state, initialize screens, then resume the active trip/find.
import { initAudio } from './audio.js';
import { initCamp } from './camp.js';
import { initCollection } from './collection.js';
import { initDialogs } from './dialogs.js';
import { initExcavation, openExcavation } from './excavation.js';
import { initInventory } from './inventory.js';
import { initPacking, openPacking } from './packing.js';
import { initSearch } from './search.js';
import { initShop } from './shop.js';
import { loadGame, s, save } from './storage.js';
import { initUI, showTab } from './ui.js';
import { generate } from './world.js';
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
window.addEventListener('pagehide', save);
showTab(s.atCamp ? 'camp' : 'search');
save();
if (s.pending) {
  if (s.pending.revealed) openPacking();else openExcavation();
}
