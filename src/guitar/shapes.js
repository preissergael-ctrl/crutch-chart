// A short, readable list of the main ways to play a chord, picked from every generated shape.
const MAIN_CAP = 12;

const fretted = (v) => v.frets.filter((f) => f > 0);

// True when a muted string sits between two sounding strings.
export function hasInnerMute(frets) {
  const on = frets.map((f, i) => (f === null ? -1 : i)).filter((i) => i >= 0);
  return on.length > 0 && frets.slice(on[0], on[on.length - 1] + 1).includes(null);
}

// Neck position of a shape: 'open' (open strings, nothing above fret 4, no muted string in the
// middle) or its lowest fretted fret.
export function positionOf(v) {
  const nz = fretted(v);
  if (!nz.length) return 'open';
  if (v.frets.includes(0) && Math.max(...nz) <= 4 && !hasInnerMute(v.frets)) return 'open';
  return Math.min(...nz);
}

// voicings arrive easiest first and keep that order. Keeps the best shape in each neck position,
// plus the best shape for each CAGED letter at each position. Leaves out odd shapes: any shape with a muted
// string in the middle (a CAGED shape never has one, so those are only fragments of it), and non-CAGED
// shapes that mix open strings with frets high up the neck.
const odd = (v) => hasInnerMute(v.frets) || (!v.caged && v.frets.includes(0) && v.baseFret > 5);

export function mainShapes(voicings, cap = MAIN_CAP) {
  const seen = new Set();
  const out = [];
  for (const v of voicings) {
    if (odd(v)) continue;
    const pos = positionOf(v);
    const keys = [`p${pos}`];
    if (v.caged) keys.push(`c${v.caged}${pos}`);
    if (keys.every((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    out.push(v);
    if (out.length >= cap) break;
  }
  return out.length ? out : voicings.slice(0, 1);
}

// Plain-words name, e.g. "Open position", "Barre at fret 1, E shape", "Fret 5, A shape".
export function shapeName(v) {
  const pos = positionOf(v);
  const shape = v.caged ? `, ${v.caged} shape` : '';
  if (pos === 'open') return `Open position${shape}`;
  return `${v.barre ? `Barre at fret ${pos}` : `Fret ${pos}`}${shape}`;
}

// Short label for the strip: "Open", "Fret 1 · E".
export function shapeTag(v) {
  const pos = positionOf(v);
  return `${pos === 'open' ? 'Open' : `Fret ${pos}`}${v.caged ? ` · ${v.caged}` : ''}`;
}
