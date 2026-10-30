import { generateRoomCode } from './roomCode.js';
import { safeParseJson } from './safeJson.js';
import { normalizePlan, stablePlanJson } from './planState.js';

const MOCK_KEY = 'tb_mock_rooms_v2';
const CODE_PATTERN = /^TRIP-[A-HJ-NP-Z2-9]{8}$/;
const INVITE_PATTERN = /^[a-f0-9]{64}$/;
const MAX_PAYLOAD_BYTES = 500000;

export function createRoomSaveQueue({ savedPayload, write, onSaved = () => {}, onError = () => {} }) {
  let saved = stablePlanJson(normalizePlan(savedPayload));
  let desired = null;
  let running = null;
  let paused = false;
  let disposed = false;
  const drain = async () => {
    while (!paused && !disposed && desired && stablePlanJson(desired) !== saved) {
      const payload = desired;
      try {
        const snapshot = await write(payload);
        if (disposed) return;
        saved = stablePlanJson(payload);
        onSaved(snapshot, saved);
      } catch (error) {
        if (!disposed) { paused = true; onError(error); }
        return;
      }
    }
  };
  return {
    get pending() { return Boolean(running); },
    enqueue(payload) {
      if (paused || disposed) return;
      desired = structuredClone(normalizePlan(payload));
      if (!running && stablePlanJson(desired) !== saved) {
        running = Promise.resolve().then(drain).finally(() => { running = null; });
      }
    },
    async flush() { await running; },
    async suspend() { paused = true; desired = null; await running; },
    reset(payload) { saved = stablePlanJson(normalizePlan(payload)); desired = null; paused = false; },
    dispose() { disposed = true; desired = null; }
  };
}

function validateRoomInput(code, nickname) {
  if (!CODE_PATTERN.test(code) || (nickname !== undefined && (typeof nickname !== 'string' || !nickname.trim() || nickname.length > 60))) throw new Error('ROOM_INPUT');
}

function roomPayload(plan) {
  const normalized = normalizePlan(plan);
  if (new TextEncoder().encode(JSON.stringify(normalized)).length > MAX_PAYLOAD_BYTES) throw new Error('ROOM_SIZE');
  return normalized;
}

async function ensureMembershipIdentity(client) {
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw new Error('ROOM_AUTH_SETUP');
  if (sessionData.session) return;
  const { error } = await client.auth.signInAnonymously();
  if (error) throw new Error('ROOM_AUTH_SETUP');
}

export function createRoomStore({ client = null, storage = null } = {}) {
  const membership = new Set();
  const localStorage = () => storage || globalThis.localStorage;
  const readMock = () => safeParseJson(localStorage().getItem(MOCK_KEY), {});
  const writeMock = rooms => localStorage().setItem(MOCK_KEY, JSON.stringify(rooms));
  const rpc = async (name, parameters) => {
    await ensureMembershipIdentity(client);
    const { data: response, error } = await client.rpc(name, parameters);
    if (error) {
      if (error.code === '40001' || error.message?.includes('ROOM_CONFLICT')) throw new Error('ROOM_CONFLICT');
      if (error.code === 'PGRST202' || error.code === '42P01') throw new Error('ROOM_SCHEMA_SETUP');
      throw new Error('ROOM_ACCESS');
    }
    return Array.isArray(response) ? response[0] : response;
  };
  return {
    mode: client ? 'supabase' : 'local-mock',
    async create(name, plan, nickname) {
      const code = generateRoomCode();
      validateRoomInput(code, nickname);
      if (typeof name !== 'string' || !name.trim() || name.length > 120) throw new Error('ROOM_INPUT');
      const invite = Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
      const payload = roomPayload(plan);
      if (client) return { ...await rpc('tb_create_room', { p_code: code, p_name: name, p_payload: payload, p_nickname: nickname, p_invite: invite }), invite };
      const rooms = readMock();
      if (rooms[code]) throw new Error('ROOM_CONFLICT');
      const room = { code, name, payload, version: 1, updated_at: new Date().toISOString(), members: [nickname] };
      rooms[code] = { ...room, invite };
      writeMock(rooms);
      membership.add(code);
      return { ...room, invite };
    },
    async join(code, invite, nickname) {
      validateRoomInput(code, nickname);
      if (!INVITE_PATTERN.test(invite)) throw new Error('ROOM_ACCESS');
      if (client) return rpc('tb_join_room', { p_code: code, p_invite: invite, p_nickname: nickname });
      const rooms = readMock();
      if (!rooms[code] || rooms[code].invite !== invite) throw new Error('ROOM_ACCESS');
      membership.add(code);
      return this.get(code);
    },
    async get(code) {
      validateRoomInput(code);
      if (client) return rpc('tb_get_room', { p_code: code });
      if (!membership.has(code)) throw new Error('ROOM_ACCESS');
      const stored = readMock()[code];
      if (!stored) throw new Error('ROOM_ACCESS');
      const { invite: _invite, ...room } = stored;
      return room;
    },
    async update(code, plan, expectedVersion) {
      validateRoomInput(code);
      const payload = roomPayload(plan);
      if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new Error('ROOM_CONFLICT');
      if (client) return rpc('tb_update_room', { p_code: code, p_payload: payload, p_expected_version: expectedVersion });
      if (!membership.has(code)) throw new Error('ROOM_ACCESS');
      const rooms = readMock();
      if (!rooms[code] || rooms[code].version !== expectedVersion) throw new Error('ROOM_CONFLICT');
      rooms[code] = { ...rooms[code], payload, version: expectedVersion + 1, updated_at: new Date().toISOString() };
      writeMock(rooms);
      return this.get(code);
    },
    subscribe(code, onChange, onStatus = () => {}) {
      if (!client) {
        const listener = event => { if (event.key === MOCK_KEY) onChange(); };
        globalThis.addEventListener?.('storage', listener);
        return () => globalThis.removeEventListener?.('storage', listener);
      }
      const channel = client.channel(`tb-room-${code}-${crypto.randomUUID()}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tb_rooms', filter: `code=eq.${code}` }, onChange)
        .subscribe(onStatus);
      return () => { void client.removeChannel(channel); };
    }
  };
}