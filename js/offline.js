import { t as localize } from './i18n.js?v=0.54.1';
// Installation and release switching are separate from the player's save format.
const VERSION = '0.54.1';
export function initOffline({save, canUpdate}) {
  const $ = id => document.getElementById(id);
  const summary=$('offlineSummary'), status=$('offlineStatus'), check=$('offlineCheck');
  const update=$('appUpdate'), install=$('appInstall'), help=$('installHelp'), dialog=$('appUpdateDialog');
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !window.isSecureContext) {
    summary.textContent=localize('Офлайн недоступний');
    status.textContent=localize('Цей браузер не підтримує офлайн-режим. Грай з інтернетом або відкрий гру в іншому браузері.');
    check.hidden=true; install.hidden=true; update.hidden=true; return;
  }
  const sw=navigator.serviceWorker, base=new URL('./',document.baseURI);
  let registration=null, installPrompt=null, ready=false, readyVersion='', busy=false, applying=false, reloadOnce=false, notice='', lastCheck=0;
  const watched=new WeakSet();
  const standalone=window.matchMedia('(display-mode: standalone)');
  const installed=()=>standalone.matches || navigator.standalone === true;
  const online=()=>navigator.onLine !== false;
  const candidate=()=>registration?.waiting || (ready && readyVersion!==VERSION ? registration?.active : null);
  function render() {
    const waiting=candidate();
    summary.textContent=localize(waiting ? 'Доступне оновлення' : ready ? 'Готово до гри офлайн' : busy ? 'Завантаження…' : 'Офлайн ще не готовий');
    status.textContent=localize(notice || (waiting ? 'Нова версія готова. Онови гру в таборі — прогрес буде збережено перед перезапуском.' : ready ? (online() ? 'Гра й зображення завантажені. Можна грати без інтернету.' : 'Ти без інтернету. Офлайн-копія готова до гри.') : 'Потрібне повне завантаження. Під’єднай інтернет і натисни «Підготувати офлайн».'));
    update.hidden=!waiting; update.disabled=applying || busy;
    check.disabled=busy || applying || !online();
    check.textContent=localize(ready ? 'Перевірити оновлення' : 'Підготувати офлайн');
    install.hidden=installed() || !installPrompt;
    help.textContent=localize(installed() ? 'Гра відкрита як застосунок.' : 'Щоб додати іконку гри, відкрий меню браузера → «Встановити застосунок» або «На головний екран». На iPhone: «Поширити» → «На головний екран». Перед переходом в інший браузер збережи прогрес у файл нижче.');
  }
  function ask(worker,type,timeout=12000) {
    return new Promise((resolve,reject) => {
      const channel=new MessageChannel();
      const finish=(error,data)=>{clearTimeout(timer);channel.port1.close();channel.port2.close();error?reject(error):resolve(data);};
      const timer=setTimeout(()=>finish(new Error('Worker timeout')),timeout);
      channel.port1.onmessage=e=>finish(null,e.data);
      try {worker.postMessage({type},[channel.port2]);} catch(error){finish(error);}
    });
  }
  async function refresh() {
    const active=registration?.active;
    if (!active || active.state !== 'activated') { render(); return; }
    try {
      const reply=await ask(active,'OFFLINE_STATUS');
      if (active!==registration.active) return;
      ready=!!reply.ok && !!reply.ready;readyVersion=reply.version || '';
    } catch { ready=false; }
    render();
  }
  function unlock() { applying=false; if(dialog.open)dialog.close();render(); }
  function restart() {
    if(!applying || reloadOnce)return;
    reloadOnce=true;window.location.reload();
  }
  function watch(worker) {
    if(!worker || watched.has(worker))return;watched.add(worker);
    worker.addEventListener('statechange',()=>{
      if(worker.state==='installed') { busy=false;notice='';render(); }
      if(worker.state==='activated') {
        busy=false;
        // Activation must finish before navigating to its cached document.
        if(applying)restart();else {notice='';void refresh();}
      }
      if(worker.state==='redundant') {
        busy=false;notice='Завантаження не завершилося. Чинна гра доступна; повтори підготовку з інтернетом.';
        if(applying)unlock();else render();
      }
    });
  }
  async function register() {
    registration=await sw.register(new URL('sw.js',base).href,{scope:base.href,updateViaCache:'none'});
    registration.addEventListener('updatefound',()=>{
      busy=true;notice='Завантажуємо й перевіряємо нову версію. Можна продовжувати гру.';watch(registration.installing);render();
    });
    watch(registration.installing);watch(registration.waiting);watch(registration.active);
    busy=!!registration.installing;
    if(busy)notice='Завантажуємо гру та зображення для офлайну. Можна продовжувати гру.';
    await refresh();
  }
  async function checkRelease(manual=false) {
    if(busy || applying || !online())return;
    lastCheck=Date.now();busy=true;notice='Перевіряємо файли гри…';render();
    try {
      if(!registration)await register();
      else await registration.update();
      if(registration.installing) {watch(registration.installing);return;}
      const active=registration.active;
      if(active?.state==='activated') {
        const info=await ask(active,'OFFLINE_STATUS');
        if(!info.ready) {
          notice='Відновлюємо офлайн-копію…';render();
          const repaired=await ask(active,'OFFLINE_REPAIR',120000);
          if(!repaired.ok)throw new Error('Repair failed');
        }
      }
      notice='';await refresh();
      if(manual && !candidate() && ready)notice='Установлено актуальну версію. Офлайн-копія готова.';
    } catch {notice=ready ? 'Не вдалося перевірити оновлення. Поточна офлайн-копія доступна.' : 'Не вдалося завантажити всі файли. Перевір інтернет і вільне місце, потім повтори підготовку.';}
    finally {busy=!!registration?.installing;render();}
  }
  check.onclick=()=>checkRelease(true);
  update.onclick=async()=>{
    const worker=candidate();if(!worker || busy || applying)return;
    if(!canUpdate() || document.querySelector('dialog[open]')) {notice='Спочатку заверши розкопку та повернися до табору. Потім можна оновити гру.';render();return;}
    if(!save()) {notice='Не вдалося зберегти прогрес. Оновлення зупинено. Збережи резервну копію у файл нижче.';render();return;}
    applying=true;notice='Прогрес збережено. Оновлюємо гру…';dialog.showModal();render();
    try {
      const reply=await ask(worker,'OFFLINE_APPLY');
      if(!reply.ok) {
        notice=reply.reason==='tabs' ? 'Закрий інші вкладки й вікна цієї гри, потім повтори оновлення тут.' : 'Нова версія ще не готова повністю. Перевір оновлення з інтернетом.';
        unlock();return;
      }
      if(worker.state==='activated')restart();
      else {
        watch(worker);
        setTimeout(()=>{if(applying && !reloadOnce){notice='Перезапуск затримався. Спробуй оновити ще раз.';unlock();}},12000);
      }
    } catch {notice='Оновлення не підтверджене. Прогрес збережено; спробуй ще раз.';unlock();}
  };
  dialog.addEventListener('cancel',e=>{if(applying)e.preventDefault();});
  sw.addEventListener('controllerchange',()=>{if(applying)restart();else void refresh();});
  sw.addEventListener('message',e=>{
    if(e.data?.type!=='OFFLINE_PROGRESS' || !registration || ![registration.installing,registration.waiting,registration.active].includes(e.source) || applying)return;
    if(busy){notice='Підготовка офлайну: '+e.data.done+' / '+e.data.total+' файлів. Можна продовжувати гру.';render();}
  });
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;render();});
  window.addEventListener('appinstalled',()=>{installPrompt=null;render();help.textContent=localize('Гру встановлено. Її іконка доступна на головному екрані.');});
  standalone.addEventListener?.('change',render);
  install.onclick=async()=>{
    const prompt=installPrompt;if(!prompt)return;installPrompt=null;render();
    try {await prompt.prompt();await prompt.userChoice;} catch {help.textContent=localize('Спробуй встановити гру через меню браузера.');}
  };
  window.addEventListener('offline',render);
  window.addEventListener('online',()=>{notice='';render();void checkRelease();});
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState!=='visible')return;
    void refresh();
    if(Date.now()-lastCheck>30*60*1000)void checkRelease();
  });
  window.addEventListener('pageshow',()=>void refresh());
  // No polling timer: startup, reconnection, explicit check and infrequent foreground checks only.
  busy=true;lastCheck=Date.now();render();
  void register().catch(()=>{busy=false;notice='Офлайн поки недоступний. Під’єднай інтернет і повтори підготовку.';render();});
}
