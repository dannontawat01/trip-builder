import { isIP } from 'node:net';

const GOOGLE_MAPS_SHORT_HOSTS = new Set(['goo.gl', 'maps.app.goo.gl', 'g.co', 'g.page']);
const GOOGLE_DOMAINS = new Set(['google.com', 'google.co.th', 'google.co.jp', 'google.com.sg', 'google.co.uk', 'google.com.au', 'google.co.nz', 'google.co.kr', 'google.com.tw', 'google.com.hk', 'google.fr', 'google.de', 'google.es', 'google.it', 'google.ca', 'google.nl', 'google.be', 'google.ch', 'google.at', 'google.dk', 'google.no', 'google.se', 'google.fi', 'google.pl', 'google.cz', 'google.ie', 'google.pt', 'google.gr', 'google.com.my', 'google.co.id', 'google.com.ph', 'google.com.vn', 'google.co.in', 'google.com.br', 'google.com.mx', 'google.com.tr', 'google.co.za', 'google.co.il', 'google.ae', 'google.com.sa']);

function parseIpv4(address) {
  const parts = address.split('.');
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : NaN));
  if (octets.some((octet) => Number.isNaN(octet) || octet > 255)) return null;
  return octets;
}

function isPrivateIpv4(octets) {
  const [first, second] = octets;
  if (first === 0 || first === 10 || first === 127) return true;
  if (first === 169 && second === 254) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 192 && second === 168) return true;
  if (first === 100 && second >= 64 && second <= 127) return true;
  if (first === 192 && (second === 0 || second === 2 || second === 88)) return true;
  if (first === 198 && (second === 18 || second === 19 || second === 51)) return true;
  if (first === 203 && second === 0 && octets[2] === 113) return true;
  if (first >= 224) return true;
  return false;
}

export function isPrivateIp(address) {
  if (typeof address !== 'string' || !address) return true;
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '');

  const ipv4 = parseIpv4(normalized);
  if (ipv4) return isPrivateIpv4(ipv4);

  if (isIP(normalized) !== 6) return true;
  if (normalized === '::' || normalized === '::1') return true;

  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedIpv4) {
    const mappedOctets = parseIpv4(mappedIpv4[1]);
    return !mappedOctets || isPrivateIpv4(mappedOctets);
  }

  const expandedAddress = normalized.replace(/\d+\.\d+\.\d+\.\d+$/, (tail) => {
    const octets = parseIpv4(tail);
    return `${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
  });
  const [left, right = ''] = expandedAddress.split('::');
  const leading = left ? left.split(':') : [];
  const trailing = right ? right.split(':') : [];
  const hextets = [...leading, ...Array(Math.max(0, 8 - leading.length - trailing.length)).fill('0'), ...trailing].map((part) => parseInt(part, 16));
  if (hextets.slice(0, 5).every((part) => part === 0) && hextets[5] === 0xffff) {
    return isPrivateIpv4([hextets[6] >> 8, hextets[6] & 255, hextets[7] >> 8, hextets[7] & 255]);
  }
  if ((hextets[0] & 0xe000) !== 0x2000) return true;
  if (hextets[0] === 0x2001 && (hextets[1] < 0x200 || hextets[1] === 0xdb8)) return true;
  if (hextets[0] === 0x2002 || (hextets[0] === 0x3fff && hextets[1] < 0x1000)) return true;
  return false;
}

export function isHttpUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    return typeof urlString === 'string' && urlString.length <= 4096 &&
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
      !parsed.username && !parsed.password && !parsed.port;
  } catch {
    return false;
  }
}

export function isGoogleMapsHost(hostname) {
  if (typeof hostname !== 'string') return false;
  const host = hostname.toLowerCase();
  return GOOGLE_MAPS_SHORT_HOSTS.has(host) || [...GOOGLE_DOMAINS].some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function isGoogleMapsUrl(urlString) {
  if (!isHttpUrl(urlString)) return false;
  return isGoogleMapsHost(new URL(urlString).hostname);
}

export function isImageCdnHost(hostname, domain) {
  return typeof hostname === 'string' && (hostname === domain || hostname.endsWith(`.${domain}`));
}
