import test from 'node:test';
import assert from 'node:assert/strict';
import { rotations, ENDINGS, withEnding, circleChain, borrowOptions, spiceOptions, nextHints, BASS_WALKS } from '../src/theory/methods.js';
import { progressionChords, borrowedFrom } from '../src/theory/roman.js';

test('rotations', () => {
  const r = rotations(['I', 'V', 'vi', 'IV']);
  assert.equal(r.length, 4);
  assert.deepEqual(r[0], ['I', 'V', 'vi', 'IV']);
  assert.deepEqual(r[2], ['vi', 'IV', 'I', 'V']);
});

test('endings', () => {
  assert.equal(ENDINGS.soft.name, 'Soft "amen" ending');
  assert.deepEqual(withEnding(['I', 'IV'], 'surprise', 'ionian'), ['I', 'IV', 'V', 'vi']);
  assert.deepEqual(withEnding(['i'], 'strong', 'aeolian'), ['i', 'V', 'i']);
  assert.deepEqual(withEnding(['i'], 'surprise', 'dorian'), ['i', 'V', 'bVI']);
});

test('circleChain', () => {
  assert.deepEqual(circleChain(4, 'ionian'), ['vi', 'ii', 'V', 'I']);
  assert.deepEqual(circleChain(2, 'ionian'), ['V', 'I']);
  assert.deepEqual(circleChain(5, 'aeolian'), ['bIII', 'bVI', 'ii°', 'V', 'i']);
});

test('borrowOptions', () => {
  assert.deepEqual(borrowOptions('IV', 'ionian'), [{ roman: 'iv', from: 'aeolian' }]);
  assert.deepEqual(borrowOptions('iv', 'aeolian'), [{ roman: 'IV', from: 'dorian' }]);
  assert.deepEqual(borrowOptions('xx', 'ionian'), []);
  assert.deepEqual(borrowOptions('I7', 'ionian'), []);
  const cases = [['C', 'ionian', ['I', 'ii', 'iii', 'IV', 'V', 'vi']], ['A', 'aeolian', ['i', 'iv', 'v']]];
  for (const [tonic, mode, keys] of cases) {
    for (const k of keys) {
      const opts = borrowOptions(k, mode);
      assert.ok(opts.length, k);
      for (const o of opts) assert.equal(o.from, borrowedFrom(o.roman, tonic, mode), `${k}->${o.roman}`);
    }
  }
});

test('spiceOptions', () => {
  const v = spiceOptions('V', 'C', 'ionian');
  assert.deepEqual(v.map((o) => o.roman), ['Vmaj7', 'V7', 'Vsus2', 'Vsus4', 'Vadd9', 'V6']);
  assert.ok(v.find((o) => o.roman === 'V7' && o.inKey === true));
  assert.ok(v.find((o) => o.roman === 'Vmaj7' && o.inKey === false));
  const i = spiceOptions('I', 'C', 'ionian');
  assert.equal(i.find((o) => o.roman === 'Imaj7').inKey, true);
  assert.equal(i.find((o) => o.roman === 'I7').inKey, false);
  for (const o of v) assert.ok(o.label && !/^\s/.test(o.label));
  assert.deepEqual(spiceOptions('vi', 'C', 'ionian').map((o) => o.roman), ['vi7', 'vi6', 'visus2', 'visus4']);
  assert.deepEqual(spiceOptions('Vmaj7/3', 'C', 'ionian').map((o) => o.roman), v.map((o) => o.roman));
  const d = spiceOptions('vii°', 'C', 'ionian');
  assert.equal(d.length, 1);
  assert.equal(d[0].roman, 'viiø7');
  assert.equal(d[0].label, 'darker, jazzier');
  assert.equal(d[0].inKey, true);
  assert.deepEqual(spiceOptions('III+', 'C', 'ionian'), []);
  assert.equal(spiceOptions('bVII', 'C', 'ionian')[0].roman, 'bVIImaj7');
});

test('nextHints', () => {
  assert.deepEqual(nextHints('V', 'ionian'), ['I', 'vi']);
  assert.deepEqual(nextHints('bVII', 'aeolian'), ['i', 'bIII']);
  assert.deepEqual(nextHints('vii°', 'ionian'), ['I', 'iii']);
  assert.deepEqual(nextHints('bVII', 'ionian'), []);
  assert.deepEqual(nextHints('nonsense', 'ionian'), []);
});

test('BASS_WALKS', () => {
  const syms = (k) => progressionChords(BASS_WALKS[k].romans, 'C').map((c) => c.symbol);
  assert.deepEqual(syms('descending'), ['C', 'G/B', 'Am', 'C/G', 'F']);
  assert.deepEqual(syms('climb'), ['C', 'Dm', 'C/E', 'F']);
});
