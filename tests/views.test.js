// Pure helpers from the views (no DOM needed).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { savedName, entryFor } from '../src/ui/views/progression.js';
import { openParams } from '../src/ui/views/saved.js';
import { PROGRESSIONS } from '../src/content/progressions.js';

test('savedName accepts a short plain name only', () => {
  assert.equal(savedName('  Rainy day  '), 'Rainy day');
  assert.equal(savedName('x'.repeat(60)), 'x'.repeat(60));
  for (const bad of [undefined, null, 5, '', '   ', 'x'.repeat(61), 'a\nb', 'a\u0000b', ['a']]) assert.equal(savedName(bad), null, String(bad));
});

test('entryFor only trusts an id whose chords and mode match the link', () => {
  const a = PROGRESSIONS.axis;
  assert.equal(entryFor({ id: 'axis', m: a.mode, r: a.romans }), a);
  assert.equal(entryFor({ id: 'axis', m: a.mode, r: ['I', 'IV'] }), null);
  assert.equal(entryFor({ id: 'axis', m: 'aeolian', r: a.romans }), null);
  assert.equal(entryFor({ id: 'toString', m: a.mode, r: a.romans }), null);
  assert.equal(entryFor({ m: a.mode, r: a.romans }), null);
});

const chordsFor = (romans) => romans.map((roman) => ({ roman, name: 'X' }));
test('openParams passes the saved name and, when it came from a named progression, its id', () => {
  const tb = PROGRESSIONS['twelve-bar'];
  const saved = { id: 's1', name: 'My blues', tonic: 'E', mode: tb.mode, chords: chordsFor(tb.romans), bpm: 90, beatsPerChord: 4, patternId: 'folk', kind: 'strum', progId: 'twelve-bar' };
  const q = openParams(saved);
  assert.equal(q.n, 'My blues');
  assert.equal(q.id, 'twelve-bar');
  assert.deepEqual(q.r, tb.romans);
  assert.equal(q.src, 'saved');
  // Older saves have no progId: a unique match on chords and mode finds it.
  assert.equal(openParams({ ...saved, progId: undefined }).id, 'twelve-bar');
  // Same chords as two named progressions (sad and epic minor loops): no guess.
  const sad = PROGRESSIONS['sad-aeolian'];
  assert.equal(openParams({ ...saved, mode: sad.mode, chords: chordsFor(sad.romans), progId: undefined }).id, undefined);
  assert.equal(openParams({ ...saved, mode: sad.mode, chords: chordsFor(sad.romans), progId: 'epic-aeolian' }).id, 'epic-aeolian');
  // A progId that does not match the chords is ignored.
  assert.equal(openParams({ ...saved, progId: 'axis' }).id, 'twelve-bar');
  assert.equal(openParams({ ...saved, chords: chordsFor(['I', 'IV']), progId: 'axis' }).id, undefined);
});
