import test from 'node:test';
import assert from 'node:assert/strict';
import { createHistory, pushHistory, undoHistory } from '../src/lib/itinHistory.js';
import { publicPlan, normalizePlan, normalizeBookings, validateBooking, validateStopDetails, shareUrl, stablePlanJson, daysBetween, cloudPlanPayload } from '../src/lib/planState.js';
import { safeArrayJson } from '../src/lib/safeJson.js';
import { LANG_STRINGS } from '../src/app/constants/translations.js';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createRoomSaveQueue } from '../src/lib/roomStore.js';
import * as planState from '../src/lib/planState.js';

const pageSource = await readFile(new URL('../src/app/page.js', import.meta.url), 'utf8');
const pageFunction = (name, nextName) => pageSource.slice(pageSource.indexOf(`  const ${name} =`), pageSource.indexOf(`  const ${nextName} =`));

const privateHotel = { id: 'private-hotel', name: 'Private hotel', checkIn: '2026-11-01', checkOut: '2026-11-03', confirmationCode: 'PRIVATE' };
const sharedHotel = { ...privateHotel, id: 'shared-hotel', name: 'Member hotel', confirmationCode: 'SHARED' };

test('successful room writes retain newly published bookings when consent resets', () => {
  const active = { code: 'room-a' };
  const saved = { version: 2, updated_at: '2026-10-30T12:00:00Z', payload: { nDays: 1, bookings: { hotels: [privateHotel] } } };
  const context = vm.createContext({ ...planState, active, roomRef: { current: active }, roomVersionRef: {}, roomTimestampRef: {}, roomSavedRef: {}, roomSharedBookingsRef: { current: planState.EMPTY_BOOKINGS }, setSharedRoomBookings: value => { context.shared = value; } });
  const callback = pageSource.slice(pageSource.indexOf('      onSaved: (saved, fingerprint) => {'), pageSource.indexOf('      onError: error =>'));
  vm.runInContext(`globalThis.handlers = {${callback}};`, context);
  context.handlers.onSaved(saved, stablePlanJson(saved.payload));
  const afterConsentReset = planState.roomPlanPayload({ nDays: 2, bookings: { hotels: [privateHotel] } }, context.roomSharedBookingsRef.current, false);
  assert.equal(afterConsentReset.bookings.hotels[0]?.confirmationCode, 'PRIVATE');
  assert.equal(context.shared.hotels[0]?.id, 'private-hotel');
});

const bookingStorage = () => {
  const entries = new Map();
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key), entries };
};

const roomPageHarness = (storage = bookingStorage(), identity = 'member@example.test') => {
  const context = vm.createContext({ ...planState, localStorage: storage, structuredClone, user: { email: identity }, roomRef: { current: { code: 'room-a' } }, roomBookingOwnerRef: { current: identity }, roomSharedBookingsRef: { current: planState.EMPTY_BOOKINGS }, liveRoomPayloadRef: {}, roomQueueRef: { current: null }, roomVersionRef: {}, roomTimestampRef: {}, roomSavedRef: {}, itineraryRef: {}, DEFAULT_BUDGET: {}, clearHistory: () => {}, setIncludePrivateBookings: () => {}, setIncludeRoomBookings: value => { context.consent = value; }, setItinInternal: () => {}, setBookings: value => { context.bookings = value; }, setChecklist: () => {}, setBudget: () => {}, setNDays: () => {}, setStartDate: () => {}, setStartTime: () => {}, setHotel: () => {}, setActiveCity: () => {}, setActiveCountry: () => {}, getCountryOfCity: () => 'th', setActiveMembersList: () => {}, console, t: key => key, toast: () => {} });
  context.setSharedRoomBookings = () => {};
  vm.runInContext(pageFunction('setItin', 'commitItin') + pageFunction('applyRoomSnapshot', 'activateRoom') + pageFunction('updateBookings', 'changeHistory') + '\nglobalThis.apply = applyRoomSnapshot; globalThis.update = updateBookings;', context);
  return context;
};

