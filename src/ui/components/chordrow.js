// The progression chord row: one tappable tile per chord with its number, a "new / you know this" mark,
// and the easiest shape. Returns { el, setCurrent(index|null) }.
import { h, prettyChord, prettyRoman } from '../dom.js';
import { routeHash } from '../router.js';
import { renderMiniDiagram } from './neck.js';

// items: [{ symbol, roman, known, voicing }]
export function renderChordRow(items) {
  const tiles = items.map((it) => h('li', {},
    h('a', { class: 'chord', href: routeHash('chord', { symbol: it.symbol }), 'aria-label': `${prettyChord(it.symbol)}, ${it.known ? 'you know this chord' : 'new chord'}. Open chord page.` },
      h('span', { class: 'chord-name' }, prettyChord(it.symbol)),
      h('span', { class: 'chord-num' }, prettyRoman(it.roman)),
      h('span', { class: it.known ? 'chord-tag known' : 'chord-tag new' }, it.known ? 'you know this' : 'new'),
      it.voicing ? renderMiniDiagram(it.voicing, prettyChord(it.symbol)) : null)));
  const el = h('ul', { class: 'chord-row', 'aria-label': 'Chords in order' }, tiles);
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
