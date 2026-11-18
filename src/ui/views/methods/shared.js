// Pieces every method tool shares: playing, a progression row, the base progression, a key picker.
import { PROGRESSIONS } from '../../../content/progressions.js';
import { STRUMS } from '../../../content/patterns.js';
import { progressionChords, KEYS, isMinorMode } from '../../../theory/roman.js';
import { MODE_INFO } from '../../../theory/scales.js';
import { generateVoicings } from '../../../guitar/voicings.js';
import { isKnown } from '../../../guitar/capo.js';
import { routeHash } from '../../router.js';
import { h, icon, prettyChord, prettyRoman } from '../../dom.js';
import { renderChordRow } from '../../components/chordrow.js';
import { valid } from '../progression.js';

const FOLK = STRUMS.find((p) => p.id === 'folk');
const shapeCache = new Map();

// The easiest shape for a chord symbol, or null.
export function easyVoicing(symbol) {
  if (!shapeCache.has(symbol)) {
    let v = null;
    try { v = generateVoicings(symbol)[0] ?? null; } catch { /* no shape */ }
    shapeCache.set(symbol, v);
  }
  return shapeCache.get(symbol);
}

// Chords + shapes for a list of chord numbers, or null if any of it can't be shown.
export function resolve(romans, tonic) {
  try {
    const chords = progressionChords(romans, tonic);
    const voicings = chords.map((c) => easyVoicing(c.symbol));
    if (voicings.some((v) => !v)) return null;
    return { chords, voicings };
  } catch {
    return null;
  }
}

export const keyName = (tonic, mode) => `${prettyChord(tonic)} ${isMinorMode(mode) ? 'minor' : 'major'}`;

// "C minor", "C dorian"
export function fromName(tonic, mode) {
  const name = mode === 'aeolian' ? 'minor' : mode === 'ionian' ? 'major' : (MODE_INFO[mode]?.name ?? mode).toLowerCase();
  return `${prettyChord(tonic)} ${name}`;
}

export function openLink(methodId, tonic, mode, romans, label = 'Open this progression') {
  return h('a', { class: 'button ghost small', href: routeHash('prog', { t: tonic, m: mode, r: romans, src: `method:${methodId}` }) }, label);
}

// Playing inside a tool. One row sounds at a time; its button turns into Stop while it plays.
export function createSound(ctx) {
  let active = null;      // { btn, row }
  let pending = false;
  let timer = 0;
  const note = h('p', { class: 'play-note', role: 'status' });

  const face = (btn, on) => {
    btn.replaceChildren(icon(on ? 'stop' : 'play'), on ? 'Stop' : btn.dataset.label);
    btn.setAttribute('aria-label', `${on ? 'Stop' : 'Play'}: ${btn.dataset.what}`);
  };
  function reset() {
    clearInterval(timer);
    timer = 0;
    if (active) { active.row?.setCurrent(null); face(active.btn, false); }
    active = null;
  }
  function stop() {
    ctx.player.stop();
    pending = false;
    reset();
  }
  function watch() {
    clearInterval(timer);
    timer = setInterval(() => { if (!pending && !ctx.player.playing) reset(); }, 250);
  }

  // voicings: [{frets}], row: a chord row to light up (optional), what: spoken name.
  function button({ voicings, row = null, what, label = 'Play' }) {
    const btn = h('button', { type: 'button', class: 'button small play-btn', 'data-label': label, 'data-what': what });
    face(btn, false);
    btn.addEventListener('click', async () => {
      if (active && active.btn === btn) { stop(); return; }
      reset();
      const mine = { btn, row };
      active = mine;
      face(btn, true);
      note.textContent = '';
      ctx.player.onStep = (i) => row?.setCurrent(i);
      pending = true;
      watch();
      try {
        await ctx.player.play({
          voicings: voicings.map((v) => v.frets), pattern: FOLK, kind: 'strum', bpm: 90, beatsPerChord: 4, timeSig: 4, loop: false,
        });
      } catch (err) {
        console.warn(err);
        if (active === mine) { note.textContent = 'The guitar sounds couldn’t load. Check your connection and try again.'; reset(); }
      } finally {
        if (active === mine) pending = false;
      }
    });
    return btn;
  }
  return { button, stop, note, destroy() { stop(); ctx.player.onStep = () => {}; } };
}