const syncPageHarness = () => {
  const original = normalizePlan({ nDays: 1 });
  const writes = [];
  const context = vm.createContext({ ...planState, roomRef: { current: { code: 'room-a' } }, readOnlyRef: { current: false }, roomSyncRef: { current: false }, roomConflictRef: { current: false }, liveRoomPayloadRef: { current: original }, roomSavedRef: { current: stablePlanJson(original) }, roomRevisionRef: { current: 0 }, roomVersionRef: { current: 1 }, roomTimestampRef: { current: 0 }, confirm: () => true, t: key => key, setIsRoomSyncing: () => {}, setRoomError: () => {}, toast: () => { context.successes++; }, reportRoomError: error => { context.failures.push(error.message); }, successes: 0, failures: [], applied: [], writes });
  context.roomStore = { get: async () => ({ version: 1, payload: original }) };
  context.roomQueueRef = { current: createRoomSaveQueue({ savedPayload: original, write: async payload => { writes.push(payload); return { version: context.roomVersionRef.current + 1 }; }, onSaved: (snapshot, fingerprint) => { context.roomVersionRef.current = snapshot.version; context.roomSavedRef.current = fingerprint; } }) };
  context.applyRoomSnapshot = snapshot => {
    context.applied.push(snapshot);
    context.liveRoomPayloadRef.current = normalizePlan(snapshot.payload);
    context.roomSavedRef.current = stablePlanJson(context.liveRoomPayloadRef.current);
    context.roomVersionRef.current = snapshot.version;
    context.roomQueueRef.current.reset(snapshot.payload);
  };
  vm.runInContext(pageFunction('syncRoomData', 'copyRoomInviteLink') + '\nglobalThis.sync = syncRoomData;', context);
  return context;
};

test('background reload resumes an edit committed while its request was pending', async () => {
  const page = syncPageHarness();
  let finishRead;
  page.roomStore.get = () => new Promise(resolve => { finishRead = resolve; });
  const syncing = page.sync(false);
  page.liveRoomPayloadRef.current = normalizePlan({ nDays: 4 });
  page.roomRevisionRef.current++;
  finishRead({ version: 2, payload: { nDays: 2 } });
  await syncing;
  await page.roomQueueRef.current.flush();
  assert.equal(page.applied.length, 0);
  assert.equal(page.writes.at(-1)?.nDays, 4);
});

test('manual discard waits for an active write and drops queued edits before reading', async () => {
  const page = syncPageHarness();
  const original = normalizePlan({ nDays: 1 });
  let finishWrite;
  let reads = 0;
  let server = { version: 1, payload: original };
  const writes = [];
  page.roomQueueRef.current = createRoomSaveQueue({ savedPayload: original, write: async payload => {
    writes.push(payload.nDays);
    await new Promise(resolve => { finishWrite = resolve; });
    server = { version: 2, payload };
    return server;
  }, onSaved: (snapshot, fingerprint) => { page.roomVersionRef.current = snapshot.version; page.roomSavedRef.current = fingerprint; } });
  page.roomStore.get = async () => { reads++; return server; };
  page.liveRoomPayloadRef.current = normalizePlan({ nDays: 2 });
  page.roomQueueRef.current.enqueue(page.liveRoomPayloadRef.current);
  await Promise.resolve();
  page.liveRoomPayloadRef.current = normalizePlan({ nDays: 3 });
  page.roomQueueRef.current.enqueue(page.liveRoomPayloadRef.current);
  const syncing = page.sync(true);
  await Promise.resolve();
  assert.equal(reads, 0);
  finishWrite();
  await syncing;
  await page.roomQueueRef.current.flush();
  assert.deepEqual(writes, [2]);
  assert.equal(page.applied[0].payload.nDays, 2);
  assert.equal(page.liveRoomPayloadRef.current.nDays, 2);
  assert.equal(page.successes, 1);
});

test('manual reload does not overwrite edits made after confirmation or claim success', async () => {
  const page = syncPageHarness();
  let finishRead;
  let markReadStarted;
  const readStarted = new Promise(resolve => { markReadStarted = resolve; });
  page.liveRoomPayloadRef.current = normalizePlan({ nDays: 2 });
  page.roomStore.get = () => new Promise(resolve => { finishRead = resolve; markReadStarted(); });
  const syncing = page.sync(true);
  await readStarted;
  page.liveRoomPayloadRef.current = normalizePlan({ nDays: 5 });
  page.roomRevisionRef.current++;
  finishRead({ version: 1, payload: { nDays: 1 } });
  await syncing;
  await page.roomQueueRef.current.flush();
  assert.equal(page.applied.length, 0);
  assert.equal(page.successes, 0);
  assert.equal(page.writes.at(-1)?.nDays, 5);
});

