import { LETTERS, pc, spell, simplify } from './notes.js';
import { MODES, scalePcs } from './scales.js';
import { makeChord, chordNotes, chordPcs } from './chords.js';

export const KEYS = {
  major: ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'],
  minor: ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'],
};

const MINOR_MODES = ['aeolian', 'dorian', 'phrygian', 'harmonicMinor', 'locrian'];
export const isMinorMode = (mode) => MINOR_MODES.includes(mode);

export const FUNCTION_PLAIN = {
  home: 'home: where the music rests',
  relative: 'a cousin of home: restful, but a different color',
  away: 'away: leaves home and builds interest',
  pull: 'pull: leans back toward home',
};

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const ROMAN_RE = /^([b#]?)(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|o|ø7|\+)?(7|maj7|sus2|sus4|add9|6|9)?(?:\/([357]))?$/;
const IONIAN = MODES.ionian;

function tokens(str) {
  const m = ROMAN_RE.exec(String(str));
  if (!m) throw new Error(`Bad chord number: ${str}`);
  return m;
}

export function parseRoman(str) {
  const m = tokens(str);
  const numeral = m[2];
  return {
    acc: m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0,
    degree: NUMERALS.indexOf(numeral.toUpperCase()) + 1,
    upper: numeral === numeral.toUpperCase(),
    suffix: (m[3] ?? '') + (m[4] ?? ''),
    inv: m[5] ?? null,
  };
}

function qualityOf(m, upper) {
  const mark = m[3];
  const ext = m[4];
  if (mark && ext) throw new Error(`Bad chord number: ${m[0]}`);
  if (mark === '°' || mark === 'o') return 'dim';
  if (mark === 'ø7') return 'm7b5';
  if (mark === '+') return 'aug';
  if (!ext) return upper ? '' : 'm';
  if (ext === '7') return upper ? '7' : 'm7';
  if (ext === '6') return upper ? '6' : 'm6';
  return ext; // maj7, 9, sus2, sus4, add9
}

export function romanToChord(roman, tonic) {
  const m = tokens(roman);
  const { acc, degree, upper, inv } = parseRoman(roman);
  const letter = LETTERS[(LETTERS.indexOf(tonic[0]) + degree - 1) % 7];
  const target = (pc(tonic) + IONIAN[degree - 1] + acc + 12) % 12;
  const root = simplify(spell(letter, target), acc < 0 || tonic.includes('b'));
  const quality = qualityOf(m, upper);
  let bass = null;
  if (inv) {
    const tone = chordNotes(makeChord(root, quality))[{ 3: 1, 5: 2, 7: 3 }[inv]];
    if (!tone) throw new Error(`No such chord tone: ${roman}`);
    bass = tone;
  }
  return { ...makeChord(root, quality, bass), roman };
}

export function progressionChords(romans, tonic) {
  return romans.map((r) => romanToChord(r, tonic));
}

const TRIADS = { '4,7': '', '3,7': 'm', '3,6': 'dim', '4,8': 'aug' };
const SEVENTHS = { '4,7,11': 'maj7', '4,7,10': '7', '3,7,10': 'm7', '3,6,10': 'm7b5' };

export function diatonicFamily(tonic, mode, sevenths = false) {
  const scale = MODES[mode];
  return scale.map((_, i) => {
    const at = (k) => (scale[(i + k) % 7] - scale[i] + 12) % 12;
    const triad = TRIADS[[at(2), at(4)]];
    const sev = sevenths ? SEVENTHS[[at(2), at(4), at(6)]] : undefined;
    const diff = scale[i] - IONIAN[i];
    const acc = diff < 0 ? 'b' : diff > 0 ? '#' : '';
    const upper = triad === '' || triad === 'aug';
    const numeral = upper ? NUMERALS[i] : NUMERALS[i].toLowerCase();
    let tail;
    if (sev) tail = { maj7: 'maj7', 7: '7', m7: '7', m7b5: 'ø7' }[sev];
    else tail = { dim: '°', aug: '+' }[triad] ?? '';
    const roman = acc + numeral + tail;
    return { roman, chord: romanToChord(roman, tonic) };
  });
}

export function functionOf(roman) {
  const m = tokens(roman);
  const key = m[1] + m[2];
  if (key === 'I' || key === 'i') return 'home';
  if (['vi', 'iii', 'bIII', 'III'].includes(key)) return 'relative';
  if (['V', 'v', 'vii'].includes(key)) return 'pull';
  return 'away';
}

const BORROW_ORDER = {
  major: ['aeolian', 'mixolydian', 'dorian', 'lydian', 'phrygian', 'harmonicMinor'],
  minor: ['dorian', 'harmonicMinor', 'ionian', 'phrygian', 'mixolydian', 'lydian'],
};

export function borrowedFrom(roman, tonic, mode) {
  const pcs = chordPcs(romanToChord(roman, tonic));
  const inMode = (md) => { const s = scalePcs(tonic, md); return pcs.every((p) => s.includes(p)); };
  if (inMode(mode)) return null;
  const minor = isMinorMode(mode);
  // A home that is not plain major or minor looks at its own parallel first: a major-type mode
  // (lydian, mixolydian) at plain major, a minor-type mode (dorian, phrygian, ...) at plain minor.
  // E7 in A mixolydian is simply V7 of A major.
  const parallel = minor ? 'aeolian' : 'ionian';
  const order = mode === 'ionian' || mode === 'aeolian'
    ? BORROW_ORDER[minor ? 'minor' : 'major']
    : [parallel, ...BORROW_ORDER[minor ? 'minor' : 'major'].filter((md) => md !== parallel)];
  return order.find((md) => md !== mode && inMode(md)) ?? null;
}

export function explainProgression(romans, tonic, mode) {
  return romans.map((roman) => ({
    roman,
    name: romanToChord(roman, tonic).symbol,
    role: FUNCTION_PLAIN[functionOf(roman)],
    borrowed: borrowedFrom(roman, tonic, mode),
  }));
}
