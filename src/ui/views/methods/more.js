// The simpler tools: loops, circle, modes, bass.
import { PROGRESSIONS, FAMOUS_LOOPS } from '../../../content/progressions.js';
import { progressionChords, diatonicFamily } from '../../../theory/roman.js';
import { MODE_INFO } from '../../../theory/scales.js';
import { circleChain, BASS_WALKS } from '../../../theory/methods.js';
import { isKnown } from '../../../guitar/capo.js';
import { h, prettyChord, prettyRoman, firstSentence } from '../../dom.js';
import { routeHash } from '../../router.js';
import { resolve, progRow, keyPicker, keyName } from './shared.js';

export function loopsTool(ctx, sound) {
  const known = ctx.store.state.known;
  const cards = FAMOUS_LOOPS.map((id) => {
    const e = PROGRESSIONS[id];
    const got = resolve(e.romans, e.tonic);
    if (!got) return null;
    const symbols = got.chords.map((c) => c.symbol);
    const shown = symbols.filter((s, i) => s !== symbols[i - 1]); // long loops repeat a chord: show it once per run
    const uniq = [...new Set(symbols)];
    const k = uniq.filter((s) => isKnown(s, known)).length;
    const knowLine = k === uniq.length
      ? `You know all ${uniq.length} of these chords.`
      : `You know ${k} of these ${uniq.length} chords.`;
    return h('li', { class: 'loop-card' },
      h('h3', { class: 'row-title' }, e.name),
      h('p', { class: 'loop-key' }, `${keyName(e.tonic, e.mode)}: ${e.romans.filter((r, i) => r !== e.romans[i - 1]).map(prettyRoman).join(' ')}`),
      h('div', { class: 'prog-chords' }, shown.map((s) => h('span', { class: isKnown(s, known) ? 'prog-chord is-known' : 'prog-chord' }, prettyChord(s)))),
      h('p', { class: 'row-sub' }, knowLine),
      h('p', { class: 'prog-why' }, firstSentence(e.why)),
      h('div', { class: 'row-actions' },
        sound.button({ voicings: got.voicings, what: e.name }),
        h('a', { class: 'button ghost small', href: routeHash('prog', { t: e.tonic, m: e.mode, r: e.romans, id, src: 'method:loops' }) }, 'Open this progression')));
  }).filter(Boolean);
  return h('div', { class: 'tool' },
    h('p', { class: 'section-intro' }, 'Short chord patterns that thousands of songs use. Chords you already know are shaded.'),
    h('ul', { class: 'loop-list' }, cards));
}

export function circleTool(ctx, sound, params = {}) {
  let key = { tonic: params.t === 'A' ? 'A' : 'C', minor: params.m === 'aeolian' };
  let len = Math.min(5, Math.max(2, Math.round(Number(params.n)) || 4));
  const body = h('div', { class: 'tool-body' });
  const out = h('output', { class: 'tempo-out', for: 'len' }, String(len));
  const slider = h('input', { id: 'len', type: 'range', min: 2, max: 5, step: 1, value: len, class: 'range', 'aria-valuetext': `${len} chords` });

  function draw() {
    sound.stop();
    const mode = key.minor ? 'aeolian' : 'ionian';
    const romans = circleChain(len, mode);
    const chords = progressionChords(romans, key.tonic);
    const at = romans.indexOf('bVI');
    const odd = key.minor && at >= 0 && romans[at + 1] === 'ii°'
      ? ` One link here (${prettyChord(chords[at].root)} to ${prettyChord(chords[at + 1].root)}) is a slightly smaller fifth, because ${prettyChord(chords[at + 1].root)} is the scale’s tense, unstable chord.`
      : '';
    body.replaceChildren(progRow(ctx, sound, {
      id: 'circle', tonic: key.tonic, mode, romans, title: `A chain of ${len} chords`,
      sub: `Each chord’s root sits a fifth above the next one’s (five notes up the scale, counting the first), so they fall like dominoes and land on ${prettyChord(chords[chords.length - 1].symbol)}, home.${odd}`,
    }));
  }
  slider.addEventListener('input', () => {
    len = Number(slider.value);
    out.textContent = String(len);
    slider.setAttribute('aria-valuetext', `${len} chords`);
    draw();
  });
  const picker = keyPicker(key, (k) => { key = k; draw(); });
  draw();
  return h('div', { class: 'tool' },
    h('p', { class: 'section-intro' }, 'Pick a key and how long the chain should be. It always ends at home.'),
    picker,
    h('div', { class: 'field' },
      h('label', { for: 'len' }, 'How many chords'),
      h('div', { class: 'tempo-line' }, slider, h('span', { class: 'tempo-val' }, out, ' chords'))),
    body);
}

const MODE_LIST = [
  ['ionian', 'axis'], ['dorian', 'dorian-vamp'], ['phrygian', 'phrygian-vamp'],
  ['lydian', 'lydian-12'], ['mixolydian', 'mixo-rock'], ['aeolian', 'sad-aeolian'],
];

export function modesTool(ctx, sound) {
  const sections = MODE_LIST.map(([mode, pid]) => {
    const e = PROGRESSIONS[pid];
    const fam = diatonicFamily(e.tonic, mode).map((x) => prettyChord(x.chord.symbol)).join('  ');
    return h('section', { class: 'mode-card' },
      h('h2', { class: 'mode-title' }, `${MODE_INFO[mode].name}`),
      h('p', { class: 'mode-plain' }, `${MODE_INFO[mode].plain}.`),
      h('p', { class: 'row-sub' }, `Its seven chords with ${prettyChord(e.tonic)} as home: `, h('strong', {}, fam)),
      progRow(ctx, sound, { id: 'modes', tonic: e.tonic, mode: e.mode, romans: e.romans, title: e.name, sub: 'A progression that shows off this mode.' }));
  });
  return h('div', { class: 'tool' },
    h('p', { class: 'section-intro' }, 'Same seven notes, a different home. Each mode has its own color. Play each example and listen.'),
    ...sections);
}

export function bassTool(ctx, sound) {
  const tonic = 'C';
  const rows = Object.values(BASS_WALKS).map((w) => {
    const chords = progressionChords(w.romans, tonic);
    const bass = chords.map((c) => prettyChord(c.bass ?? c.root));
    return progRow(ctx, sound, {
      id: 'bass', tonic, mode: 'ionian', romans: w.romans, title: w.name,
      sub: `The lowest note moves ${bass.join(', ')}.`,
      items: chords.map((c) => ({ sub: `bass: ${prettyChord(c.bass ?? c.root)}` })),
    });
  });
  return h('div', { class: 'tool' },
    h('p', { class: 'section-intro' }, 'A slash chord names the bass note after a slash. G/B means play G with B as the lowest note. The small diagrams show how to finger each one.'),
    ...rows);
}
