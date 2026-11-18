import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateVoicings } from '../src/guitar/voicings.js';
import { CHORD_TYPES } from '../src/theory/chords.js';
import { mainShapes, positionOf, shapeTag } from '../src/guitar/shapes.js';
import { fromTab } from '../src/guitar/voicings.js';

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

const innerMute = (f) => {
  const on = f.map((x, i) => (x === null ? -1 : i)).filter((i) => i >= 0);
  return f.slice(on[0], on[on.length - 1] + 1).includes(null);
};
test('main shapes skip odd shapes', () => {
  const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  for (const q of ['', 'm', '7', 'm7', 'maj7', 'add9', 'sus4']) for (const r of roots) {
    const all = generateVoicings(r + q);
    const m = mainShapes(all);
    if (m.length === 1 && m[0] === all[0]) continue; // fallback keeps the best shape
    for (const v of m) {
      assert.ok(!innerMute(v.frets), `${r + q} ${v.key} has a muted inner string`);
      if (v.caged) continue;
      assert.ok(!(v.frets.includes(0) && v.baseFret > 5), `${r + q} ${v.key} mixes open strings with high frets`);
    }
  }
  const f = mainShapes(generateVoicings('F')).map((v) => v.key);
  assert.ok(!f.includes('10x211'), f.join(' '));
  const c = mainShapes(generateVoicings('C')).map((v) => v.key);
  assert.ok(!c.includes('x(15)(14)0(13)0'), c.join(' '));
});
test('"Open" only for real open-position shapes', () => {
  const at = (tab) => positionOf({ frets: fromTab(tab) });
  assert.equal(at('x32010'), 'open');
  assert.equal(at('000000'), 'open');
  assert.equal(at('10x211'), 1);
  assert.equal(at('x02550'), 2);
  for (const r of ['C', 'F', 'G', 'D', 'Bb']) for (const v of mainShapes(generateVoicings(r))) {
    if (shapeTag(v).startsWith('Open')) {
      assert.ok(v.frets.includes(0) && !innerMute(v.frets) && Math.max(...v.frets) <= 4, `${r} ${v.key}`);
    }
  }
});
