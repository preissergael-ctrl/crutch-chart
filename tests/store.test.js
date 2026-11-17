import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, DEFAULT_STATE } from '../src/store.js';

const KEY = 'crutchchart:v1';
function fake(initial) {
  const m = new Map();
  if (initial !== undefined) m.set(KEY, initial);
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } };
}
const prog = (name = 'x') => ({ name, tonic: 'A', mode: 'minor', chords: [], shapes: [], beatsPerChord: 4, timeSig: '4/4', bpm: 90, patternId: 'folk', kind: 'strum', source: 'custom' });

test('corrupt storage falls back', () => {
  const s = createStore(fake('{oops'));
  assert.deepEqual(s.state.known, DEFAULT_STATE.known);
});
test('getItem throwing gives defaults', () => {
  const s = createStore({ getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } });
  assert.deepEqual(s.state, DEFAULT_STATE);
  assert.equal(s.save(), false);
});
test('missing storage works as no-op', () => {
  const s = createStore(undefined);
  assert.deepEqual(s.state, DEFAULT_STATE);
  assert.equal(s.save(), false);
});
test('wrong version or shape falls back', () => {
  for (const bad of ['{"version":2,"known":[],"saved":[],"settings":{}}', '{"version":1,"known":[1],"saved":[],"settings":{}}', '{"version":1,"known":[],"saved":{},"settings":{}}', '{"version":1,"known":[],"saved":[],"settings":null}', 'null', '[]']) {
    assert.deepEqual(createStore(fake(bad)).state, DEFAULT_STATE, bad);
  }
});
test('addSaved persists across reload', () => {
  const st = fake();
  const s = createStore(st);
  const id = s.addSaved(prog('mine'));
  assert.ok(id && typeof id === 'string');
  const s2 = createStore(st);
  assert.equal(s2.state.saved.length, 1);
  assert.equal(s2.state.saved[0].id, id);
  assert.equal(typeof s2.state.saved[0].createdAt, 'number');
  s2.removeSaved(id);
  assert.equal(createStore(st).state.saved.length, 0);
});
test('settings merge over defaults, defaults not mutated', () => {
  const st = fake(JSON.stringify({ version: 1, known: ['C'], saved: [], settings: { bpm: 70 } }));
  const s = createStore(st);
  assert.equal(s.state.settings.bpm, 70);
  assert.equal(s.state.settings.patternId, 'folk');
  assert.equal(s.state.settings.lastKey, null);
  const d = createStore(fake());
  d.state.known.push('Z');
  d.state.settings.bpm = 1;
  assert.deepEqual(createStore(fake()).state, DEFAULT_STATE);
  assert.deepEqual(DEFAULT_STATE.known, ['Am', 'F', 'C', 'Dm', 'G']);
  assert.equal(DEFAULT_STATE.settings.bpm, 90);
});
test('setKnown dedupes, drops non-strings and empties, keeps order, saves', () => {
  const st = fake();
  const s = createStore(st);
  s.setKnown(['G', 'C', 'G', '', 5, null, 'Am', 'C']);
  assert.deepEqual(s.state.known, ['G', 'C', 'Am']);
  assert.deepEqual(createStore(st).state.known, ['G', 'C', 'Am']);
});
test('bad backup rejected', () => {
  const s = createStore(fake());
  const before = JSON.stringify(s.state);
  for (const bad of ['{"foo":1}', 'not json', '{"app":"crutch-chart","version":1,"state":{"version":9}}', '{"app":"other","state":{"version":1,"known":[],"saved":[],"settings":{}}}']) {
    assert.throws(() => s.importBackup(bad), { message: "This file isn't a Crutch Chart backup." });
    assert.equal(JSON.stringify(s.state), before);
  }
});
test('export then import round-trips', () => {
  const a = createStore(fake());
  a.addSaved(prog('one'));
  a.setKnown(['E', 'A']);
  const json = a.exportBackup();
  const parsed = JSON.parse(json);
  assert.equal(parsed.app, 'crutch-chart');
  assert.equal(typeof parsed.exportedAt, 'number');
  assert.ok(json.includes('\n  '));
  const st = fake();
  const b = createStore(st);
  b.importBackup(json);
  assert.deepEqual(b.state, a.state);
  assert.deepEqual(createStore(st).state, a.state);
});

const good = (id) => ({ id, name: 'g', tonic: 'A', mode: 'minor', chords: [] });
test('bad saved entries are dropped on load and never crash', () => {
  const st = fake(JSON.stringify({ version: 1, known: ['C'], saved: [null, 1, {}, good('abc')], settings: {} }));
  const s = createStore(st);
  assert.deepEqual(s.state.saved.map((p) => p.id), ['abc']);
  assert.doesNotThrow(() => s.removeSaved('abc'));
  const s2 = createStore(fake(JSON.stringify({ version: 1, known: [], saved: [null, 1, {}], settings: {} })));
  assert.doesNotThrow(() => s2.removeSaved('abc'));
  assert.deepEqual(s2.state.saved, []);
});
test('import with mixed saved list keeps only valid entries', () => {
  const s = createStore(fake());
  const json = JSON.stringify({ app: 'crutch-chart', version: 1, state: { version: 1, known: ['E'], saved: [null, good('k'), { id: 'x' }], settings: {} } });
  s.importBackup(json);
  assert.deepEqual(s.state.saved.map((p) => p.id), ['k']);
  assert.deepEqual(s.state.known, ['E']);
});
