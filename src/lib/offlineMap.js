const MESSAGE_TIMEOUT_MS = 20000;

export function getOfflineProvider(template, licensed) {
  if (licensed !== 'true' || typeof template !== 'string' || template.length > 2048) return null;
  try {
    if (!['{z}', '{x}', '{y}'].every(token => template.split(token).length === 2)) return null;
    const url = new URL(template.replace('{z}', '12').replace('{x}', '1').replace('{y}', '1'));
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || /[{}\s\\]/.test(template.replace('{z}', '').replace('{x}', '').replace('{y}', ''))) return null;
    if (!/^[a-z0-9.-]+$/.test(url.hostname) || !url.hostname.includes('.') || /^\d[\d.]*$/.test(url.hostname) || /(^|\.)(localhost|local|internal|test|invalid)$/.test(url.hostname)) return null;
    if (/(^|\.)(openstreetmap\.org|cartocdn\.com|carto\.com)$/.test(url.hostname)) return null;
    if (new URL(template).origin !== url.origin) return null;
    return { template, licensed: true };
  } catch {
    return null;
  }
}

export function sendOfflineMessage(worker, payload, { onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    if (!worker || signal?.aborted) return reject(new Error('worker-unavailable'));
    const channel = new MessageChannel();
    let timer;
    const finish = (error, message) => {
      clearTimeout(timer);
      channel.port1.close();
      signal?.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(message);
    };
    const abort = () => finish(new Error('cancelled'));
    const resetTimeout = () => {
      clearTimeout(timer);
      timer = setTimeout(() => finish(new Error('worker-timeout')), MESSAGE_TIMEOUT_MS);
    };
    channel.port1.onmessage = event => {
      if (event.data?.status === 'progress') {
        onProgress?.(event.data);
        resetTimeout();
      } else if (event.data?.status === 'error') finish(new Error(event.data.code || 'offline-failed'));
      else finish(null, event.data);
    };
    signal?.addEventListener('abort', abort, { once: true });
    resetTimeout();
    try { worker.postMessage(payload, [channel.port2]); } catch (error) { finish(error); }
  });
}