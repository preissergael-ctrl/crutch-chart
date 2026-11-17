import test from 'node:test';
import assert from 'node:assert/strict';
import { PROGRESSIONS } from '../src/content/progressions.js';
import { MOODS } from '../src/content/moods.js';
import { METHODS } from '../src/content/methods.js';
import { FAMOUS_LOOPS } from '../src/content/moods.js';
import { progressionChords } from '../src/theory/roman.js';

const s = (str) => str.split(' ');
const x = (sym, n) => Array(n).fill(sym);
const TABLE = [
  ['happy-145', 'C ionian', 'C F G C', 'G', 'G C D G'],
  ['axis', 'C ionian', 'C G Am F', 'D', 'D A Bm G'],
  ['bitter-6415', 'C ionian', 'Am F C G', 'G', 'Em C G D'],
  ['pachelbel', 'C ionian', 'C G Am Em F C F G', 'D', 'D A Bm F#m G D G A'],
  ['sad-aeolian', 'A aeolian', 'Am F C G', 'E', 'Em C G D'],
  ['sad-1415', 'A aeolian', 'Am Dm Am Em', 'D', 'Dm Gm Dm Am'],
  ['royal-road', 'C ionian', 'F G Em Am', 'D', 'G A F#m Bm'],
  ['hope-4156', 'C ionian', 'F C G Am', 'G', 'C G D Em'],
  ['fifties', 'C ionian', 'C Am F G', 'A', 'A F#m D E'],
  ['romantic-7ths', 'C ionian', 'Cmaj7 Am7 Dm7 G7', 'F', 'Fmaj7 Dm7 Gm7 C7'],
  ['lydian-12', 'C lydian', 'C D', 'G', 'G A'],
  ['dreamy-maj7', 'C ionian', 'Cmaj7 Fmaj7', 'G', 'Gmaj7 Cmaj7'],
  ['epic-aeolian', 'A aeolian', 'Am F C G', 'D', 'Dm Bb F C'],
  ['mario', 'C ionian', 'Ab Bb C', 'D', 'Bb C D'],
  ['dorian-vamp', 'A dorian', 'Am7 D7', 'D', 'Dm7 G7'],
  ['two-five-one', 'C ionian', 'Dm7 G7 Cmaj7', 'Bb', 'Cm7 F7 Bbmaj7'],
  ['twelve-bar', 'A mixolydian',
    [...x('A7', 4), ...x('D7', 2), ...x('A7', 2), 'E7', 'D7', 'A7', 'E7'].join(' '),
    'E', [...x('E7', 4), ...x('A7', 2), ...x('E7', 2), 'B7', 'A7', 'E7', 'B7'].join(' ')],
  ['mixo-rock', 'G mixolydian', 'G F C', 'D', 'D C G'],
  ['rock-14b74', 'G mixolydian', 'G C F C', 'A', 'A D G D'],
  ['andalusian', 'A aeolian', 'Am G F E', 'E', 'Em D C B'],
  ['spanish-phrygian', 'A phrygian', 'Am Bb C Bb', 'E', 'Em F G F'],
  ['phrygian-vamp', 'A phrygian', 'Am Bb', 'E', 'Em F'],
  ['harmonic', 'A harmonicMinor', 'Am F Dm E', 'D', 'Dm Bb Gm A'],
];

for (const [id, tm, def, other, alt] of TABLE) {
  test(`progression ${id}`, () => {
    const p = PROGRESSIONS[id];
    assert.ok(p, 'exists');
    const [tonic, mode] = tm.split(' ');
    assert.equal(p.tonic, tonic);
    assert.equal(p.mode, mode);
    assert.deepEqual(progressionChords(p.romans, p.tonic).map((c) => c.symbol), s(def));
    assert.deepEqual(progressionChords(p.romans, other).map((c) => c.symbol), s(alt));
  });
}

test('table covers every progression', () => {
  assert.deepEqual(Object.keys(PROGRESSIONS).sort(), TABLE.map((r) => r[0]).sort());
});

test('progression fields are sane', () => {
  for (const [id, p] of Object.entries(PROGRESSIONS)) {
    assert.ok(p.name, id);
    assert.ok(p.why && p.why.length > 20, `${id} why`);
    assert.ok(p.bpm >= 50 && p.bpm <= 160, `${id} bpm`);
    assert.ok([2, 4].includes(p.beatsPerChord), id);
    assert.ok([3, 4].includes(p.timeSig), id);
  }
  assert.equal(PROGRESSIONS['epic-aeolian'].bpm, 120);
  assert.deepEqual(PROGRESSIONS['epic-aeolian'].romans, PROGRESSIONS['sad-aeolian'].romans);
  assert.match(PROGRESSIONS['epic-aeolian'].why, /same chords/i);
  assert.match(PROGRESSIONS['epic-aeolian'].why, /tempo/i);
  assert.match(PROGRESSIONS['epic-aeolian'].why, /strum/i);
});

test('moods', () => {
  assert.deepEqual(MOODS.map((m) => m.id), ['happy', 'bittersweet', 'sad', 'hopeful', 'romantic', 'dreamy', 'epic', 'chill', 'bluesy', 'rock', 'spanish', 'dark']);
  const used = new Set();
  for (const m of MOODS) {
    assert.ok(m.name && m.blurb, m.id);
    for (const id of m.progressionIds) { assert.ok(PROGRESSIONS[id], id); used.add(id); }
  }
  for (const id of FAMOUS_LOOPS) { assert.ok(PROGRESSIONS[id], id); used.add(id); }
  for (const id of Object.keys(PROGRESSIONS)) assert.ok(used.has(id), `${id} unused`);
  assert.deepEqual(MOODS.find((m) => m.id === 'dark').progressionIds, ['phrygian-vamp', 'harmonic']);
});

test('methods', () => {
  assert.deepEqual(METHODS.map((m) => m.id), ['family', 'loops', 'rotate', 'tension', 'circle', 'borrow', 'modes', 'spice', 'bass']);
  for (const m of METHODS) assert.ok(m.name && m.summary && m.lessonId, m.id);
  assert.deepEqual(METHODS.map((m) => m.lessonId), ['chord-family', 'chord-numbers', 'rotation', 'endings', 'circle', 'borrowed', 'modes', 'colors', 'slash-chords']);
});
