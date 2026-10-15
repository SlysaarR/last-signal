export function androidBridge() {
  if (window.location?.origin !== 'https://appassets.androidplatform.net' || !window.location?.pathname?.startsWith('/assets/game/')) return null;
  const bridge = window.LastSignalAndroid;
  return typeof bridge?.version === 'function' && typeof bridge?.exportBackup === 'function' ? bridge : null;
}

