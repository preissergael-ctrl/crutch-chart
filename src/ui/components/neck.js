// Fretboard drawings. renderMiniDiagram is the small chord box used in rows and cards.
// Colors come from CSS classes (.mini-*), which read the design tokens in styles.css.
import { h } from '../dom.js';

const ROWS = 5;
const X0 = 15;     // first (low E) string
const GAP = 9;     // between strings
const TOP = 18;    // top of the fret grid (the nut line)
const ROW = 11;    // fret height
const W = X0 + GAP * 5 + 8;
const H = TOP + ROW * ROWS + 6;

const fretWord = (f) => (f === null || f === undefined ? 'x' : String(f));

// voicing: { frets: (number|null)[6], barre: {fret, from, to}|null, baseFret }, name: chord name for the label.
export function renderMiniDiagram(voicing, name = '') {
  const { frets, barre } = voicing;
  const top = Math.max(0, ...frets.map((f) => f || 0));
  const base = top > ROWS && voicing.baseFret > 1 ? voicing.baseFret : 1; // open-position shapes show from the nut
  const x = (s) => X0 + s * GAP;
  const y = (fret) => TOP + (fret - base + 0.5) * ROW; // centre of a fret row
  const parts = [];

  // Frets, then strings.
  for (let r = 0; r <= ROWS; r++) {
    parts.push(h('line', { class: r === 0 && base === 1 ? 'mini-nut' : 'mini-fret', x1: X0, x2: x(5), y1: TOP + r * ROW, y2: TOP + r * ROW }));
  }
  for (let s = 0; s < 6; s++) {
    parts.push(h('line', { class: 'mini-string', x1: x(s), x2: x(s), y1: TOP, y2: TOP + ROWS * ROW }));
  }

  if (barre && barre.fret - base >= 0 && barre.fret - base < ROWS) {
    parts.push(h('rect', { class: 'mini-barre', x: x(barre.from) - 3.4, y: y(barre.fret) - 3.4, width: x(barre.to) - x(barre.from) + 6.8, height: 6.8, rx: 3.4 }));
  }

  frets.forEach((f, s) => {
    if (f === null || f === undefined) {
      const cx = x(s);
      const cy = TOP - 7;
      parts.push(h('path', { class: 'mini-mute', d: `M${cx - 2.6} ${cy - 2.6} L${cx + 2.6} ${cy + 2.6} M${cx + 2.6} ${cy - 2.6} L${cx - 2.6} ${cy + 2.6}` }));
    } else if (f === 0) {
      parts.push(h('circle', { class: 'mini-open', cx: x(s), cy: TOP - 7, r: 2.9 }));
    } else if (f - base >= 0 && f - base < ROWS) {
      const onBarre = barre && f === barre.fret && s >= barre.from && s <= barre.to;
      if (!onBarre) parts.push(h('circle', { class: 'mini-dot', cx: x(s), cy: y(f), r: 3.7 }));
    }
  });

  if (base > 1) {
    parts.push(h('text', { class: 'mini-base', x: X0 - 6, y: y(base) + 3, 'text-anchor': 'end' }, String(base)));
  }

  const label = `${name ? `${name} ` : ''}shape: ${frets.map(fretWord).join(' ')}`;
  return h('svg', { class: 'mini', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label }, parts);
}
