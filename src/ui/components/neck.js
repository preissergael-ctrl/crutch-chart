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

// ---------------------------------------------------------------------------------------------
// renderNeck: a horizontal neck as if looking down at the guitar. Low E at the bottom.
// Units are SVG user units; the stylesheet colours everything through .neck-* classes.
export const NECK_FRET_W = 46; // fret column width, in user units
const LEFT = 38;      // room for the open/muted marks, left of the nut
const FW = NECK_FRET_W;
const SG = 28;        // gap between strings
const NTOP = 14;      // top of the string area
const R = 11;         // dot radius
const NUMS = [3, 5, 7, 9, 12, 15];
const INLAYS = [3, 5, 7, 9, 12, 15];

// The same shape, in words, for screen readers.
export function describeVoicing(voicing, name = '') {
  const { frets, fingers = [], barre } = voicing;
  const strNo = (s) => 6 - s;
  const pos = Math.min(...frets.filter((f) => f > 0), Infinity);
  const parts = [];
  if (barre) {
    const all = barre.from === 0 && barre.to === 5;
    parts.push(`barre with finger ${fingers[barre.from] ?? 1} across ${all ? 'all strings' : `strings ${strNo(barre.from)} to ${strNo(barre.to)}`}`);
  }
  frets.forEach((f, s) => {
    if (!f || (barre && f === barre.fret && s >= barre.from && s <= barre.to)) return;
    parts.push(`${fingers[s] ? `finger ${fingers[s]}` : 'a finger'} on string ${strNo(s)} fret ${f}`);
  });
  const open = frets.flatMap((f, s) => (f === 0 ? [strNo(s)] : []));
  const muted = frets.flatMap((f, s) => (f === null || f === undefined ? [strNo(s)] : []));
  if (open.length) parts.push(`open strings ${open.join(', ')}`);
  if (muted.length) parts.push(`not played: string${muted.length > 1 ? 's' : ''} ${muted.join(', ')}`);
  const where = pos === Infinity ? 'open strings' : `fret ${pos}`;
  return `${name ? `${name} ` : ''}shape at ${where}: ${parts.join(', ')}`;
}

// fromFret/toFret: the first and last fret column drawn. From fret 0 or 1 the nut is drawn.
export function renderNeck(voicing, { fromFret = 0, toFret = 15, name = '' } = {}) {
  const { frets, fingers = [], barre } = voicing;
  const start = Math.max(1, fromFret);
  const end = Math.max(start, toFret);
  const cols = end - start + 1;
  const W = LEFT + cols * FW + 8;
  const stringsBottom = NTOP + 5 * SG;
  const H = stringsBottom + NTOP + 22;
  const xc = (f) => LEFT + (f - start + 0.5) * FW;
  const ys = (s) => NTOP + (5 - s) * SG;
  const inView = (f) => f >= start && f <= end;
  const parts = [];

  parts.push(h('rect', { class: 'neck-wood', x: LEFT, y: NTOP - 6, width: cols * FW, height: 5 * SG + 12 }));
  const mid = NTOP + 2.5 * SG;
  for (const f of INLAYS.filter(inView)) {
    if (f === 12) {
      parts.push(h('circle', { class: 'neck-inlay', cx: xc(f), cy: mid - SG, r: 5 }), h('circle', { class: 'neck-inlay', cx: xc(f), cy: mid + SG, r: 5 }));
    } else parts.push(h('circle', { class: 'neck-inlay', cx: xc(f), cy: mid, r: 5 }));
  }
  for (let f = start; f <= end; f++) {
    const x = LEFT + (f - start + 1) * FW;
    parts.push(h('line', { class: 'neck-fret', x1: x, x2: x, y1: NTOP - 6, y2: stringsBottom + 6 }));
  }
  parts.push(h('line', { class: start === 1 ? 'neck-nut' : 'neck-fret', x1: LEFT, x2: LEFT, y1: NTOP - 6, y2: stringsBottom + 6 }));
  for (let s = 0; s < 6; s++) {
    parts.push(h('line', { class: 'neck-string', 'stroke-width': (2.4 - s * 0.32).toFixed(2), x1: LEFT, x2: LEFT + cols * FW, y1: ys(s), y2: ys(s) }));
  }

  const onBarre = (f, s) => barre && f === barre.fret && s >= barre.from && s <= barre.to;
  if (barre && inView(barre.fret)) {
    const y1 = ys(barre.to) - R;
    const y2 = ys(barre.from) + R;
    parts.push(h('rect', { class: 'neck-dot', x: xc(barre.fret) - R, y: y1, width: R * 2, height: y2 - y1, rx: R }));
    parts.push(h('text', { class: 'neck-finger', x: xc(barre.fret), y: ys(barre.from) + 5, 'text-anchor': 'middle' }, String(fingers[barre.from] ?? 1)));
  }

  frets.forEach((f, s) => {
    if (f === null || f === undefined) {
      const cx = LEFT - 16;
      parts.push(h('path', { class: 'neck-mute', d: `M${cx - 5} ${ys(s) - 5} L${cx + 5} ${ys(s) + 5} M${cx + 5} ${ys(s) - 5} L${cx - 5} ${ys(s) + 5}` }));
    } else if (f === 0) {
      parts.push(h('circle', { class: 'neck-open', cx: LEFT - 16, cy: ys(s), r: 5.5 }));
    } else if (inView(f) && !onBarre(f, s)) {
      parts.push(h('circle', { class: 'neck-dot', cx: xc(f), cy: ys(s), r: R }));
      if (fingers[s]) parts.push(h('text', { class: 'neck-finger', x: xc(f), y: ys(s) + 5, 'text-anchor': 'middle' }, String(fingers[s])));
    }
  });

  // Fret numbers under the neck: every column in a small window, the usual landmarks on the whole neck.
  for (let f = start; f <= end; f++) {
    if (cols <= 8 || NUMS.includes(f)) {
      parts.push(h('text', { class: 'neck-num', x: xc(f), y: stringsBottom + NTOP + 15, 'text-anchor': 'middle' }, String(f)));
    }
  }

  return h('svg', { class: 'neck', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': describeVoicing(voicing, name), 'data-vbw': W }, parts);
}
