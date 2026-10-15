import { t as localize, dateLocale } from './i18n.js?v=0.55.4';
import { androidBridge } from './platform.js?v=0.55.4';
import { $ } from './dom.js?v=0.55.4';
import { createBackup, parseBackup, MAX_BACKUP_SIZE } from './backup-format.js?v=0.55.4';
import { s, RECOVERY_KEY, installBackupState } from './storage.js?v=0.55.4';
let candidate = null, reading = 0;
function message(text) { $('backupStatus').textContent = localize(text); }
function download(text, prefix) {
  if (androidBridge()) {
    if (!androidBridge().exportBackup(text)) throw new Error(localize('Не вдалося відкрити збереження файлу. Спробуй ще раз.'));
    return true;
  }
  const url = URL.createObjectURL(new Blob([text], {type:'application/json'}));
  const a = document.createElement('a');
  a.href = url; a.download = prefix + '-' + new Date().toISOString().replace(/[:.]/g,'-') + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
function preview(data) {
  candidate = data;
  const next = data.state;
  $('backupPreview').textContent = localize('Дата копії: ' + new Date(data.createdAt).toLocaleString(dateLocale()) + '\nДетектор / лопата / рюкзак: ' + [next.level,next.shovel,next.backpack].join(' / ') + '\nКупони: ' + next.coins + '\nКолекція: ' + next.collection.length + ' позицій\nВиїзд: ' + next.day + (next.atCamp ? ' · у таборі' : ' · у полі') + (next.pending ? '\nЄ незавершена знахідка — її буде відновлено.' : '') + '\n\nЗараз: ' + s.coins + ' купонів, ' + s.collection.length + ' позицій у колекції.\nВідновлення замінить поточний прогрес. Його копія залишиться в цьому браузері; також збережи її у файл.');
  $('backupConfirm').disabled = false;
  $('backupDialog').showModal();
}
export function initBackup() {
  window.addEventListener('last-signal-backup-export', e => {
    if (!androidBridge()) return;
    message(e.detail?.status === 'saved' ? 'Копію збережено у вибраний файл.' : e.detail?.status === 'cancelled' ? 'Збереження файлу скасовано. Прогрес гри не змінено.' : 'Не вдалося записати файл. Спробуй іншу папку.');
  });
  $('backupExport').onclick = () => {
    try { const native=download(createBackup(s), 'last-signal'); message(native ? 'Обери, куди зберегти копію.' : 'Файл передано браузеру для завантаження. Перевір папку «Завантаження».'); }
    catch (e) { message('Не вдалося створити копію: ' + e.message); }
  };
  $('backupFile').onchange = async e => {
    const token = ++reading, file = e.target.files?.[0]; candidate = null;
    e.target.value = ''; if (!file) return;
    try {
      if (file.size > MAX_BACKUP_SIZE) throw new Error('Файл завеликий. Максимум — 4 МБ.');
      const data = parseBackup(await file.text());
      if (token !== reading) return;
      preview(data); message('Копію перевірено. Прогрес ще не змінено.');
    } catch (error) { if(token === reading) message(error.message); }
  };
  $('backupCancel').onclick = () => { candidate = null; $('backupDialog').close(); message('Відновлення скасовано. Поточний прогрес збережено.'); };
  $('backupDialog').addEventListener('cancel', () => { candidate = null; });
  $('backupSafetyExport').onclick = $('backupExport').onclick;
  $('backupConfirm').onclick = () => {
    if (!candidate) return;
    try {
      const next = parseBackup(JSON.stringify(candidate)).state;
      installBackupState(next, createBackup(s));
    } catch (error) {
      $('backupPreview').textContent += localize('\n\nВідновлення не виконано. Не вдалося безпечно записати прогрес у браузері. Поточна гра не змінена. Збережи її у файл.');
      return;
    }
    candidate = null; $('backupConfirm').disabled = true;
    window.location.reload();
  };
  $('backupRecovery').onclick = () => {
    try { const text = localStorage.getItem(RECOVERY_KEY); if (!text) { message('Копії перед попереднім відновленням ще немає.'); return; } preview(parseBackup(text)); }
    catch { message('Не вдалося прочитати копію перед відновленням.'); }
  };
}

