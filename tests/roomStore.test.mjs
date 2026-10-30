import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoomStore, createRoomSaveQueue } from '../src/lib/roomStore.js';
import { normalizePlan, stablePlanJson } from '../src/lib/planState.js';

const memoryStorage = () => {
  const entries = new Map();
  return { getItem: key => entries.get(key) || null, setItem: (key, value) => entries.set(key, value) };
};

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((accept, fail) => { resolve = accept; reject = fail; });
  return { promise, resolve, reject };
};

test('save queue coalesces intermediate renders and advances the expected version', async () => {
  const pendingWrite = deferred();
  const writes = [];
  let version = 1;
  const queue = createRoomSaveQueue({ savedPayload: { nDays: 1 }, write: async payload => {
    writes.push({ days: payload.nDays, version });
    if (writes.length === 1) await pendingWrite.promise;
    return { version: version + 1 };
  }, onSaved: snapshot => { version = snapshot.version; } });
  queue.enqueue({ nDays: 2 });
  await Promise.resolve();
  queue.enqueue({ nDays: 3 });
  queue.enqueue({ nDays: 4 });
  queue.enqueue({ nDays: 5 });
  pendingWrite.resolve();
  await queue.flush();
  assert.deepEqual(writes, [{ days: 2, version: 1 }, { days: 5, version: 2 }]);
  queue.enqueue({ nDays: 5 });
  await queue.flush();
  assert.equal(writes.length, 2);
});

test('save queue owns immutable desired snapshots', async () => {
  const writes = [];
  const queue = createRoomSaveQueue({ savedPayload: { nDays: 1 }, write: async payload => { writes.push(payload); } });
  const plan = { nDays: 2, itin: { 1: [{ name: 'Museum' }] } };
  queue.enqueue(plan);
  plan.itin[1][0].name = 'Mutated after enqueue';
  await queue.flush();
  assert.equal(writes[0].itin[1][0].name, 'Museum');
});

test('discard suspension cancels unsent work and waits for the active write', async () => {
  const pendingWrite = deferred();
  const writes = [];
  const queue = createRoomSaveQueue({ savedPayload: { nDays: 1 }, write: async payload => { writes.push(payload.nDays); await pendingWrite.promise; } });
  queue.enqueue({ nDays: 2 });
  await Promise.resolve();
  queue.enqueue({ nDays: 3 });
  let settled = false;
  const suspended = queue.suspend().then(() => { settled = true; });
  queue.enqueue({ nDays: 4 });
  await Promise.resolve();
  assert.equal(settled, false);
  pendingWrite.resolve();
  await suspended;
  assert.deepEqual(writes, [2]);
  queue.reset({ nDays: 2 });
  queue.enqueue({ nDays: 2 });
  await queue.flush();
  assert.deepEqual(writes, [2]);
});

test('disposing a room queue ignores late responses and never writes queued edits', async () => {
  const pendingWrite = deferred();
  let writes = 0;
  let acknowledgements = 0;
  const queue = createRoomSaveQueue({ savedPayload: {}, write: async () => { writes++; await pendingWrite.promise; }, onSaved: () => { acknowledgements++; } });
  queue.enqueue({ nDays: 2 });
  await Promise.resolve();
  queue.enqueue({ nDays: 4 });
  queue.dispose();
  pendingWrite.resolve();
  await queue.flush();
  queue.enqueue({ nDays: 5 });
  await queue.flush();
  assert.equal(writes, 1);
  assert.equal(acknowledgements, 0);
});

test('conflicts halt the queue until an explicit snapshot reset', async () => {
  const failures = [];
  let writes = 0;
  const original = normalizePlan({ nDays: 1 });
  let saved = stablePlanJson(original);
  const queue = createRoomSaveQueue({ savedPayload: original, write: async () => { writes++; throw new Error('ROOM_CONFLICT'); }, onSaved: (_snapshot, fingerprint) => { saved = fingerprint; }, onError: error => failures.push(error.message) });
  queue.enqueue({ nDays: 2 });
  await queue.flush();
  queue.enqueue({ nDays: 3 });
  await queue.flush();
  assert.equal(writes, 1);
  assert.deepEqual(failures, ['ROOM_CONFLICT']);
  assert.equal(saved, stablePlanJson(original));
  queue.reset(original);
  queue.enqueue({ nDays: 4 });
  await queue.flush();
  assert.equal(writes, 2);
});

