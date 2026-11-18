import { LETTERS, pc, spell } from './notes.js';

export const MODES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  locrian: [0, 1, 3, 5, 6, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
};

// Degrees of ionian / aeolian (1-based)
export const PENTATONIC = {
  majorPentatonic: [1, 2, 3, 5, 6],
  minorPentatonic: [1, 3, 4, 5, 7],
};

const PENTATONIC_PARENT = { majorPentatonic: 'ionian', minorPentatonic: 'aeolian' };

export const MODE_INFO = {
  ionian: { name: 'Major', plain: 'The bright, settled everyday major sound' },
  dorian: { name: 'Dorian', plain: 'Minor, but its 6th note is one fret higher than in plain minor, which feels warm and a little hopeful' },
  phrygian: { name: 'Phrygian', plain: 'Minor, but its 2nd note is one fret lower than in plain minor, which sounds dark and Spanish' },
  lydian: { name: 'Lydian', plain: 'Major, but its 4th note is one fret higher than in plain major, which makes it float' },
  mixolydian: { name: 'Mixolydian', plain: 'Major, but its 7th note is one fret lower than in plain major, which sounds relaxed and bluesy' },
  aeolian: { name: 'Natural minor', plain: 'The plain, sad everyday minor sound' },
  locrian: { name: 'Locrian', plain: 'Minor, but its 2nd and 5th notes are one fret lower than in plain minor, which sounds tense and unsettled' },
  harmonicMinor: { name: 'Harmonic minor', plain: 'Minor, but its 7th note is one fret higher than in plain minor, which pulls strongly home' },
};

export function scalePcs(tonic, mode) {
  const root = pc(tonic);
  if (PENTATONIC[mode]) {
    const parent = MODES[PENTATONIC_PARENT[mode]];
    return PENTATONIC[mode].map((d) => (root + parent[d - 1]) % 12);
  }
  return MODES[mode].map((i) => (root + i) % 12);
}

export function scaleNotes(tonic, mode) {
  const startIdx = LETTERS.indexOf(tonic[0]);
  if (PENTATONIC[mode]) {
    const parent = MODES[PENTATONIC_PARENT[mode]];
    const root = pc(tonic);
    return PENTATONIC[mode].map((d) =>
      spell(LETTERS[(startIdx + d - 1) % 7], (root + parent[d - 1]) % 12));
  }
  const root = pc(tonic);
  return MODES[mode].map((iv, i) => spell(LETTERS[(startIdx + i) % 7], (root + iv) % 12));
}

// A mode's name for use mid-sentence after a home note: 'major', 'minor', 'harmonic minor', 'Dorian'.
export function modeName(mode) {
  if (mode === 'ionian') return 'major';
  if (mode === 'aeolian') return 'minor';
  const name = MODE_INFO[mode]?.name ?? mode;
  return /major|minor/i.test(name) ? name.toLowerCase() : name;
}
