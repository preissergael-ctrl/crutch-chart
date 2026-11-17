export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
export const LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const mod12 = (n) => ((n % 12) + 12) % 12;

export function pc(name) {
  const m = /^([A-G])(#{0,2}|b{0,2})$/.exec(String(name));
  if (!m) throw new Error(`Bad note name: ${name}`);
  const acc = m[2] === '' ? 0 : m[2][0] === '#' ? m[2].length : -m[2].length;
  return mod12(LETTER_PC[m[1]] + acc);
}

export function spell(letter, targetPc) {
  let diff = mod12(targetPc - LETTER_PC[letter]);
  if (diff > 6) diff -= 12;
  if (Math.abs(diff) > 2) throw new Error(`Cannot spell ${targetPc} from ${letter}`);
  return letter + (diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff));
}

export function simplify(name, preferFlats) {
  if (!/(##|bb)$/.test(name)) return name;
  const p = pc(name);
  return (preferFlats ? FLAT_NAMES : SHARP_NAMES)[p];
}

export function transpose(name, semitones, preferFlats) {
  const p = mod12(pc(name) + semitones);
  return (preferFlats ? FLAT_NAMES : SHARP_NAMES)[p];
}
