// Chord family tool: the seven chords of one key, build a progression by tapping, and try one new chord.
import { diatonicFamily, romanToChord, FUNCTION_PLAIN, functionOf } from '../../../theory/roman.js';
import { borrowOptions, nextHints } from '../../../theory/methods.js';
import { isKnown } from '../../../guitar/capo.js';
import { routeHash } from '../../router.js';
import { h, prettyChord, prettyRoman } from '../../dom.js';
import { renderChordRow } from '../../components/chordrow.js';
import { renderMiniDiagram } from '../../components/neck.js';
import { easyVoicing, fromName, keyName, keyPicker, openLink } from './shared.js';

const MAX = 8;

// A plain mood word for a chord, by its number. The same number can mean different things in a major or minor key.
const MOOD_MAJOR = {
  i: 'a sudden shadow over home',
  iv: 'wistful, a little sad',
  bVI: 'big and heroic',
  bVII: 'open, with a rock swagger',
  bIII: 'a darker, heroic lift',
  'ii°': 'tense, wants to move on',
  IV: 'a bright lift',
  V: 'a strong pull toward home',
  ii: 'gentle, wants to move on',
  iii: 'soft and dreamy',
  vi: 'a sad cousin of home',
  'vii°': 'tense, wants to resolve',
};
const MOOD_MINOR = {
  i: 'home itself, settled and sad',
  I: 'a sunny, hopeful turn away from the sadness',
  iv: 'quiet and inward',
  bIII: 'a warm, hopeful lift',
  bVI: 'big and heroic',
  bVII: 'open, with a rock swagger',
  'ii°': 'tense, wants to move on',
  IV: 'a bright lift',
  V: 'a strong pull toward home',
  v: 'quiet, leans toward home',
};
const moodOf = (roman, minor) => (minor ? MOOD_MINOR : MOOD_MAJOR)[roman] ?? FUNCTION_PLAIN[functionOf(roman)].split(':')[0];

