import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { Readable } from 'node:stream';
import { isHttpUrl, isPrivateIp } from './urlSafety.js';

const DEFAULT_MAX_REDIRECTS = 3;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
export class UnsafeUrlError extends Error { name = 'UnsafeUrlError'; }
export class ResponseTooLargeError extends Error { name = 'ResponseTooLargeError'; }

export async function assertPublicUrl(urlString, isHostAllowed = () => true, lookup = dnsLookup) {
  if (!isHttpUrl(urlString)) throw new UnsafeUrlError('Unsupported URL');
  const { hostname } = new URL(urlString);
  if (!isHostAllowed(hostname)) throw new UnsafeUrlError('Host not allowed');
  const host = hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(({ address }) => isPrivateIp(address))) throw new UnsafeUrlError('Restricted address');
  return addresses[0];
}

// Pin DNS at socket creation; retain the URL hostname for Host and TLS verification (OWASP SSRF).
export function pinnedTransport({ url, address, headers, signal, requestImpl }) {
  return new Promise((resolve, reject) => {
    const request = (requestImpl ?? (url.protocol === 'https:' ? httpsRequest : httpRequest))(url, {
      method: 'GET', headers, signal, agent: false,
      lookup: (_hostname, options, callback) => callback(null, ...(options.all ? [[address]] : [address.address, address.family]))
    }, (incoming) => {
      try {
        const responseHeaders = new Headers();
        for (const [name, value] of Object.entries(incoming.headers)) {
          if (value !== undefined) responseHeaders.set(name, Array.isArray(value) ? value.join(', ') : value);
        }
        const emptyBody = [204, 205, 304].includes(incoming.statusCode);
        if (emptyBody) incoming.resume();
        resolve(new Response(emptyBody ? null : Readable.toWeb(incoming), { status: incoming.statusCode, headers: responseHeaders }));
      } catch (error) {
        incoming.destroy();
        reject(error);
      }
    });
    request.on('error', reject);
    request.end();
  });
}

function abortable(promise, signal) {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason);
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}

export async function safeFetch(urlString, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error('Request timed out')), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;
  let currentUrl = urlString;
  try {
    for (let count = 0; count <= (options.maxRedirects ?? DEFAULT_MAX_REDIRECTS); count++) {
      const address = await abortable(assertPublicUrl(currentUrl, options.isHostAllowed, options.lookup), signal);
      const response = await abortable((options.transport ?? pinnedTransport)({ url: new URL(currentUrl), address, headers: options.headers, signal }), signal);
      if (REDIRECT_STATUSES.has(response.status)) {
        const location = response.headers.get('location');
        if (response.body) await abortable(response.body.cancel(), signal);
        if (!location) throw new UnsafeUrlError('Missing redirect destination');
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      const buffer = await readBodyWithLimit(response, options.maxBytes ?? DEFAULT_MAX_BYTES, signal);
      const emptyBody = [204, 205, 304].includes(response.status);
      return { response: new Response(emptyBody ? null : buffer, { status: response.status, headers: response.headers }), finalUrl: currentUrl };
    }
    throw new UnsafeUrlError('Too many redirects');
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}

export async function readBodyWithLimit(response, maxBytes, signal) {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    if (response.body) {
      const cancellation = response.body.cancel();
      await (signal ? abortable(cancellation, signal) : cancellation);
    }
    throw new ResponseTooLargeError('Response too large');
  }
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await (signal ? abortable(reader.read(), signal) : reader.read());
      if (done) return Buffer.concat(chunks);
      total += value.byteLength;
      if (total > maxBytes) throw new ResponseTooLargeError('Response too large');
      chunks.push(Buffer.from(value));
    }
  } catch (error) {
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}
