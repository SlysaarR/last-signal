// Bundled into sw.js by build-offline.mjs. Keep this file free of imports.
const BASE = self.registration.scope;
const PREFIX = 'last-signal-offline:' + new URL(BASE).pathname + ':';
const CACHE = PREFIX + RELEASE.version + ':' + RELEASE.id;
const entries = new Map(RELEASE.assets.map(asset => [new URL(asset.url, BASE).href, asset]));
const INDEX = new URL('index.html', BASE).href;
const owned = name => name.startsWith(PREFIX);
const scoped = client => client?.url?.startsWith(BASE);
let repairing = null;
async function valid(response, asset) {
  if (!response?.ok || response.type === 'opaque') return false;
  const bytes = await response.clone().arrayBuffer();
  if (bytes.byteLength !== asset.bytes) return false;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('') === asset.sha256;
}
async function network(url, asset) {
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 20000);
  try {
    const response = await fetch(url, {cache:'no-store', credentials:'same-origin', signal:abort.signal});
    if (!await valid(response, asset)) throw new Error('Incomplete or different release: ' + asset.url);
    return response;
  } finally { clearTimeout(timer); }
}
async function complete() {
  const cache = await caches.open(CACHE), keys = new Set((await cache.keys()).map(r => r.url));
  return [...entries.keys()].every(url => keys.has(url));
}
async function progress(done) {
  const windows = await self.clients.matchAll({type:'window', includeUncontrolled:true});
  for (const client of windows.filter(scoped)) client.postMessage({type:'OFFLINE_PROGRESS', version:RELEASE.version, done, total:entries.size});
}
async function prepare() {
  const cache = await caches.open(CACHE), others = [];
  for (const name of (await caches.keys()).filter(name => owned(name) && name !== CACHE)) others.push(await caches.open(name));
  const list = [...entries], failures = []; let cursor = 0, done = 0;
  // Four downloads maximum. Wait for every writer before reporting a failed install.
  await Promise.all(Array.from({length:4}, async () => {
    while (cursor < list.length && !failures.length) {
      const [url, asset] = list[cursor++];
      try {
        let response = await cache.match(url);
        if (!await valid(response, asset)) {
          response = null;
          for (const old of others) {
            const candidate = await old.match(url);
            if (await valid(candidate, asset)) { response = candidate; break; }
          }
          await cache.put(url, response || await network(url, asset));
        }
        done++;
        if (done % 8 === 0 || done === list.length) await progress(done).catch(() => {});
      } catch (error) { failures.push(error); }
    }
  }));
  if (failures.length) throw failures[0];
}
self.addEventListener('install', event => {
  event.waitUntil(prepare().catch(async error => { await caches.delete(CACHE); throw error; }));
  // No automatic skipWaiting: downloading never interrupts a running game.
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Keep one previous release for requests from a tab already open at activation.
    const previous = (await caches.keys()).filter(name => owned(name) && name !== CACHE);
    previous.sort((a,b) => {
      const av=a.slice(PREFIX.length).split(':')[0].split('.').map(Number);
      const bv=b.slice(PREFIX.length).split(':')[0].split('.').map(Number);
      return bv[0]-av[0] || bv[1]-av[1] || bv[2]-av[2] || b.localeCompare(a);
    });
    await Promise.all(previous.slice(1).map(name => caches.delete(name)));
    // Do not claim unrelated/older uncontrolled documents on the first install.
  })());
});
async function resource(url) {
  const cache = await caches.open(CACHE);
  let response = await cache.match(url);
  if (response) return response;
  if (entries.has(url)) {
    try { response = await network(url, entries.get(url)); await cache.put(url, response.clone()); return response; }
    catch { return new Response('Офлайн-копія неповна. Під’єднай інтернет і перевір оновлення в таборі.', {status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}}); }
  }
  for (const name of (await caches.keys()).filter(name => owned(name) && name !== CACHE)) {
    response = await (await caches.open(name)).match(url); if (response) return response;
  }
  return new Response('Ресурс цієї версії недоступний. Відкрий гру заново.', {status:503});
}
async function navigation() {
  const response = await resource(INDEX);
  if (response.ok) return response;
  // A partially evicted cache must show a recovery route, never a newer document
  // paired with this worker's old module graph. Do not touch the player's save.
  return new Response(`<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#111f20"><title>Останній сигнал — відновлення</title><style>body{background:#111f20;color:#e7ede2;font:16px/1.65 system-ui;margin:48px auto;padding:0 24px;max-width:420px}a{display:inline-block;color:#c2d99b;padding:12px 0}</style><h1>Потрібен інтернет</h1><p>Браузер видалив частину офлайн-копії або не завершив її завантаження. Збереження гри не очищалося.</p><p>Під’єднай інтернет і спробуй відкрити гру ще раз. Якщо сторінка повторюється, закрий усі вікна цієї гри та відкрий її знову, щоб завершити оновлення.</p><a href="./">Відкрити гру ще раз →</a></html>`, {status:503, headers:{'Content-Type':'text/html; charset=utf-8'}});
}
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== new URL(BASE).origin) return;
  if (request.mode === 'navigate') {
    if (url.pathname === new URL(BASE).pathname || url.pathname === new URL(INDEX).pathname) event.respondWith(navigation());
    return;
  }
  if (entries.has(url.href) || ['js/', 'data/', 'css/', 'assets/app/', 'assets/coins/'].some(dir => url.href.startsWith(new URL(dir, BASE).href))) event.respondWith(resource(url.href));
});
self.addEventListener('message', event => {
  if (!scoped(event.source) || !event.ports?.[0]) return;
  const reply = data => event.ports[0].postMessage(data);
  event.waitUntil((async () => {
    try {
      if (event.data?.type === 'OFFLINE_STATUS') reply({ok:true, ready:await complete(), version:RELEASE.version});
      else if (event.data?.type === 'OFFLINE_REPAIR') {
        repairing ||= prepare().finally(() => { repairing = null; });
        await repairing; reply({ok:true, ready:await complete(), version:RELEASE.version});
      } else if (event.data?.type === 'OFFLINE_APPLY') {
        const windows = (await self.clients.matchAll({type:'window', includeUncontrolled:true})).filter(scoped);
        if (windows.length !== 1 || windows[0].id !== event.source.id) { reply({ok:false, reason:'tabs'}); return; }
        if (!await complete()) { reply({ok:false, reason:'incomplete'}); return; }
        await self.skipWaiting(); reply({ok:true});
      }
    } catch { reply({ok:false, reason:'download'}); }
  })());
});
