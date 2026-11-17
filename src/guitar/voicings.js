import { parseChord, chordPcs, requiredPcs } from '../theory/chords.js';
import { pc } from '../theory/notes.js';

export const STANDARD = [40, 45, 50, 55, 59, 64];

const CAGED_SHAPES = {
  '': [['C', 'x32010', 0], ['A', 'x02220', 9], ['G', '320003', 7], ['E', '022100', 4], ['D', 'xx0232', 2]],
  m: [['A', 'x02210', 9], ['E', '022000', 4], ['D', 'xx0231', 2]],
};

export function fromTab(tab) {
  const out = [];
  const s = String(tab);
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === 'x' || ch === 'X') out.push(null);
    else if (ch === '(') {
      const end = s.indexOf(')', i);
      out.push(Number(s.slice(i + 1, end)));
      i = end;
    } else out.push(Number(ch));
  }
  return out;
}

const tabKey = (frets) =>
  frets.map((f) => (f === null ? 'x' : f >= 10 ? `(${f})` : String(f))).join('');

export function assignFingers(frets) {
  const fretted = [];
  frets.forEach((f, s) => { if (f !== null && f > 0) fretted.push([f, s]); });
  const fingers = frets.map(() => null);
  if (!fretted.length) return { fingers, barre: null };
  const m = Math.min(...fretted.map(([f]) => f));
  const atM = fretted.filter(([f]) => f === m).map(([, s]) => s);
  let barre = null;
  if (atM.length >= 2) {
    const from = Math.min(...atM);
    const to = Math.max(...atM);
    let ok = true;
    for (let s = from; s <= to; s++) if (frets[s] === null || frets[s] < m) ok = false;
    if (ok) barre = { fret: m, from, to };
  }
  let next = 1;
  let rest = fretted;
  if (barre) {
    for (let s = barre.from; s <= barre.to; s++) if (frets[s] === m) fingers[s] = 1;
    rest = fretted.filter(([f]) => f !== m);
    next = 2;
  }
  rest.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [, s] of rest) {
    if (next > 4) return null;
    fingers[s] = next++;
  }
  return { fingers, barre };
}

function cagedLabel(frets, chord) {
  if (chord.bass) return null;
  const shapes = CAGED_SHAPES[chord.quality];
  if (!shapes) return null;
  const rootPc = pc(chord.root);
  for (const [label, tab, shapeRoot] of shapes) {
    const S = fromTab(tab);
    for (let k = 0; k <= 15; k++) {
      if ((shapeRoot + k) % 12 !== rootPc) continue;
      let shared = 0;
      let ok = true;
      for (let i = 0; i < 6 && ok; i++) {
        if (frets[i] === null) continue;
        if (S[i] === null || frets[i] !== S[i] + k) ok = false;
        else shared++;
      }
      if (ok && shared >= 4) return label;
    }
  }
  return null;
}

export const WEIGHTS = { span: 2, baseFret: 1.5, open: 2, sounding: 2.5, barre: 0, inner: 3, nonRoot: 6, fingers: 1.5 };
export const scoreOf = (f, W = WEIGHTS) => -W.span * f.span - W.baseFret * f.baseFret + W.open * f.openCount + W.sounding * f.count
  - W.barre * f.barre - W.inner * f.inner - W.nonRoot * f.nonRoot - W.fingers * f.fingersUsed;

function search(chord, tuning, maxFret, maxSpan, minSounding) {
  const tones = new Set(chordPcs(chord));
  const required = requiredPcs(chord);
  const bassReq = chord.bass ? pc(chord.bass) : null;
  const rootPc = pc(chord.root);
  const n = tuning.length;
  const found = new Map();

  for (let w = 1; w <= maxFret - maxSpan + 1; w++) {
    const opts = tuning.map((open) => {
      const o = [null];
      if (tones.has(open % 12)) o.push(0);
      for (let f = w; f <= w + maxSpan - 1; f++) if (tones.has((open + f) % 12)) o.push(f);
      return o;
    });
    const cur = new Array(n);
    const rec = (i) => {
      if (i === n) { consider(cur); return; }
      for (const f of opts[i]) { cur[i] = f; rec(i + 1); }
    };
    rec(0);
  }

  function consider(frets) {
    let first = -1;
    let last = -1;
    let count = 0;
    for (let i = 0; i < n; i++) if (frets[i] !== null) { if (first < 0) first = i; last = i; count++; }
    if (count < minSounding) return;
    let inner = 0;
    for (let i = first; i <= last; i++) if (frets[i] === null) inner++;
    if (inner > 1) return;
    const bassPc = (tuning[first] + frets[first]) % 12;
    if (bassReq !== null && bassPc !== bassReq) return;
    const present = new Set();
    for (let i = first; i <= last; i++) if (frets[i] !== null) present.add((tuning[i] + frets[i]) % 12);
    for (const r of required) if (!present.has(r)) return;
    const copy = frets.slice();
    const key = tabKey(copy);
    if (found.has(key)) return;
    const fr = assignFingers(copy);
    if (!fr) return;
    const nz = copy.filter((f) => f > 0);
    const span = nz.length ? Math.max(...nz) - Math.min(...nz) : 0;
    if (span > maxSpan - 1) return;
    const baseFret = nz.length ? Math.min(...nz) : 0;
    const openCount = copy.filter((f) => f === 0).length;
    const rootBass = bassPc === rootPc;
    const fingersUsed = new Set(fr.fingers.filter((x) => x !== null)).size;
    const feat = { span, baseFret, openCount, count, barre: fr.barre ? 1 : 0, inner, nonRoot: rootBass ? 0 : 1, fingersUsed };
    const score = scoreOf(feat);
    found.set(key, {
      frets: copy, fingers: fr.fingers, barre: fr.barre, baseFret, bassPc, rootBass,
      caged: cagedLabel(copy, chord), score, key,
    });
  }
  return [...found.values()];
}

function deepFreeze(v) {
  Object.freeze(v.frets); Object.freeze(v.fingers);
  if (v.barre) Object.freeze(v.barre);
  return Object.freeze(v);
}

const cache = new Map();

export function generateVoicings(chordOrSymbol, { tuning = STANDARD, maxFret = 15, maxSpan = 4 } = {}) {
  const chord = typeof chordOrSymbol === 'string' ? parseChord(chordOrSymbol) : chordOrSymbol;
  const nonDefault = tuning !== STANDARD || maxFret !== 15 || maxSpan !== 4;
  const ck = chord.symbol + (nonDefault ? `|${JSON.stringify([tuning, maxFret, maxSpan])}` : '');
  let hit = cache.get(ck);
  if (!hit) {
    let list = search(chord, tuning, maxFret, maxSpan, 4);
    if (!list.length && (chord.quality === 'dim' || chord.quality === 'aug')) {
      list = search(chord, tuning, maxFret, maxSpan, 3);
    }
    list.sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
    hit = list.map(deepFreeze);
    cache.set(ck, hit);
  }
  return hit.slice();
}
