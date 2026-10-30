export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 8;
export const ROOM_CODE_PREFIX = 'TRIP-';

function defaultRandomValues(length) {
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
}

export function generateRoomCode(getRandomValues = defaultRandomValues) {
  const randomBytes = getRandomValues(ROOM_CODE_LENGTH);
  let code = '';
  for (const byte of randomBytes) {
    // 256 is a multiple of 32, so modulo introduces no bias.
    code += ROOM_CODE_ALPHABET[byte % ROOM_CODE_ALPHABET.length];
  }
  return `${ROOM_CODE_PREFIX}${code}`;
}