test('cancelled manual discard leaves local edits and the save queue intact', async () => {
  const page = syncPageHarness();
  page.liveRoomPayloadRef.current = normalizePlan({ nDays: 2 });
  page.confirm = () => false;
  page.roomStore.get = () => { throw new Error('must not fetch'); };
  await page.sync(true);
  page.roomQueueRef.current.enqueue(page.liveRoomPayloadRef.current);
  await page.roomQueueRef.current.flush();
  assert.equal(page.applied.length, 0);
  assert.equal(page.successes, 0);
  assert.equal(page.writes[0].nDays, 2);
});

test('a late failed refresh from a departed room cannot conflict the next room', async () => {
  const page = syncPageHarness();
  let failRead;
  page.roomStore.get = () => new Promise((_resolve, reject) => { failRead = reject; });
  const syncing = page.sync(false);
  page.roomRef.current = { code: 'room-b' };
  failRead(new Error('ROOM_CONFLICT'));
  await syncing;
  assert.deepEqual(page.failures, []);
});

test('cancelled invitation ignores a late successful join response', async () => {
  let finishJoin;
  let activations = 0;
  let personalLoads = 0;
  const context = vm.createContext({ readOnlyRef: { current: false }, roomJoinAttemptRef: { current: 0 }, roomRef: { current: null }, inputRoomInvite: 'invite', inputRoomCode: 'room-a', inputNickname: 'Member', setIsRoomSyncing: () => {}, supabaseSetupRequired: false, roomStore: { join: () => new Promise(resolve => { finishJoin = resolve; }) }, activateRoom: () => { activations++; }, setGroupModalOpen: () => {}, setIncludeRoomBookings: () => {}, loadPersonalPlans: () => { personalLoads++; }, toast: () => {}, t: key => key, reportRoomError: error => { throw error; } });
  vm.runInContext(pageFunction('handleGroupModalOpen', 'handleCreateRoom') + pageFunction('handleJoinRoom', 'handleLeaveRoom') + '\nglobalThis.join = handleJoinRoom; globalThis.close = handleGroupModalOpen;', context);
  const joining = context.join('room-a', 'Member', 'invite');
  context.close(false);
  finishJoin({ code: 'room-a' });
  await joining;
  assert.equal(activations, 0);
  assert.equal(personalLoads, 1);
});

test('failed automatic room restoration loads personal plans rather than stranding startup', async () => {
  let personalLoads = 0;
  let failures = 0;
  const context = vm.createContext({ readOnlyRef: { current: false }, roomJoinAttemptRef: { current: 0 }, roomRef: { current: null }, inputRoomInvite: 'invite', inputRoomCode: 'room-a', inputNickname: 'Member', setIsRoomSyncing: () => {}, supabaseSetupRequired: false, roomStore: { join: async () => { throw new Error('ROOM_ACCESS'); } }, loadPersonalPlans: () => { personalLoads++; }, reportRoomError: () => { failures++; } });
  vm.runInContext(pageFunction('handleJoinRoom', 'handleLeaveRoom') + '\nglobalThis.join = handleJoinRoom;', context);
  await context.join('room-a', 'Member', 'invite');
  assert.equal(personalLoads, 1);
  assert.equal(failures, 1);
});

test('personal session restoration handles cloud, mock and corrupt saved identities', () => {
  const storage = bookingStorage();
  storage.setItem('tb_sheet_user', '{"email":"cloud@example.test"}');
  storage.setItem('tb_mock_user', '{"email":"mock@example.test"}');
  assert.equal(planState.restorePersonalUser(storage, true).email, 'cloud@example.test');
  assert.equal(planState.restorePersonalUser(storage, false).email, 'mock@example.test');
  for (const invalid of ['{broken', 'null', '[]', '{}', '{"email":3}', '{"email":" "}']) {
    storage.setItem('tb_sheet_user', invalid);
    assert.equal(planState.restorePersonalUser(storage, true), null);
  }
});

