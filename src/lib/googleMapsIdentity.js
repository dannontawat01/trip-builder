const DECIMAL_ID = /^-?\d{1,20}$/;
const PLACE_ID = /^ChIJ[A-Za-z0-9_-]{20,}$/;
const MIN_SIGNED_64 = -(1n << 63n);
const MAX_UNSIGNED_64 = (1n << 64n) - 1n;

export function placeIdFromFeatureParts(parts) {
  if (!Array.isArray(parts) || parts.length !== 2 ||
      parts.some(part => typeof part !== 'string' || !DECIMAL_ID.test(part))) return null;
  const values = parts.map(part => BigInt(part));
  if (values.some(value => value < MIN_SIGNED_64 || value > MAX_UNSIGNED_64)) return null;
  const bytes = Buffer.alloc(20);
  bytes.set([10, 18, 9], 0);
  bytes.writeBigUInt64LE(BigInt.asUintN(64, values[0]), 3);
  bytes[11] = 17;
  bytes.writeBigUInt64LE(BigInt.asUintN(64, values[1]), 12);
  return bytes.toString('base64url');
}

export function isGooglePlaceId(value) {
  return typeof value === 'string' && PLACE_ID.test(value);
}
