import { initInterface } from './interface.js?v=0.52.0';
import { initGuide } from './guide-ui.js?v=0.52.0';
import { initEnvironment } from './environment-ui.js?v=0.52.0';
import { initCareer } from './career-ui.js?v=0.52.0';
import { initAtlas } from './atlas-ui.js?v=0.52.0';
import { activeSite } from '../data/atlas.js?v=0.52.0';
import { initOffline } from './offline.js?v=0.52.0';
import { initJournal } from './journal.js?v=0.52.0';
import { initOrders } from './orders-ui.js?v=0.52.0';
import { initFieldNotes } from './field-notes.js?v=0.52.0';
import { initBackup } from './backup.js?v=0.52.0';
// Only application entry point. Restore state, initialize screens, then resume the active trip/find.
import { initAudio } from './audio.js?v=0.52.0';
import { initCamp } from './camp.js?v=0.52.0';
import { initCollection } from './collection.js?v=0.52.0';
import { initDialogs } from './dialogs.js?v=0.52.0';
import { initExcavation, openExcavation } from './excavation.js?v=0.52.0';
import { initInventory } from './inventory.js?v=0.52.0';
import { initPacking, openPacking } from './packing.js?v=0.52.0';
import { initSearch } from './search.js?v=0.52.0';
import { initShop } from './shop.js?v=0.52.0';
import { loadGame, s, save } from './storage.js?v=0.52.0';
import { initUI, showTab } from './ui.js?v=0.52.0';
import { generate } from './world.js?v=0.52.0';
initInterface();
loadGame();
if (!s.objects.length && !s.atCamp && !activeSite(s)) generate();
initShop();
initInventory();
initCamp();
initJournal();
initOrders();
initFieldNotes();
initCollection();
initSearch();
initAudio();
initEnvironment();
initDialogs();
initExcavation();
initPacking();
initUI();
initBackup();
initAtlas();
initCareer();
initGuide();
window.addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') save();
});
showTab(s.atCamp ? 'camp' : 'search', {focus:false});
save();
if (s.pending) {
  if (s.pending.revealed) openPacking();else openExcavation();
}


initOffline({save, canUpdate: () => s.atCamp && !s.pending});