test('remote snapshots and reloads preserve private room edits without deriving consent from shared content', () => {
  const storage = bookingStorage();
  const room = { code: 'room-a', version: 1, payload: { nDays: 1, bookings: { hotels: [sharedHotel] } } };
  const page = roomPageHarness(storage);
  page.apply(room);
  assert.deepEqual(page.bookings, { flights: [], hotels: [] });
  assert.equal(page.consent, false);
  page.update({ hotels: [privateHotel] });
  page.apply({ ...room, version: 2 });
  assert.equal(page.bookings.hotels[0].confirmationCode, 'PRIVATE');
  assert.equal(page.roomSharedBookingsRef.current.hotels[0].id, 'shared-hotel');
  assert.equal(page.liveRoomPayloadRef.current.bookings.hotels[0].confirmationCode, 'SHARED');
  const reloaded = roomPageHarness(storage);
  reloaded.apply(room);
  assert.equal(reloaded.bookings.hotels[0].id, 'private-hotel');
  const otherUser = roomPageHarness(storage, 'other@example.test');
  otherUser.apply(room);
  assert.deepEqual(otherUser.bookings, { flights: [], hotels: [] });
  reloaded.update({ flights: [], hotels: [] });
  reloaded.apply(room);
  assert.deepEqual(reloaded.bookings, { flights: [], hotels: [] });
  reloaded.apply({ ...room, code: 'room-b' });
  assert.deepEqual(reloaded.bookings, { flights: [], hotels: [] });
  assert.equal(reloaded.consent, false);
});

test('room exit and invitation cancellation use the restored personal account', () => {
  for (const cloud of [true, false]) {
    const calls = [];
    const context = vm.createContext({ EMPTY_BOOKINGS: planState.EMPTY_BOOKINGS, roomRef: { current: { code: 'room-a' } }, personalUserRef: { current: { email: 'member@example.test' } }, readOnlyRef: { current: false }, googleSheets: cloud ? {} : null, loadCloudPlans: email => calls.push(['cloud', email]), loadLocalMockPlans: email => calls.push(['mock', email]), loadGuestPlans: () => calls.push(['guest']), confirm: () => true, t: key => key, planTransitionRef: {}, roomJoinAttemptRef: { current: 0 }, roomQueueRef: { current: null }, roomSharedBookingsRef: {}, roomRevisionRef: { current: 0 }, setActiveRoom: () => {}, setActiveMembersList: () => {}, setIncludeRoomBookings: () => {}, setGroupModalOpen: () => {}, setIsRoomSyncing: () => {}, localStorage: bookingStorage(), toast: () => {}, activeLang: 'en' });
    context.setSharedRoomBookings = () => {};
    vm.runInContext(pageFunction('loadPersonalPlans', 'updateBookings') + pageFunction('handleLeaveRoom', 'syncRoomData') + pageFunction('handleGroupModalOpen', 'handleCreateRoom') + '\nhandleLeaveRoom(); handleGroupModalOpen(false);', context);
    assert.deepEqual(calls, Array.from({ length: 2 }, () => [cloud ? 'cloud' : 'mock', 'member@example.test']));
    context.personalUserRef.current = null;
    vm.runInContext('handleGroupModalOpen(false);', context);
    assert.deepEqual(calls.at(-1), ['guest']);
  }
});

test('old room save handlers do not enqueue stale render payloads', async () => {
  let queued = 0;
  const context = vm.createContext({ checklist: [], budget: {}, readOnlyRef: { current: false }, planTransitionRef: { current: false }, roomRef: { current: { code: 'room-a' } }, queueRoomSave: () => { queued++; } });
  vm.runInContext(pageFunction('saveItinData', 'hasMounted') + '\nglobalThis.save = saveItinData;', context);
  await context.save({ 1: [{ name: 'Stale itinerary' }] }, 1);
  assert.equal(queued, 0);
});

