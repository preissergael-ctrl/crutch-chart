import { parseRoman, romanToChord, isMinorMode } from './roman.js';
import { scalePcs } from './scales.js';
import { chordPcs } from './chords.js';

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

export function rotations(romans) {
  return romans.map((_, i) => [...romans.slice(i), ...romans.slice(0, i)]);
}

export const ENDINGS = {
  strong: { name: 'Strong ending', major: ['V', 'I'], minor: ['V', 'i'] },
  soft: { name: 'Soft "amen" ending', major: ['IV', 'I'], minor: ['iv', 'i'] },
  surprise: { name: 'Surprise ending', major: ['V', 'vi'], minor: ['V', 'bVI'] },
};

export function withEnding(romans, endingId, mode) {
  const e = ENDINGS[endingId];
  if (!e) throw new Error(`Unknown ending: ${endingId}`);
  return [...romans, ...(isMinorMode(mode) ? e.minor : e.major)];
}

const CIRCLE = {
  major: ['iii', 'vi', 'ii', 'V', 'I'],
  minor: ['bIII', 'bVI', 'ii°', 'V', 'i'],
};

export function circleChain(length, mode) {
  const chain = CIRCLE[isMinorMode(mode) ? 'minor' : 'major'];
  const n = Math.max(2, Math.min(5, length));
  return chain.slice(chain.length - n);
}

const BORROW_MAJOR = {
  IV: [{ roman: 'iv', from: 'aeolian' }],
  vi: [{ roman: 'bVI', from: 'aeolian' }],
  V: [{ roman: 'bVII', from: 'aeolian' }],
  iii: [{ roman: 'bIII', from: 'aeolian' }],
  ii: [{ roman: 'ii°', from: 'aeolian' }],
  I: [{ roman: 'i', from: 'aeolian' }],
};
const BORROW_MINOR = {
  iv: [{ roman: 'IV', from: 'dorian' }],
  v: [{ roman: 'V', from: 'harmonicMinor' }],
  i: [{ roman: 'I', from: 'ionian' }],
};

export function borrowOptions(roman, mode) {
  const table = isMinorMode(mode) ? BORROW_MINOR : BORROW_MAJOR;
  const found = Object.hasOwn(table, roman) ? table[roman] : [];
  return found.map((o) => ({ ...o }));
}

const SPICE_MAJOR = [
  ['maj7', 'dreamy, soft'],
  ['7', 'bluesy, wants to move'],
  ['sus2', 'open, airy'],
  ['sus4', 'hanging, unresolved'],
  ['add9', 'bright, shimmery'],
  ['6', 'warm, old-fashioned'],
];
const SPICE_MINOR = [
  ['7', 'mellow, smooth'],
  ['6', 'bittersweet, jazzy'],
  ['sus2', 'open, airy'],
  ['sus4', 'hanging, unresolved'],
];

export function spiceOptions(roman, tonic, mode) {
  const { acc, degree, upper, suffix } = parseRoman(roman);
  const numeral = (acc < 0 ? 'b' : acc > 0 ? '#' : '') + (upper ? NUMERALS[degree - 1] : NUMERALS[degree - 1].toLowerCase());
  const mark = suffix[0];
  let list;
  if (mark === '+' || suffix.startsWith('ø7')) return [];
  if (mark === '°' || mark === 'o') list = [['ø7', 'darker, jazzier']];
  else list = upper ? SPICE_MAJOR : SPICE_MINOR;
  const scale = scalePcs(tonic, mode);
  return list.map(([tail, label]) => {
    const r = numeral + tail;
    const inKey = chordPcs(romanToChord(r, tonic)).every((p) => scale.includes(p));
    return { roman: r, label, inKey };
  });
}

const NEXT = {
  major: {
    I: ['IV', 'V', 'vi', 'ii'], ii: ['V', 'vii°'], iii: ['vi', 'IV'], IV: ['V', 'I', 'ii'],
    V: ['I', 'vi'], vi: ['IV', 'ii', 'V'], 'vii°': ['I', 'iii'],
  },
  minor: {
    i: ['iv', 'bVI', 'bVII', 'v'], 'ii°': ['V', 'v'], bIII: ['bVI', 'iv', 'bVII'],
    iv: ['v', 'bVII', 'i', 'V'], v: ['i', 'bVI'], bVI: ['bVII', 'bIII', 'iv'], bVII: ['i', 'bIII'],
  },
};

export function nextHints(roman, mode) {
  const table = NEXT[isMinorMode(mode) ? 'minor' : 'major'];
  return Object.hasOwn(table, roman) ? [...table[roman]] : [];
}

export const BASS_WALKS = {
  descending: { name: 'Walking down', romans: ['I', 'V/3', 'vi', 'I/5', 'IV'] },
  climb: { name: 'Climbing up', romans: ['I', 'ii', 'I/3', 'IV'] },
};
