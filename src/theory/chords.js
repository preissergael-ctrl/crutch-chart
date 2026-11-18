import { pc, spell, simplify, LETTERS } from './notes.js';

const T = (intervals, required) => ({ intervals, required });

export const CHORD_TYPES = {
  '': { ...T([[0, 0], [4, 2], [7, 4]], [0, 1]), plain: 'major' },
  m: { ...T([[0, 0], [3, 2], [7, 4]], [0, 1]), plain: 'minor' },
  dim: { ...T([[0, 0], [3, 2], [6, 4]], [0, 1, 2]), plain: 'diminished' },
  aug: { ...T([[0, 0], [4, 2], [8, 4]], [0, 1, 2]), plain: 'augmented' },
  7: { ...T([[0, 0], [4, 2], [7, 4], [10, 6]], [0, 1, 3]), plain: 'dominant 7th' },
  maj7: { ...T([[0, 0], [4, 2], [7, 4], [11, 6]], [0, 1, 3]), plain: 'major 7th' },
  m7: { ...T([[0, 0], [3, 2], [7, 4], [10, 6]], [0, 1, 3]), plain: 'minor 7th' },
  m7b5: { ...T([[0, 0], [3, 2], [6, 4], [10, 6]], [0, 1, 2, 3]), plain: 'half-diminished 7th' },
  sus2: { ...T([[0, 0], [2, 1], [7, 4]], [0, 1]), plain: 'suspended 2nd' },
  sus4: { ...T([[0, 0], [5, 3], [7, 4]], [0, 1]), plain: 'suspended 4th' },
  add9: { ...T([[0, 0], [4, 2], [7, 4], [2, 1]], [0, 1, 3]), plain: 'major with an added 9th' },
  6: { ...T([[0, 0], [4, 2], [7, 4], [9, 5]], [0, 1, 3]), plain: 'major 6th' },
  m6: { ...T([[0, 0], [3, 2], [7, 4], [9, 5]], [0, 1, 3]), plain: 'minor 6th' },
  9: { ...T([[0, 0], [4, 2], [7, 4], [10, 6], [2, 1]], [0, 1, 3, 4]), plain: 'dominant 9th' },
};

const mod12 = (n) => ((n % 12) + 12) % 12;

export function makeChord(root, quality, bass = null) {
  return { root, quality, bass, symbol: root + quality + (bass ? `/${bass}` : '') };
}

export function parseChord(symbol) {
  const m = /^([A-G][#b]?)(.*?)(?:\/([A-G][#b]?))?$/.exec(String(symbol));
  if (!m || !Object.hasOwn(CHORD_TYPES, m[2])) throw new Error(`Unknown chord: ${symbol}`);
  return makeChord(m[1], m[2], m[3] ?? null);
}

export function chordNotes(chord) {
  const rootPc = pc(chord.root);
  const rootIdx = LETTERS.indexOf(chord.root[0]);
  const preferFlats = chord.root.includes('b');
  return CHORD_TYPES[chord.quality].intervals.map(([semi, steps]) =>
    simplify(spell(LETTERS[(rootIdx + steps) % 7], mod12(rootPc + semi)), preferFlats));
}

export function chordPcs(chord) {
  const pcs = chordNotes(chord).map(pc);
  if (chord.bass) pcs.push(pc(chord.bass));
  return [...new Set(pcs)];
}

export function requiredPcs(chord) {
  const pcs = chordNotes(chord).map(pc);
  return CHORD_TYPES[chord.quality].required.map((i) => pcs[i]);
}

export function sameChord(a, b) {
  const x = typeof a === 'string' ? parseChord(a) : a;
  const y = typeof b === 'string' ? parseChord(b) : b;
  return pc(x.root) === pc(y.root) && x.quality === y.quality &&
    (x.bass ? pc(x.bass) : null) === (y.bass ? pc(y.bass) : null);
}

// Cleans what a person typed so parseChord can read it: trims, turns ♯/♭ into # and b,
// and capitalises the first letter. The rest stays as typed ('maj7', 'm').
export function normalizeChordInput(str) {
  const s = String(str).trim().replace(/[♯＃]/g, '#').replace(/[♭]/g, 'b');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// What a chord type is, in plain words, built from the chord's own notes.
//   added: notes stacked on a plain chord (G7 = a G chord with F added)
//   swap:  one note of a plain chord replaced (Dsus2 = a D chord with E in place of F#)
// base is the plain chord it starts from, or null for plain major and minor.
const BUILT_FROM = {
  7: ['', 'add'], maj7: ['', 'add'], add9: ['', 'add'], 6: ['', 'add'], 9: ['', 'add'],
  m7: ['m', 'add'], m6: ['m', 'add'], m7b5: ['dim', 'add'],
  dim: ['m', 'swap'], aug: ['', 'swap'], sus2: ['', 'swap'], sus4: ['', 'swap'],
};
export const CHORD_FEEL = {
  '': 'bright and settled', m: 'softer and a little sad', dim: 'tense and restless', aug: 'tense and dreamy',
  7: 'bluesy, and it wants to move', maj7: 'soft and dreamy', m7: 'mellow and smooth', m7b5: 'dark and jazzy',
  sus2: 'open and airy', sus4: 'hanging, waiting to settle', add9: 'bright and shimmery',
  6: 'warm and old-fashioned', m6: 'bittersweet and jazzy', 9: 'rich and funky',
};

export function explainType(chord) {
  const feel = CHORD_FEEL[chord.quality];
  const how = BUILT_FROM[chord.quality];
  if (!how) return { base: null, added: [], swap: null, feel };
  const base = makeChord(chord.root, how[0]);
  const own = chordNotes(makeChord(chord.root, chord.quality));
  const plain = chordNotes(base);
  const ownPcs = own.map(pc);
  const plainPcs = plain.map(pc);
  const extra = own.filter((n) => !plainPcs.includes(pc(n)));
  if (how[1] === 'add') return { base: base.symbol, added: extra, swap: null, feel };
  const gone = plain.find((n) => !ownPcs.includes(pc(n)));
  return { base: base.symbol, added: [], swap: { from: gone, to: extra[0] }, feel };
}
