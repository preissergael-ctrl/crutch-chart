// The progression chord row: one tappable tile per chord with its number, a "new / you know this" mark,
// and the easiest shape. Returns { el, setCurrent(index|null) }.
import { h, prettyChord, prettyRoman } from '../dom.js';
import { routeHash } from '../router.js';
import { renderMiniDiagram } from './neck.js';

// items: [{ symbol, roman, known, voicing, onPick?, label?, mark?, sub? }]
//   onPick: make the tile a button that calls this instead of a link to the chord page
//   label:  spoken label for a button tile
//   mark:   an extra small pill under the known/new tag (e.g. "often comes next")
//   sub:    an extra small line under the number (e.g. "bass: B")
export function renderChordRow(items, { label = 'Chords in order' } = {}) {
  const tiles = items.map((it) => {
    const kids = [
      h('span', { class: 'chord-name' }, prettyChord(it.symbol)),
      h('span', { class: 'chord-num' }, prettyRoman(it.roman)),
      it.sub ? h('span', { class: 'chord-sub' }, it.sub) : null,
      h('span', { class: it.known ? 'chord-tag known' : 'chord-tag new' }, it.known ? 'you know this' : 'new'),
      it.mark ? h('span', { class: 'chord-tag next' }, it.mark) : null,
      it.voicing ? renderMiniDiagram(it.voicing, prettyChord(it.symbol)) : null,
    ];
    const state = it.known ? 'you know this chord' : 'new chord';
    const tile = it.onPick
      ? h('button', {
        type: 'button', class: 'chord',
        'aria-label': it.label ?? `${prettyChord(it.symbol)}, ${state}${it.mark ? `, ${it.mark}` : ''}`,
        onclick: it.onPick,
      }, kids)
      : h('a', {
        class: 'chord', href: routeHash('chord', { symbol: it.symbol }),
        'aria-label': `${prettyChord(it.symbol)}, ${state}. Open chord page.`,
      }, kids);
    return h('li', {}, tile);
  });
  const el = h('ul', { class: 'chord-row', 'aria-label': label }, tiles);
  let at = -1;
  return {
    el,
    setCurrent(i) {
      if (at === i) return;
      if (at >= 0 && tiles[at]) tiles[at].firstElementChild.classList.remove('current');
      at = i === null || i === undefined ? -1 : i;
      if (at >= 0 && tiles[at]) tiles[at].firstElementChild.classList.add('current');
    },
  };
}
