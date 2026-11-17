import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoman, romanToChord, progressionChords, KEYS, isMinorMode, diatonicFamily,
  functionOf, FUNCTION_PLAIN, borrowedFrom, explainProgression } from '../src/theory/roman.js';
import { MODES } from '../src/theory/scales.js';

test('C family', () => assert.deepEqual(diatonicFamily('C','ionian').map(x=>x.roman+':'+x.chord.symbol),
  ['I:C','ii:Dm','iii:Em','IV:F','V:G','vi:Am','vii°:Bdim']));
test('A aeolian family uses major-relative numbers', () => assert.deepEqual(diatonicFamily('A','aeolian').map(x=>x.roman+':'+x.chord.symbol),
  ['i:Am','ii°:Bdim','bIII:C','iv:Dm','v:Em','bVI:F','bVII:G']));
test('C family sevenths', () => assert.deepEqual(diatonicFamily('C','ionian',true).map(x=>x.chord.symbol),
  ['Cmaj7','Dm7','Em7','Fmaj7','G7','Am7','Bm7b5']));
test('romans', () => { assert.equal(romanToChord('bVII','C').symbol,'Bb'); assert.equal(romanToChord('V/3','C').symbol,'G/B');
  assert.equal(romanToChord('iiø7','C').symbol,'Dm7b5'); assert.equal(romanToChord('bII','A').symbol,'Bb'); assert.equal(romanToChord('V','A').symbol,'E'); });
test('borrowed', () => { assert.equal(borrowedFrom('bVII','C','ionian'),'aeolian'); assert.equal(borrowedFrom('IV','C','ionian'),null);
  assert.equal(borrowedFrom('V','A','aeolian'),'harmonicMinor'); assert.equal(borrowedFrom('IV','A','aeolian'),'dorian'); });
test('functions', () => { assert.equal(functionOf('V7'),'pull'); assert.equal(functionOf('bVI'),'away'); assert.equal(functionOf('vi'),'relative'); });
test('no double accidentals in any key', () => {
  const all = ['I','bII','ii','bIII','iii','IV','#iv°','V','bVI','vi','bVII','vii°'];
  for (const k of KEYS.major.concat(KEYS.minor)) for (const r of all)
    assert.doesNotMatch(romanToChord(r,k).symbol, /^[A-G](bb|##)/, `${r} in ${k}`); });

test('family round-trips through romanToChord, all modes', () => {
  for (const tonic of ['C', 'A']) for (const mode of Object.keys(MODES)) for (const sev of [false, true]) {
    const fam = diatonicFamily(tonic, mode, sev);
    assert.equal(fam.length, 7);
    for (const { roman, chord } of fam) {
      assert.deepEqual(chord, romanToChord(roman, tonic), `${roman} in ${tonic} ${mode}`);
      assert.equal(chord.roman, roman);
    }
  }
});
test('family odd degrees', () => {
  assert.equal(diatonicFamily('C','lydian')[3].roman, '#iv°');
  assert.equal(diatonicFamily('C','harmonicMinor')[2].roman, 'bIII+');
  assert.equal(diatonicFamily('C','harmonicMinor',true)[6].roman, 'vii°');
  assert.equal(diatonicFamily('C','ionian',true)[6].roman, 'viiø7');
});
test('parseRoman', () => {
  assert.deepEqual(parseRoman('bVII'), { acc: -1, degree: 7, upper: true, suffix: '', inv: null });
  assert.deepEqual(parseRoman('#iv°'), { acc: 1, degree: 4, upper: false, suffix: '°', inv: null });
  assert.deepEqual(parseRoman('iiø7'), { acc: 0, degree: 2, upper: false, suffix: 'ø7', inv: null });
  assert.deepEqual(parseRoman('V7/3'), { acc: 0, degree: 5, upper: true, suffix: '7', inv: '3' });
  assert.throws(() => parseRoman('VIII'));
  assert.equal(romanToChord('ii7','C').symbol, 'Dm7');
  assert.equal(romanToChord('Imaj7','C').symbol, 'Cmaj7');
  assert.equal(romanToChord('IVsus2','C').symbol, 'Fsus2');
  assert.equal(romanToChord('vi6','C').symbol, 'Am6');
  assert.equal(romanToChord('III+','C').symbol, 'Eaug');
  assert.equal(romanToChord('viio','C').symbol, 'Bdim');
});
test('misc', () => {
  assert.equal(isMinorMode('dorian'), true); assert.equal(isMinorMode('lydian'), false);
  assert.deepEqual(progressionChords(['I','V'],'G').map(c=>c.symbol), ['G','D']);
  assert.equal(functionOf('V/3'), 'pull'); assert.equal(functionOf('bIII'), 'relative');
  const e = explainProgression(['I','bVII'],'C','ionian');
  assert.deepEqual(e[1], { roman:'bVII', name:'Bb', role: FUNCTION_PLAIN.away, borrowed:'aeolian' });
  assert.equal(e[0].borrowed, null);
});