test('local rooms are explicitly mock, require invitation, and reject stale versions', async () => {
  const store = createRoomStore({ storage: memoryStorage() });
  assert.equal(store.mode, 'local-mock');
  const created = await store.create('Trip', { itin: { 1: [] }, nDays: 1 }, 'Host');
  assert.match(created.code, /^TRIP-[A-Z2-9]{8}$/);
  await assert.rejects(() => store.join(created.code, 'bad', 'Guest'), /ROOM_ACCESS/);
  await store.join(created.code, created.invite, 'Guest');
  const updated = await store.update(created.code, { itin: { 1: [] }, nDays: 2 }, created.version);
  assert.equal(updated.version, created.version + 1);
  await assert.rejects(() => store.update(created.code, {}, created.version), /ROOM_CONFLICT/);
});

test('anonymous auth failure denies room access and never calls public RPC', async () => {
  let calls = 0;
  const client = { auth: { getSession: async () => ({ data: { session: null } }), signInAnonymously: async () => ({ error: { message: 'disabled' } }) }, rpc: async () => { calls++; } };
  const store = createRoomStore({ client });
  await assert.rejects(() => store.create('Trip', {}, 'Host'), /ROOM_AUTH_SETUP/);
  assert.equal(calls, 0);
});

test('Supabase updates authenticate, preserve bookings and send the expected version', async () => {
  const calls = [];
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'member' } } } }) },
    rpc: async (name, parameters) => { calls.push({ name, parameters }); return { data: { version: 5, payload: parameters.p_payload } }; }
  };
  const store = createRoomStore({ client });
  const plan = { nDays: 15, itin: { 15: [{ name: 'Museum', dur: 60, note: 'Meet here', photoUrl: 'https://example.com/photo.jpg' }] },
    bookings: { flights: [], hotels: [{ name: 'Hotel', checkIn: '2026-11-01', checkOut: '2026-11-03', confirmationCode: 'PRIVATE' }] } };
  const updated = await store.update('TRIP-ABCDEFGH', plan, 4);
  assert.equal(store.mode, 'supabase');
  assert.equal(calls[0].name, 'tb_update_room');
  assert.equal(calls[0].parameters.p_expected_version, 4);
  assert.equal(updated.payload.bookings.hotels[0].confirmationCode, 'PRIVATE');
  assert.equal(updated.payload.itin[15][0].note, 'Meet here');
});

test('Supabase denies unauthorized reads and maps version conflicts without mock fallback', async () => {
  const storage = { getItem: () => { throw new Error('must not read mock'); }, setItem: () => { throw new Error('must not write mock'); } };
  const client = {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'member' } } } }) },
    rpc: async () => ({ error: { code: '42501', message: 'ROOM_ACCESS' } })
  };
  const store = createRoomStore({ client, storage });
  await assert.rejects(() => store.get('TRIP-ABCDEFGH'), /ROOM_ACCESS/);
  client.rpc = async () => ({ error: { code: '40001', message: 'ROOM_CONFLICT' } });
  await assert.rejects(() => store.update('TRIP-ABCDEFGH', {}, 1), /ROOM_CONFLICT/);
  client.rpc = async () => ({ error: { code: 'PGRST202' } });
  await assert.rejects(() => store.get('TRIP-ABCDEFGH'), /ROOM_SCHEMA_SETUP/);
});

test('room subscriptions filter by room and remove the channel on cleanup', () => {
  let filter;
  let received = 0;
  let removed;
  const channel = {
    on: (_event, options, callback) => { filter = options; callback(); return channel; },
    subscribe: () => channel
  };
  const client = { channel: () => channel, removeChannel: value => { removed = value; } };
  const cleanup = createRoomStore({ client }).subscribe('TRIP-ABCDEFGH', () => { received++; });
  assert.equal(filter.filter, 'code=eq.TRIP-ABCDEFGH');
  assert.equal(received, 1);
  cleanup();
  assert.equal(removed, channel);
});

test('another local store cannot read or update without invitation membership', async () => {
  const storage = memoryStorage();
  const host = createRoomStore({ storage });
  const outsider = createRoomStore({ storage });
  const room = await host.create('Trip', {}, 'Host');
  await assert.rejects(() => outsider.get(room.code), /ROOM_ACCESS/);
  await assert.rejects(() => outsider.update(room.code, {}, 1), /ROOM_ACCESS/);
  await outsider.join(room.code, room.invite, 'Guest');
  assert.equal((await outsider.get(room.code)).code, room.code);
});