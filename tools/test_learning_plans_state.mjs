import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../learning-plans-state.js', import.meta.url), 'utf8');
const { createLearningStore } = await import(`data:text/javascript,${encodeURIComponent(source)}`);

const plans = [
  { id: 'alpha', lessons: [{}, {}, {}] },
  { id: 'beta', lessons: [{}, {}] },
  { id: '__proto__', lessons: [{}] },
];
function clock(value = '2026-01-01T00:00:00.000Z') { return () => value; }
function mem(initial = null) {
  let value = initial;
  return {
    getItem() { return value; },
    setItem(_key, next) { value = next; },
    removeItem() { value = null; },
    value() { return value; },
  };
}

const storage = mem();
let store = createLearningStore(plans, { storage, now: clock() });
assert.equal(store.persistent, true);
assert.equal(store.get('alpha'), null);
assert.equal(store.enroll('missing'), null);
assert.equal(store.visit('alpha', 1), null);
assert.equal(store.complete('alpha', 0), null);
assert.equal(store.saveNote('alpha', 1, 3), null);
assert.equal(store.progress('missing'), null);
assert.equal(store.progress('alpha').started, false);

const enrolled = store.enroll('alpha');
assert.deepEqual(enrolled, { startedAt: '2026-01-01T00:00:00.000Z', completedAt: null, completed: [], notes: {}, lastDay: 1 });
assert.deepEqual(store.enroll('alpha'), enrolled);
assert.equal(store.visit('alpha', 2).lastDay, 2);
assert.equal(store.visit('alpha', 4), null);
assert.deepEqual(store.complete('alpha', 2).completed, [2]);
assert.deepEqual(store.complete('alpha', 2).completed, [2]);
assert.equal(store.progress('alpha').nextDay, 1);
assert.equal(store.progress('alpha').percent, 33);
assert.equal(store.complete('alpha', 1).completed.join(','), '1,2');
assert.equal(store.complete('alpha', 3).completedAt, '2026-01-01T00:00:00.000Z');
assert.deepEqual(store.progress('alpha'), { started: true, done: 3, total: 3, percent: 100, finished: true, nextDay: 3, lastDay: 2 });
assert.equal(store.uncomplete('alpha', 2).completedAt, null);
assert.deepEqual(store.progress('alpha').completed, undefined);
assert.equal(store.progress('alpha').nextDay, 2);

const long = ' x '.repeat(1000);
const noted = store.saveNote('alpha', 2, long);
assert.equal(noted.notes['2'].length, 2000);
assert.equal(noted.notes['2'][0], 'x');
assert.equal(store.saveNote('alpha', 2, '  hello  ').notes['2'], 'hello');
assert.equal(store.saveNote('alpha', 4, 'bad'), null);
const copy = store.get('alpha'); copy.completed.push(99); copy.notes['2'] = 'changed';
assert.deepEqual(store.get('alpha').completed, [1, 3]);
assert.equal(store.get('alpha').notes['2'], 'hello');

assert.equal(store.complete('beta', 1).completed[0], 1);
assert.equal(store.reset('beta'), true);
assert.equal(store.reset('beta'), false);
assert.equal(store.get('beta'), null);
assert.equal(store.enroll('__proto__').completed.length, 0);
assert.equal(store.get('__proto__').completed.length, 0);
assert.equal(Object.prototype.polluted, undefined);

const reloaded = createLearningStore(plans, { storage, now: clock() });
assert.equal(reloaded.persistent, true);
assert.deepEqual(reloaded.get('alpha').completed, [1, 3]);
assert.equal(reloaded.get('alpha').notes['2'], 'hello');
assert.equal(reloaded.get('beta'), null);

storage.setItem('other', JSON.stringify({ version: 1, plans: { alpha: { startedAt: 'x' } } }));
const corrupt = mem(JSON.stringify({ version: 1, plans: {
  alpha: { startedAt: 'ok', completed: [3, 3, 0, 99, '2'], notes: { 1: 'one', 99: 'bad', __proto__: 'bad' }, lastDay: 99 },
  unknown: { startedAt: 'bad', completed: [1] },
  __proto__: { startedAt: 'bad', completed: [1] },
} }));
const repaired = createLearningStore(plans, { storage: corrupt, now: clock() });
assert.deepEqual(repaired.get('alpha').completed, [3]);
assert.equal(repaired.get('alpha').lastDay, 3);
assert.deepEqual(repaired.get('alpha').notes, { 1: 'one' });
assert.equal(repaired.get('unknown'), null);
assert.equal(Object.prototype.polluted, undefined);

const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('blocked'); } };
const fallback = createLearningStore(plans, { storage: blocked, now: clock() });
assert.equal(fallback.persistent, false);
assert.equal(fallback.enroll('alpha').startedAt, '2026-01-01T00:00:00.000Z');
assert.equal(fallback.complete('alpha', 1).completed.length, 1);
const quota = { getItem() { return null; }, setItem() { throw new Error('quota'); }, removeItem() {} };
const quotaStore = createLearningStore(plans, { storage: quota, now: clock() });
assert.equal(quotaStore.persistent, true);
assert.equal(quotaStore.enroll('alpha').startedAt, '2026-01-01T00:00:00.000Z');
assert.equal(quotaStore.persistent, false);

storage.setItem('quran-oyen.learning-plans.v1', JSON.stringify({ version: 1, plans: { alpha: { startedAt: 'reload', completed: [1], notes: {}, lastDay: 1 } } }));
const reloadable = createLearningStore(plans, { storage, now: clock() });
assert.equal(reloadable.get('alpha').startedAt, 'reload');
storage.setItem('quran-oyen.learning-plans.v1', '{broken');
assert.equal(reloadable.reload(), false);
assert.equal(reloadable.get('alpha').startedAt, 'reload');

// Two stale instances must rebase each field-level operation on current storage.
const shared = mem();
const tabA = createLearningStore(plans, { storage: shared, now: clock() });
const tabB = createLearningStore(plans, { storage: shared, now: clock() });
tabA.complete('alpha', 1);
tabB.complete('beta', 1);
tabA.saveNote('alpha', 2, 'Catatan A');
tabB.saveNote('beta', 2, 'Catatan B');
tabB.complete('alpha', 2);
tabA.reload();
assert.deepEqual(tabA.get('alpha').completed, [1, 2]);
assert.equal(tabA.get('alpha').notes['2'], 'Catatan A');
assert.deepEqual(tabA.get('beta').completed, [1]);
assert.equal(tabA.get('beta').notes['2'], 'Catatan B');
tabA.reset('alpha');
tabB.visit('beta', 2);
tabA.reload();
assert.equal(tabA.get('alpha'), null);
assert.equal(tabA.get('beta').notes['2'], 'Catatan B');
assert.equal(fallback.reload(), false);
assert.equal(fallback.get('alpha').completed.length, 1);

console.log('learning-plans-state tests: ok');
