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

// ---- Task 16 theory pass: claims in the `why` texts, checked against the engine ----
import { functionOf, romanToChord } from '../src/theory/roman.js';
import { scaleNotes } from '../src/theory/scales.js';
import { chordNotes, parseChord } from '../src/theory/chords.js';
import { pc, LETTERS } from '../src/theory/notes.js';
import { borrowOptions } from '../src/theory/methods.js';

const chordsOf = (id) => { const p = PROGRESSIONS[id]; return progressionChords(p.romans, p.tonic); };
const down = (a, b) => (pc(a) - pc(b) + 12) % 12; // half steps from b up to a

test('why (sad-aeolian): Am F C G has no pull chord, so it keeps circling', () => {
  assert.ok(PROGRESSIONS['sad-aeolian'].romans.every((r) => functionOf(r) !== 'pull'));
});

test('why (pachelbel): the first three pairs start lower each time (C, Am, F); the last pair is F then G', () => {
  const c = chordsOf('pachelbel').map((x) => x.symbol);
  const starts = [0, 2, 4].map((i) => c[i]);
  assert.deepEqual(starts, ['C', 'Am', 'F']);
  // Each start is a short step below the one before: C down 3 half steps to A, A down 4 to F.
  const roots = [0, 2, 4].map((i) => chordsOf('pachelbel')[i].root);
  assert.equal(down(roots[0], roots[1]), 3);
  assert.equal(down(roots[1], roots[2]), 4);
  assert.deepEqual(c.slice(6), ['F', 'G']);
});

test('why (sad-1415): iv and v are the minor chords on the 4th and 5th notes, Dm and Em', () => {
  const scale = scaleNotes('A', 'aeolian');
  const [, iv, , v] = chordsOf('sad-1415');
  assert.deepEqual([iv.symbol, v.symbol], ['Dm', 'Em']);
  assert.equal(iv.root, scale[3]);
  assert.equal(v.root, scale[4]);
});

test('why (fifties): IV steps away and only V pulls home', () => {
  assert.equal(functionOf('IV'), 'away');
  assert.equal(functionOf('V'), 'pull');
  assert.equal(functionOf('vi'), 'relative');
});

test('why (lydian-12): D holds F#, which C major lacks; it is the 4th note raised one fret', () => {
  assert.ok(chordNotes(parseChord('D')).includes('F#'));
  assert.ok(!scaleNotes('C', 'ionian').includes('F#'));
  assert.equal(scaleNotes('C', 'lydian')[3], 'F#');
  assert.equal(down('F#', scaleNotes('C', 'ionian')[3]), 1);
});

test('why (dorian-vamp): the major IV (D) holds F#, the Dorian 6th, one fret above plain minor’s F', () => {
  assert.equal(chordsOf('dorian-vamp')[1].root, 'D');
  assert.equal(scaleNotes('A', 'dorian')[5], 'F#');
  assert.equal(scaleNotes('A', 'aeolian')[5], 'F');
  assert.ok(chordNotes(parseChord('D7')).includes('F#'));
});

test('why (two-five-one): each root falls a fifth, five note names counting both ends', () => {
  const roots = chordsOf('two-five-one').map((c) => c.root);
  assert.deepEqual(roots, ['D', 'G', 'C']);
  for (let i = 0; i < 2; i++) {
    const names = (LETTERS.indexOf(roots[i]) - LETTERS.indexOf(roots[i + 1]) + 7) % 7 + 1;
    assert.equal(names, 5, `${roots[i]} to ${roots[i + 1]}`);
    assert.equal(down(roots[i], roots[i + 1]), 7);
  }
});

test('why (twelve-bar): three chords, all seven chords (a major chord plus one note)', () => {
  const c = chordsOf('twelve-bar');
  assert.equal(new Set(c.map((x) => x.symbol)).size, 3);
  for (const x of c) {
    assert.equal(x.quality, '7');
    const major = chordNotes(parseChord(x.root));
    assert.deepEqual(chordNotes(x).slice(0, 3), major);
  }
});

test('why (mixo-rock): F is two frets below G; plain G major has F#, one fret below', () => {
  assert.equal(romanToChord('bVII', 'G').root, 'F');
  assert.equal(down('G', 'F'), 2);
  assert.equal(scaleNotes('G', 'mixolydian')[6], 'F');
  assert.equal(scaleNotes('G', 'ionian')[6], 'F#');
  assert.equal(down('G', 'F#'), 1);
});

test('why (spanish-phrygian): Bb is one fret above A', () => {
  assert.equal(romanToChord('bII', 'A').root, 'Bb');
  assert.equal(down('Bb', 'A'), 1);
});

test('why (mario, harmonic): borrowed from the home note’s minor; harmonic minor’s E holds G#', () => {
  const cMinor = scaleNotes('C', 'aeolian');
  for (const r of ['bVI', 'bVII']) assert.ok(chordNotes(romanToChord(r, 'C')).every((n) => cMinor.includes(n)), r);
  assert.ok(chordNotes(parseChord('E')).includes('G#'));
  assert.ok(!scaleNotes('A', 'aeolian').includes('G#'));
});

test('method summaries: borrow example (C minor in C major) matches the engine', () => {
  assert.ok(borrowOptions('V', 'ionian').every((o) => o.from === 'aeolian'));
  assert.match(METHODS.find((m) => m.id === 'borrow').summary, /same home note/);
  assert.doesNotMatch(METHODS.map((m) => m.summary).join(' '), /cousin|neighbo/i);
});
