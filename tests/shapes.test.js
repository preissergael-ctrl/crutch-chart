import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateVoicings } from '../src/guitar/voicings.js';
import { CHORD_TYPES } from '../src/theory/chords.js';
import { mainShapes } from '../src/guitar/shapes.js';

test('main shapes for F', () => {
  const m = mainShapes(generateVoicings('F'));
  assert.ok(m.length <= 12 && m.length > 3);
  assert.equal(m[0].key, '133211');
  assert.ok(m.some((v) => v.key === 'x8(10)(10)(10)8'), m.map((v) => v.key).join(' '));
});

test('main shapes for C start with the open shape', () => {
  assert.equal(mainShapes(generateVoicings('C'))[0].key, 'x32010');
});

test('every type and root has a main shape', () => {
  const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  for (const q of Object.keys(CHORD_TYPES)) for (const r of roots) {
    const m = mainShapes(generateVoicings(r + q));
    assert.ok(m.length >= 1 && m.length <= 12, r + q);
  }
});