// A titled, playable row of chord tiles.
// opts: { tonic, mode, romans, title, sub, id (method id), items (extra per-tile data) }
export function progRow(ctx, sound, opts) {
  const { tonic, mode, romans, title, sub, id } = opts;
  const head = h('div', { class: 'row-head' },
    title ? h('h3', { class: 'row-title' }, title) : null,
    sub ? h('p', { class: 'row-sub' }, sub) : null);
  const got = resolve(romans, tonic);
  if (!got) {
    return h('div', { class: 'tool-row' }, head, h('p', { class: 'row-sub' }, 'This one can’t be shown in this key.'));
  }
  const known = ctx.store.state.known;
  const tiles = renderChordRow(got.chords.map((c, i) => ({
    symbol: c.symbol, roman: romans[i], known: isKnown(c.symbol, known), voicing: got.voicings[i],
    ...(opts.items ? opts.items[i] : {}),
  })));
  const what = title || romans.map(prettyRoman).join(' ');
  return h('div', { class: 'tool-row' }, head, tiles.el,
    h('div', { class: 'row-actions' },
      sound.button({ voicings: got.voicings, row: tiles, what }),
      openLink(id, tonic, mode, romans)));
}

// Base progression for the tools that start from one: the valid r/t/m query, otherwise the axis loop.
export function baseFrom(params) {
  if (valid(params)) return { romans: [...params.r], tonic: params.t, mode: params.m, name: 'Your progression', fromQuery: true };
  const a = PROGRESSIONS.axis;
  return { romans: [...a.romans], tonic: a.tonic, mode: a.mode, name: a.name, fromQuery: false };
}

// Pick a progression to start from: the one that was passed in (if any), then a list of loops.
export function basePicker(base, loopIds, onPick) {
  const opts = [];
  if (base.fromQuery) opts.push({ value: 'mine', label: 'Your progression' });
  for (const id of loopIds) opts.push({ value: id, label: PROGRESSIONS[id].name });
  const sel = h('select', { id: 'base-pick', class: 'select wide' },
    opts.map((o) => h('option', { value: o.value }, o.label)));
  sel.addEventListener('change', () => onPick(sel.value));
  return h('div', { class: 'keybar' }, h('label', { for: 'base-pick' }, 'Start from'), sel);
}

// Key picker: major or minor, then the home note.
export function keyPicker({ tonic, minor }, onChange) {
  let state = { tonic, minor };
  const tonicSel = h('select', { id: 'tonic-pick', class: 'select' });
  const fill = () => tonicSel.replaceChildren(...(state.minor ? KEYS.minor : KEYS.major).map((k) =>
    h('option', { value: k, selected: k === state.tonic }, prettyChord(k))));
  fill();
  const buttons = ['major', 'minor'].map((kind) => h('button', {
    type: 'button', class: 'seg-btn', 'aria-pressed': String((kind === 'minor') === state.minor),
    onclick: () => {
      if ((kind === 'minor') === state.minor) return;
      state = { tonic: (kind === 'minor' ? KEYS.minor : KEYS.major).includes(state.tonic) ? state.tonic : 'C', minor: kind === 'minor' };
      buttons.forEach((b, i) => b.setAttribute('aria-pressed', String((i === 1) === state.minor)));
      fill();
      onChange({ ...state });
    },
  }, kind));
  tonicSel.addEventListener('change', () => { state = { ...state, tonic: tonicSel.value }; onChange({ ...state }); });
  return h('div', { class: 'keybar' },
    h('label', { for: 'tonic-pick' }, 'Home note'), tonicSel,
    h('div', { class: 'seg', role: 'group', 'aria-label': 'Major or minor' }, buttons));
}
