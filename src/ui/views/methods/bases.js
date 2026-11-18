// Tools that start from a base progression: rotate, tension, borrow, spice.
import { PROGRESSIONS, FAMOUS_LOOPS } from '../../../content/progressions.js';
import { romanToChord, functionOf, FUNCTION_PLAIN } from '../../../theory/roman.js';
import { rotations, ENDINGS, withEnding, borrowOptions, spiceOptions } from '../../../theory/methods.js';
import { h, prettyChord, prettyRoman } from '../../dom.js';
import { baseFrom, basePicker, progRow, fromName, keyName, easyVoicing } from './shared.js';

const symbolOf = (roman, tonic) => { try { return romanToChord(roman, tonic).symbol; } catch { return null; } };

// Lets the person change the base from a short list of loops; calls draw(base) now and on each change.
function withBase(sound, params, maxLen, draw) {
  let base = baseFrom(params);
  const mine = base;
  const loopIds = FAMOUS_LOOPS.filter((id) => PROGRESSIONS[id].romans.length <= maxLen);
  const body = h('div', { class: 'tool-body' });
  const go = () => { sound.stop(); body.replaceChildren(...draw(base)); };
  const picker = basePicker(mine, loopIds, (v) => {
    if (v === 'mine') base = mine;
    else { const e = PROGRESSIONS[v]; base = { romans: [...e.romans], tonic: e.tonic, mode: e.mode, name: e.name, fromQuery: false }; }
    go();
  });
  // Show the starting base as selected in the picker.
  const sel = picker.querySelector('select');
  if (mine.fromQuery) sel.value = 'mine';
  else if (loopIds.includes('axis')) sel.value = 'axis';
  go();
  return h('div', { class: 'tool' }, picker, body);
}

export function rotateTool(ctx, sound, params) {
  return withBase(sound, params, 8, (base) => {
    const { tonic, mode } = base;
    const key = keyName(tonic, mode);
    const rots = rotations(base.romans).slice(0, 8);
    const seen = new Set();
    const rows = [];
    rots.forEach((romans, i) => {
      const id = romans.join(' ');
      if (seen.has(id)) return;
      seen.add(id);
      const first = romans[0];
      const name = symbolOf(first, tonic);
      const fn = FUNCTION_PLAIN[functionOf(first)];
      rows.push(progRow(ctx, sound, {
        id: 'rotate', tonic, mode, romans,
        title: i === 0 ? 'The original' : `Start on chord ${i + 1}`,
        sub: `Starts on ${prettyChord(name)} (${prettyRoman(first)}), ${fn}.`,
      }));
    });
    return [
      h('p', { class: 'section-intro' }, `Same chords in ${key}, but each one starts on a different chord. Play them and notice how the mood shifts.`),
      ...rows,
    ];
  });
}

export function tensionTool(ctx, sound, params) {
  const WORDS = {
    strong: 'Ends on the chord that pulls hardest toward home, then lands there. It feels finished.',
    soft: 'The gentle “amen” sound, like the end of a hymn. It closes softly.',
    surprise: 'Heads toward home, then steps somewhere else. It feels unexpected.',
  };
  return withBase(sound, params, 8, (base) => {
    const { tonic, mode } = base;
    const rows = [progRow(ctx, sound, {
      id: 'tension', tonic, mode, romans: base.romans, title: 'Without an ending', sub: 'Just the progression as it is.',
    })];
    for (const [eid, e] of Object.entries(ENDINGS)) {
      const romans = withEnding(base.romans, eid, mode);
      const add = romans.slice(base.romans.length).map((r) => prettyChord(symbolOf(r, tonic))).join(' then ');
      rows.push(progRow(ctx, sound, {
        id: 'tension', tonic, mode, romans, title: e.name, sub: `Adds ${add}. ${WORDS[eid]}`,
        items: romans.map((_, i) => (i >= base.romans.length ? { mark: 'added' } : {})),
      }));
    }
    return [
      h('p', { class: 'section-intro' }, `The last chords decide how a phrase feels. Here are three endings added to your progression in ${keyName(tonic, mode)}.`),
      ...rows,
    ];
  });
}

// Shared by borrow and spice: one result row on top, then per-chord choices. swaps[i] is a chord number or null.
function swapTool(ctx, sound, params, id, { intro, choicesFor, chipText, empty }) {
  return withBase(sound, params, 8, (base) => {
    const { tonic, mode } = base;
    const swaps = base.romans.map(() => null);
    const result = h('div', { class: 'result' });
    const choices = h('div', { class: 'choices' });

    function redraw() {
      sound.stop();
      const romans = base.romans.map((r, i) => swaps[i] ?? r);
      result.replaceChildren(progRow(ctx, sound, {
        id, tonic, mode, romans, title: 'Your version',
        sub: swaps.some(Boolean) ? 'Changed chords are marked.' : 'Nothing changed yet. Pick a change below.',
        items: romans.map((_, i) => (swaps[i] ? { mark: 'changed' } : {})),
      }));
      drawChoices();
    }
    function drawChoices() {
      choices.replaceChildren(...base.romans.map((r, i) => {
        const opts = choicesFor(r, tonic, mode).map((o) => ({ ...o, symbol: symbolOf(o.roman, tonic) })).filter((o) => o.symbol && easyVoicing(o.symbol));
        const here = prettyChord(symbolOf(r, tonic));
        return h('section', { class: 'choice' },
          h('h3', { class: 'row-title' }, `Chord ${i + 1}: ${here}`),
          opts.length
            ? h('ul', { class: 'swap-list', 'aria-label': `Changes for ${here}` }, opts.map((o) => {
              const on = swaps[i] === o.roman;
              const t = chipText(o, tonic, mode);
              return h('li', {}, h('button', {
                type: 'button', class: 'swap', 'aria-pressed': String(on),
                'aria-label': `${on ? 'Undo: ' : ''}Change ${here} to ${prettyChord(o.symbol)}. ${t.join('. ')}`,
                onclick: () => { swaps[i] = on ? null : o.roman; redraw(); },
              }, h('span', { class: 'swap-name' }, prettyChord(o.symbol)), t.map((line, n) => h('span', { class: n ? 'swap-note warn' : 'swap-note' }, line))));
            }))
            : h('p', { class: 'row-sub' }, empty));
      }));
    }
    redraw();
    return [h('p', { class: 'section-intro' }, intro(keyName(tonic, mode))), result, choices];
  });
}

export function borrowTool(ctx, sound, params) {
  return swapTool(ctx, sound, params, 'borrow', {
    intro: (key) => `Swap a chord in ${key} for one borrowed from a scale with the same home note. Hear the surprise, and tap it again to undo.`,
    choicesFor: (roman, tonic, mode) => borrowOptions(roman, mode),
    chipText: (o, tonic) => [`from ${fromName(tonic, o.from)}`],
    empty: 'No swap for this chord.',
  });
}

export function spiceTool(ctx, sound, params) {
  return swapTool(ctx, sound, params, 'spice', {
    intro: (key) => `Change one note in a chord to give it a new color. Chords marked as outside the key add a bigger surprise. Pick one change per chord in ${key}. Tap it again to undo.`,
    choicesFor: (roman, tonic, mode) => spiceOptions(roman, tonic, mode),
    chipText: (o) => (o.inKey ? [o.label] : [o.label, 'outside the key, adds surprise']),
    empty: 'No spice for this chord.',
  });
}