test('room payload preserves member bookings without opting private bookings in', () => {
  assert.equal(typeof planState.roomPlanPayload, 'function');
  const plan = { nDays: 1, bookings: { hotels: [privateHotel] } };
  const shared = { hotels: [sharedHotel] };
  const payload = planState.roomPlanPayload(plan, shared);
  assert.deepEqual(payload.bookings.hotels.map(booking => booking.id), ['shared-hotel']);
  assert.equal(JSON.stringify(payload).includes('PRIVATE'), false);
  assert.deepEqual(planState.roomPlanPayload(plan, shared, true).bookings.hotels.map(booking => booking.id), ['shared-hotel', 'private-hotel']);
});

test('private room bookings survive reload, stay isolated, and support clearing and corrupt storage', () => {
  assert.equal(typeof planState.createPrivateRoomBookingStore, 'function');
  const storage = bookingStorage();
  const privateStore = planState.createPrivateRoomBookingStore(storage);
  privateStore.write('room-a', 'member-a', { hotels: [privateHotel] });
  const reloaded = planState.createPrivateRoomBookingStore(storage);
  assert.equal(reloaded.read('room-a', 'member-a').hotels[0].confirmationCode, 'PRIVATE');
  for (const [room, identity] of [['room-b', 'member-a'], ['room-a', 'member-b'], ['room-a', 'guest']]) {
    assert.deepEqual(reloaded.read(room, identity), { flights: [], hotels: [] });
  }
  assert.deepEqual(planState.createPrivateRoomBookingStore(bookingStorage()).read('room-a', 'member-a'), { flights: [], hotels: [] });
  reloaded.write('room-a', 'member-a', { flights: [], hotels: [] });
  assert.deepEqual(privateStore.read('room-a', 'member-a'), { flights: [], hotels: [] });
  privateStore.write('room-a', 'member-a', { hotels: [privateHotel] });
  for (const key of storage.entries.keys()) storage.setItem(key, '{broken');
  assert.deepEqual(privateStore.read('room-a', 'member-a'), { flights: [], hotels: [] });
});

test('room startup restores the personal session without loading its itinerary', () => {
  let restored = null;
  let personalLoads = 0;
  const storage = bookingStorage();
  storage.setItem('tb_active_room', '{"code":"TRIP-ABCDEFGH"}');
  storage.setItem('tb_sheet_user', '{"email":"member@example.test"}');
  const context = vm.createContext({ ...planState, navigator: { language: 'en' }, localStorage: storage, normalizeTheme: value => value, setActiveLang: () => {}, setTheme: () => {}, readOnlyRef: { current: false }, roomParam: null, googleSheets: {}, personalUserRef: { current: null }, setUser: value => { restored = value; }, loadPersonalPlans: () => { personalLoads++; }, useEffect: effect => effect() });
  const marker = pageSource.indexOf('    // Detect browser language');
  const start = pageSource.lastIndexOf('  useEffect(() => {', marker);
  vm.runInContext(pageSource.slice(start, pageSource.indexOf('  const loadGuestPlans =', start)), context);
  assert.equal(restored?.email, 'member@example.test');
  assert.equal(personalLoads, 0);
});

test('manual discard applies an unchanged server version instead of reporting a false success', async () => {
  let applied = 0;
  let success = 0;
  const original = normalizePlan({ nDays: 1 });
  const edited = normalizePlan({ nDays: 2 });
  const queue = createRoomSaveQueue({ savedPayload: original, write: async () => {} });
  const context = vm.createContext({ stablePlanJson, roomRef: { current: { code: 'TRIP-ABCDEFGH' } }, readOnlyRef: { current: false }, roomSyncRef: { current: false }, roomPendingRef: { current: 0 }, roomQueueRef: { current: queue }, roomConflictRef: { current: false }, liveRoomPayloadRef: { current: edited }, roomSavedRef: { current: stablePlanJson(original) }, roomRevisionRef: { current: 0 }, roomVersionRef: { current: 1 }, roomTimestampRef: { current: 0 }, confirm: () => true, t: key => key, setIsRoomSyncing: () => {}, roomStore: { get: async () => ({ version: 1, payload: original }) }, applyRoomSnapshot: () => { applied++; context.liveRoomPayloadRef.current = original; }, setRoomError: () => {}, toast: () => { success++; }, reportRoomError: error => { throw error; } });
  vm.runInContext(pageFunction('syncRoomData', 'copyRoomInviteLink') + '\nglobalThis.sync = syncRoomData;', context);
  await context.sync(true);
  assert.equal(applied, 1);
  assert.equal(success, 1);
});

