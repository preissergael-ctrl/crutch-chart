import { parseChord, makeChord, sameChord } from '../theory/chords.js';
import { transpose } from '../theory/notes.js';

export const EASY_OPEN = ['C', 'A', 'G', 'E', 'D', 'Am', 'Em', 'Dm', 'A7', 'E7', 'D7', 'G7', 'C7', 'B7',
  'Am7', 'Em7', 'Dm7', 'Cmaj7', 'Fmaj7', 'Asus2', 'Asus4', 'Dsus2', 'Dsus4', 'Esus4'];

export function isKnown(symbol, known) {
  const chord = parseChord(symbol);
  return known.some((k) => {
    try { return sameChord(chord, k); } catch { return false; }
  });
}

function playAs(chord, capo) {
  return makeChord(
    transpose(chord.root, -capo, false),
    chord.quality,
    chord.bass ? transpose(chord.bass, -capo, false) : null,
  );
}

export function capoHint(symbols, known) {
  if (!symbols.length) return null;
  const chords = symbols.map(parseChord);
  const pool = [...known, ...EASY_OPEN];
  const ok = (c) => isKnown(c.symbol, pool);
  if (chords.every(ok)) return null;
  for (let capo = 1; capo <= 7; capo++) {
    const shapes = chords.map((c) => playAs(c, capo));
    if (shapes.every(ok)) return { capo, playAs: shapes.map((s) => s.symbol) };
  }
  return null;
}
