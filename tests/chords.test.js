import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHORD_TYPES, makeChord, parseChord, chordNotes, chordPcs, requiredPcs, sameChord } from '../src/theory/chords.js';
import { pc } from '../src/theory/notes.js';

const sorted = (a) => [...a].sort((x, y) => x - y);

test('has exactly 14 chord types', () => {
  assert.equal(Object.keys(CHORD_TYPES).length, 14);
});

test('makeChord builds symbols', () => {
  assert.equal(makeChord('C', '').symbol, 'C');
  assert.equal(makeChord('A', 'm').symbol, 'Am');
  assert.equal(makeChord('G', '', 'B').symbol, 'G/B');
  assert.equal(makeChord('F#', 'm7b5').symbol, 'F#m7b5');
});

test('parse G/B', () => {
  assert.deepEqual(parseChord('G/B'), { root: 'G', quality: '', bass: 'B', symbol: 'G/B' });
});

test('parse F#m7b5', () => {
  const c = parseChord('F#m7b5');
  assert.equal(c.root, 'F#');
  assert.equal(c.quality, 'm7b5');
  assert.equal(c.bass, null);
});

test('parse Bbm7b5 and Bm7b5 keep root and quality apart', () => {
  assert.equal(parseChord('Bbm7b5').root, 'Bb');
  assert.equal(parseChord('Bm7b5').root, 'B');
  assert.equal(parseChord('Bm7b5').quality, 'm7b5');
});

test('parse rejects Hm and junk', () => {
  assert.throws(() => parseChord('Hm'));
  assert.throws(() => parseChord('Cxyz'));
  assert.throws(() => parseChord('C/H'));
  assert.throws(() => parseChord(''));
});

test('C notes', () => assert.deepEqual(chordNotes(parseChord('C')), ['C', 'E', 'G']));
test('Am notes', () => assert.deepEqual(chordNotes(parseChord('Am')), ['A', 'C', 'E']));
test('Bdim notes', () => assert.deepEqual(chordNotes(parseChord('Bdim')), ['B', 'D', 'F']));
test('Cmaj7 notes', () => assert.deepEqual(chordNotes(parseChord('Cmaj7')), ['C', 'E', 'G', 'B']));
test('Bbm7b5 notes', () => assert.deepEqual(chordNotes(parseChord('Bbm7b5')), ['Bb', 'Db', 'Fb', 'Ab']));
test('Dadd9 notes', () => assert.deepEqual(chordNotes(parseChord('Dadd9')), ['D', 'F#', 'A', 'E']));
test('double accidentals collapse', () => {
  // G#aug would spell E## ; must simplify
  for (const n of chordNotes(parseChord('G#aug'))) assert.doesNotMatch(n, /##|bb/);
});

test('G9 pcs', () => {
  assert.deepEqual(sorted(chordPcs(parseChord('G9'))), sorted([7, 11, 2, 5, 9]));
});
test('chordPcs includes the bass', () => {
  assert.ok(chordPcs(parseChord('C/F')).includes(pc('F')));
  assert.deepEqual(sorted(chordPcs(parseChord('C/E'))), [0, 4, 7]);
});

test('Csus4 required = pcs of C and F', () => {
  assert.deepEqual(sorted(requiredPcs(parseChord('Csus4'))), sorted([pc('C'), pc('F')]));
});

test('sameChord treats enharmonics as equal', () => {
  assert.equal(sameChord('A#m', 'Bbm'), true);
  assert.equal(sameChord(parseChord('C'), 'C'), true);
});
test('sameChord distinguishes bass and quality', () => {
  assert.equal(sameChord('C', 'C/E'), false);
  assert.equal(sameChord('C', 'Cm'), false);
});

import { normalizeChordInput } from '../src/theory/chords.js';
test('normalizeChordInput cleans typed chords', () => {
  assert.equal(parseChord(normalizeChordInput('f♯m')).symbol, 'F#m');
  assert.equal(parseChord(normalizeChordInput('B♭7')).symbol, 'Bb7');
  assert.equal(parseChord(normalizeChordInput(' am ')).symbol, 'Am');
  assert.equal(parseChord(normalizeChordInput('cmaj7')).symbol, 'Cmaj7');
  assert.throws(() => parseChord(normalizeChordInput('Hm')));
});

// ---- Task 16: plain meaning of each chord type, built from the chord's own notes ----
import { explainType, CHORD_FEEL } from '../src/theory/chords.js';

test('explainType: added notes and swapped notes', () => {
  const e = (s) => explainType(parseChord(s));
  assert.deepEqual(e('G7'), { base: 'G', added: ['F'], swap: null, feel: CHORD_FEEL['7'] });
  assert.deepEqual(e('Cmaj7').added, ['B']);
  assert.deepEqual(e('Am7'), { base: 'Am', added: ['G'], swap: null, feel: CHORD_FEEL.m7 });
  assert.deepEqual(e('Bm7b5').base, 'Bdim');
  assert.deepEqual(e('Bm7b5').added, ['A']);
  assert.deepEqual(e('Cadd9').added, ['D']);
  assert.deepEqual(e('G9').added, ['F', 'A']);
  assert.deepEqual(e('Dsus2').swap, { from: 'F#', to: 'E' });
  assert.deepEqual(e('Dsus4').swap, { from: 'F#', to: 'G' });
  assert.deepEqual(e('Cdim'), { base: 'Cm', added: [], swap: { from: 'G', to: 'Gb' }, feel: CHORD_FEEL.dim });
  assert.deepEqual(e('Caug').swap, { from: 'G', to: 'G#' });
  assert.equal(e('C').base, null);
  assert.equal(e('Am').base, null);
});

test('explainType: every type on every root explains itself, and the notes add up', () => {
  const roots = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  for (const q of Object.keys(CHORD_TYPES)) {
    assert.ok(CHORD_FEEL[q], `feel for ${q}`);
    for (const r of roots) {
      const ch = parseChord(r + q);
      const x = explainType(ch);
      if (!x.base) continue;
      const own = chordNotes(ch).map(pc).sort();
      let built = chordNotes(parseChord(x.base)).map(pc);
      if (x.swap) built = built.map((p) => (p === pc(x.swap.from) ? pc(x.swap.to) : p));
      built = [...built, ...x.added.map(pc)].sort();
      assert.deepEqual(built, own, r + q);
    }
  }
});