test('loading a personal plan resets room booking consent', () => {
  let consent = true;
  const context = vm.createContext({ clearHistory: () => {}, setIncludePrivateBookings: () => {}, setIncludeRoomBookings: value => { consent = value; }, normalizePlan, normalizeBookings, MAX_TRIP_DAYS: 15, EMPTY_BOOKINGS: { flights: [], hotels: [] }, itineraryRef: {}, structuredClone, setItinInternal: () => {}, setBookings: () => {} });
  vm.runInContext(pageFunction('setItin', 'commitItin') + '\nsetItin({ 1: [] });', context);
  assert.equal(consent, false);
});

test('room undo while an edited snapshot is pending eventually saves the original', async () => {
  const original = normalizePlan({ nDays: 1, itin: { 1: [] } });
  const edited = normalizePlan({ ...original, itin: { 1: [{ name: 'Museum' }] } });
  const writes = [];
  let finishWrite;
  const queue = createRoomSaveQueue({ savedPayload: original, write: async payload => {
    writes.push(payload);
    if (writes.length === 1) await new Promise(resolve => { finishWrite = resolve; });
    return { version: writes.length + 1 };
  } });
  queue.enqueue(edited);
  await Promise.resolve();
  queue.enqueue(original);
  finishWrite();
  await queue.flush();
  assert.equal(writes.length, 2);
  assert.equal(stablePlanJson(writes.at(-1)), stablePlanJson(original));
});

test('authentication feedback has explicit Thai and English translations', () => {
  const keys = ['authRequired', 'authInvalid', 'authSignInSuccess', 'authSignInMock', 'authSignInFailed', 'authSignOutSuccess', 'authSignOutMock', 'authSignOutFailed', 'authSignUpFailed'];
  for (const language of ['th', 'en']) {
    for (const key of keys) assert.equal(typeof LANG_STRINGS[language][key], 'string', `${language}.${key}`);
  }
});

test('history owns immutable itinerary snapshots and caps user edits at 50', () => {
  const itinerary = { 1: [{ name: 'Museum', dur: 60 }] };
  let history = pushHistory(createHistory(), itinerary);
  itinerary[1][0].dur = 90;
  assert.equal(undoHistory(history, itinerary).value[1][0].dur, 60);
  for (let index = 0; index < 60; index++) history = pushHistory(history, { 1: [index] });
  assert.equal(history.past.length, 50);
});

test('public sharing preserves routing fields but excludes bookings and private fields by default', () => {
  const plan = { nDays: 99, itin: { 1: [{ id: 'a', name: 'Museum', lat: 0, lng: 100, travelTime: 30, note: 'Meet here', photoUrl: 'https://example.com/a.jpg', secret: 'private' }] }, bookings: { flights: [{ confirmationCode: 'SECRET' }], hotels: [] } };
  const shared = publicPlan(plan);
  assert.equal(shared.days, 15);
  assert.equal(shared.itin[1][0].lat, 0);
  assert.equal(shared.itin[1][0].travelTime, 30);
  assert.equal(shared.itin[1][0].secret, undefined);
  assert.equal(shared.bookings, undefined);
  assert.ok(publicPlan(plan, true).bookings);
  assert.throws(() => shareUrl('https://example.com', { itin: { 1: [{ name: 'a'.repeat(10000) }] } }), /SHARE_TOO_LONG/);
});

test('storage and plan normalization recover corrupt and wrong-shaped guest storage', () => {
  assert.deepEqual(safeArrayJson('{broken'), []);
  assert.deepEqual(safeArrayJson('{}'), []);
  assert.deepEqual(safeArrayJson('[null,3,{"id":"a"}]'), [{ id: 'a' }]);
  assert.equal(normalizePlan({ days: 100 }).nDays, 15);
  assert.deepEqual(normalizePlan({ itin: { 1: 'bad' } }).itin[1], []);
});

