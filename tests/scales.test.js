import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODES, MODE_INFO, scaleNotes } from '../src/theory/scales.js';

test('C major', () => assert.deepEqual(scaleNotes('C','ionian'), ['C','D','E','F','G','A','B']));
test('F major spells Bb', () => assert.deepEqual(scaleNotes('F','ionian'), ['F','G','A','Bb','C','D','E']));
test('A aeolian', () => assert.deepEqual(scaleNotes('A','aeolian'), ['A','B','C','D','E','F','G']));
test('A harmonic minor', () => assert.deepEqual(scaleNotes('A','harmonicMinor'), ['A','B','C','D','E','F','G#']));
test('C lydian', () => assert.deepEqual(scaleNotes('C','lydian'), ['C','D','E','F#','G','A','B']));
test('E phrygian', () => assert.deepEqual(scaleNotes('E','phrygian'), ['E','F','G','A','B','C','D']));
test('F# major', () => assert.deepEqual(scaleNotes('F#','ionian'), ['F#','G#','A#','B','C#','D#','E#']));
test('A minor pentatonic', () => assert.deepEqual(scaleNotes('A','minorPentatonic'), ['A','C','D','E','G']));
test('every mode has MODE_INFO', () => { for (const m of Object.keys(MODES)) assert.ok(MODE_INFO[m].plain.length > 10); });

// ---- Task 16: the MODE_INFO descriptions, checked against the scales ----
import { modeName } from '../src/theory/scales.js';
const half = (a, b) => (a - b + 12) % 12;
const diffs = (m, ref) => MODES[m].map((x, i) => [i + 1, half(x, MODES[ref][i])]).filter(([, d]) => d);

test('MODE_INFO: each mode moves the notes it says, by one fret, against plain major or minor', () => {
  assert.deepEqual(diffs('dorian', 'aeolian'), [[6, 1]]);         // 6th one fret higher
  assert.deepEqual(diffs('phrygian', 'aeolian'), [[2, 11]]);      // 2nd one fret lower
  assert.deepEqual(diffs('lydian', 'ionian'), [[4, 1]]);          // 4th one fret higher
  assert.deepEqual(diffs('mixolydian', 'ionian'), [[7, 11]]);     // 7th one fret lower
  assert.deepEqual(diffs('locrian', 'aeolian'), [[2, 11], [5, 11]]); // 2nd and 5th one fret lower
  assert.deepEqual(diffs('harmonicMinor', 'aeolian'), [[7, 1]]);  // 7th one fret higher
  assert.match(MODE_INFO.dorian.plain, /6th note is one fret higher than in plain minor/);
  assert.match(MODE_INFO.phrygian.plain, /2nd note is one fret lower than in plain minor/);
  assert.match(MODE_INFO.lydian.plain, /4th note is one fret higher than in plain major/);
  assert.match(MODE_INFO.mixolydian.plain, /7th note is one fret lower than in plain major/);
  assert.match(MODE_INFO.locrian.plain, /2nd and 5th notes are one fret lower than in plain minor/);
  assert.match(MODE_INFO.harmonicMinor.plain, /7th note is one fret higher than in plain minor/);
});

test('modes tool: next to plain major or minor, most modes move just one note', () => {
  const one = ['dorian', 'phrygian', 'lydian', 'mixolydian', 'harmonicMinor']
    .filter((m) => Math.min(diffs(m, 'ionian').length, diffs(m, 'aeolian').length) === 1);
  assert.equal(one.length, 5);
});

test('modeName reads well mid-sentence', () => {
  assert.equal(modeName('ionian'), 'major');
  assert.equal(modeName('aeolian'), 'minor');
  assert.equal(modeName('harmonicMinor'), 'harmonic minor');
  assert.equal(modeName('dorian'), 'Dorian');
  assert.equal(modeName('mixolydian'), 'Mixolydian');
});