export function familyTool(ctx, sound, params) {
  let key = { tonic: 'C', minor: false };
  let picks = [];

  const mode = () => (key.minor ? 'aeolian' : 'ionian');
  const known = () => ctx.store.state.known;
  const fam = () => diatonicFamily(key.tonic, mode(), false);

  const headline = h('p', { class: 'headline', role: 'status' });
  const tileBox = h('div', { class: 'tiles' });
  const built = h('div', { class: 'built' });
  const tryBox = h('div', { class: 'try' });

  function drawTiles() {
    sound.stop();
    const f = fam();
    const k = f.filter((x) => isKnown(x.chord.symbol, known())).length;
    headline.textContent = `You already know ${k} of the 7 chords in ${keyName(key.tonic, mode())}`;
    const last = picks.length ? picks[picks.length - 1] : null;
    const next = last ? nextHints(last, mode()) : [];
    const row = renderChordRow(f.map((x) => ({
      symbol: x.chord.symbol, roman: x.roman, known: isKnown(x.chord.symbol, known()), voicing: easyVoicing(x.chord.symbol),
      mark: next.includes(x.roman) ? 'often comes next' : null,
      label: `Add ${prettyChord(x.chord.symbol)}. ${isKnown(x.chord.symbol, known()) ? 'You know this chord' : 'New chord'}${next.includes(x.roman) ? ', often comes next' : ''}`,
      onPick: () => {
        if (picks.length >= MAX) return;
        picks = [...picks, x.roman];
        drawTiles();
        drawBuilt();
      },
    })), { label: `The seven chords in ${keyName(key.tonic, mode())}. Tap one to add it.` });
    tileBox.replaceChildren(row.el);
  }

  function drawBuilt() {
    sound.stop();
    if (!picks.length) {
      built.replaceChildren(h('p', { class: 'row-sub' }, 'Your progression will show up here. Tap a chord above to start.'));
      return;
    }
    const f = fam();
    const symbolOf = (r) => f.find((x) => x.roman === r).chord.symbol;
    const chips = picks.map((r, i) => h('li', {},
      h('button', {
        type: 'button', class: 'pick-chip',
        'aria-label': `Remove ${prettyChord(symbolOf(r))}, number ${i + 1}`,
        onclick: () => { picks = picks.filter((_, j) => j !== i); drawTiles(); drawBuilt(); },
      }, h('span', { class: 'chip-name' }, prettyChord(symbolOf(r))), h('span', { class: 'chip-x', 'aria-hidden': 'true' }, '×'))));
    const voicings = picks.map((r) => easyVoicing(symbolOf(r)));
    built.replaceChildren(
      h('ul', { class: 'pick-list', 'aria-label': 'Your progression, tap a chord to remove it' }, chips),
      h('p', { class: 'row-sub' }, `${picks.length} of ${MAX} chords. Tap a chord to take it out.`),
      h('div', { class: 'row-actions' },
        voicings.every(Boolean) ? sound.button({ voicings, what: 'your progression' }) : null,
        openLink('family', key.tonic, mode(), picks),
        h('button', { type: 'button', class: 'button ghost small', onclick: () => { picks = []; drawTiles(); drawBuilt(); } }, 'Clear')));
  }

  function drawTry() {
    const f = fam();
    const seen = new Set();
    const items = [];
    for (const x of f) {
      if (!isKnown(x.chord.symbol, known())) continue;
      for (const o of borrowOptions(x.roman, mode())) {
        if (seen.has(o.roman)) continue;
        seen.add(o.roman);
        items.push({ roman: o.roman, why: `Borrowed from ${fromName(key.tonic, o.from)} (same home note)`, borrowed: true });
      }
    }
    for (const x of f) {
      if (isKnown(x.chord.symbol, known()) || seen.has(x.roman)) continue;
      seen.add(x.roman);
      items.push({ roman: x.roman, why: `Already in ${keyName(key.tonic, mode())}`, borrowed: false });
    }
    const cards = items.map((it) => {
      const symbol = romanSymbol(it.roman, key.tonic);
      const v = symbol && easyVoicing(symbol);
      if (!v) return null;
      return h('li', { class: 'try-card' },
        h('div', { class: 'try-diagram' }, renderMiniDiagram(v, prettyChord(symbol))),
        h('div', { class: 'try-text' },
          h('p', { class: 'try-name' }, h('span', { class: 'chord-name' }, prettyChord(symbol)), h('span', { class: 'chord-num' }, prettyRoman(it.roman)),
            isKnown(symbol, known()) ? h('span', { class: 'chord-tag known' }, 'you know this') : h('span', { class: 'chord-tag new' }, 'new')),
          h('p', { class: 'try-mood' }, `${moodOf(it.roman, key.minor).replace(/^./, (c) => c.toUpperCase())}.`),
          h('p', { class: 'row-sub' }, it.why),
          h('div', { class: 'row-actions' },
            sound.button({ voicings: [v], what: prettyChord(symbol) }),
            h('a', { class: 'button ghost small', href: routeHash('chord', { symbol }) }, 'Chord page'))));
    }).filter(Boolean);
    tryBox.replaceChildren(h('ul', { class: 'try-list' }, cards));
  }

  const picker = keyPicker(key, (k) => {
    const minorChanged = k.minor !== key.minor;
    key = k;
    if (minorChanged) picks = [];
    drawTiles(); drawBuilt(); drawTry();
  });

  drawTiles(); drawBuilt(); drawTry();
  return h('div', { class: 'tool' },
    picker,
    headline,
    h('p', { class: 'section-intro' }, 'These seven chords belong together. Tap them to build a progression (up to 8). After each tap, the chords that often come next are marked.'),
    tileBox,
    h('section', { class: 'section', 'aria-labelledby': 'built-title' },
      h('h2', { id: 'built-title' }, 'Your progression'), built),
    h('section', { class: 'section', 'aria-labelledby': 'try-title' },
      h('h2', { id: 'try-title' }, 'Try one new chord'),
      h('p', { class: 'section-intro' }, 'Chords outside the ones you know that change the mood. Hear one by itself first.'),
      tryBox));
}

function romanSymbol(roman, tonic) {
  try { return romanToChord(roman, tonic).symbol; } catch { return null; }
}