test('stop notes and photos have strict boundaries', () => {
  assert.equal(validateStopDetails('a'.repeat(1000), 'https://example.com/a').note.length, 1000);
  assert.throws(() => validateStopDetails('a'.repeat(1001), ''), /NOTE_TOO_LONG/);
  for (const url of ['http://example.com', 'javascript:alert(1)', 'https://user:pass@example.com']) {
    assert.throws(() => validateStopDetails('', url), /PHOTO_HTTPS/);
  }
});

test('bookings validate flight times, hotel dates and private confirmation fields', () => {
  const hotel = { name: 'Hotel', checkIn: '2026-11-02', checkOut: '2026-11-01' };
  assert.throws(() => validateBooking('hotels', hotel), /BOOKING_DATES/);
  assert.throws(() => validateBooking('flights', { name: '' }), /BOOKING_NAME/);
  const flight = validateBooking('flights', { name: 'AB123', from: 'BKK', to: 'NRT', departure: '2026-11-01T10:00', arrival: '2026-11-01T17:00', confirmationCode: 'PRIVATE' });
  assert.equal(flight.confirmationCode, 'PRIVATE');
});

test('room fingerprints are invariant to PostgreSQL JSON key order', () => {
  assert.equal(stablePlanJson({ itin: { 1: [{ name: 'Museum', lat: 0 }] }, budget: { total: 20, currency: 'THB' } }), stablePlanJson({ budget: { currency: 'THB', total: 20 }, itin: { 1: [{ lat: 0, name: 'Museum' }] } }));
  assert.equal(daysBetween('2026-01-01', '2026-12-31', 3), 15);
  assert.equal(daysBetween('', '', 3), 3);
});

test('bookings reject impossible calendar dates and oversized private fields', () => {
  assert.throws(() => validateBooking('hotels', { name: 'Hotel', checkIn: '2026-02-30', checkOut: '2026-03-05' }), /BOOKING_DATES/);
  assert.throws(() => validateBooking('hotels', { name: 'Hotel', checkIn: '2026-03-01', checkOut: '2026-03-05', confirmationCode: 'a'.repeat(201) }), /BOOKING_FIELDS/);
});

test('serialized plan round trips preserve private bookings, notes, photos and day 15', () => {
  const plan = normalizePlan({ nDays: 15, itin: { 15: [{ name: 'Last stop', dur: 60, note: 'Meeting point', photoUrl: 'https://example.com/photo.jpg' }] },
    bookings: { flights: [{ name: 'AB123', from: 'BKK', to: 'NRT', departure: '2026-11-01T10:00', arrival: '2026-11-01T17:00', confirmationCode: 'FLIGHT' }],
      hotels: [{ name: 'Hotel', checkIn: '2026-11-01', checkOut: '2026-11-15', confirmationCode: 'HOTEL' }] } });
  const restored = normalizePlan(JSON.parse(JSON.stringify(plan)));
  assert.deepEqual(restored, plan);
  assert.equal(restored.itin[15][0].note, 'Meeting point');
  assert.equal(restored.bookings.flights[0].confirmationCode, 'FLIGHT');
  assert.equal(restored.bookings.hotels[0].confirmationCode, 'HOTEL');
});

test('cloud import payload preserves booking and itinerary fields using the Sheets contract', () => {
  const plan = { name: 'Imported trip', city_id: 'bkk', nDays: 15, start: '2026-11-01', time: '10:00', hotel: 'Hotel',
    itin: { 15: [{ name: 'Museum', dur: 60, note: 'Meet here', photoUrl: 'https://example.com/photo.jpg' }] },
    checklist: [{ id: 'check', checked: true }], budget: { currency: 'THB', total: 100 },
    bookings: { flights: [], hotels: [{ name: 'Hotel', checkIn: '2026-11-01', checkOut: '2026-11-03', confirmationCode: 'PRIVATE' }] } };
  const payload = cloudPlanPayload(plan, 'th');
  assert.equal(payload.n_days, 15);
  assert.equal(payload.start_date, plan.start);
  assert.equal(payload.start_time, plan.time);
  assert.equal(payload.country_id, 'th');
  assert.equal(payload.bookings.hotels[0].confirmationCode, 'PRIVATE');
  assert.equal(payload.itin[15][0].photoUrl, plan.itin[15][0].photoUrl);
  assert.deepEqual(payload.checklist, plan.checklist);
  assert.deepEqual(payload.budget, plan.budget);
});