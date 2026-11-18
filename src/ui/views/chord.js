// Chord screen (#/chord/<symbol>): every way to play one chord, stepped through one shape at a time.
// The selected shape lives in this screen only, not in the address.
import { parseChord, chordNotes, CHORD_TYPES } from '../../theory/chords.js';
import { pc } from '../../theory/notes.js';
import { generateVoicings } from '../../guitar/voicings.js';
import { isKnown } from '../../guitar/capo.js';
import { STRUMS } from '../../content/patterns.js';
import { routeHash } from '../router.js';
import { h, icon, prettyChord } from '../dom.js';
import { renderNeck, NECK_FRET_W } from '../components/neck.js';

const SWIPE = 40;
const WINDOW = 6;          // frets shown when the neck is zoomed in
const WHOLE_SCALE = 0.85;  // screen px per user unit on the scrollable whole neck (dots stay about 19px)
const SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function unknown() {
  return h('div', { class: 'page notice' },
    h('h1', { tabindex: '-1' }, 'That chord isn’t one I know'),
    h('p', { class: 'lede' }, 'Try finding a chord from a mood or a method instead.'),
    h('p', {}, h('a', { class: 'button', href: routeHash('find') }, 'Back to Find')));
}

const article = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

// The real spelled name of a pitch class that belongs to this chord.
function noteName(chord, pcValue, notes) {
  const hit = [...notes, chord.bass].filter(Boolean).find((n) => pc(n) === pcValue);
  return hit ?? SHARPS[pcValue];
}

// Which frets to show when zoomed in: about six, around the shape.
function windowFor(v) {
  const nz = v.frets.filter((f) => f > 0);
  const lo = nz.length ? Math.min(...nz) : 1;
  let from = v.frets.includes(0) ? 1 : Math.max(1, lo - 1);
  from = Math.min(from, 15 - WINDOW + 1);
  return { from, to: from + WINDOW - 1 };
}

const posLabel = (v) => (v.frets.includes(0) ? 'open' : String(v.baseFret));

export const chordView = {
  render(params, ctx) {
    let chord;
    let shapes;
    try {
      chord = parseChord(params.symbol);
      shapes = generateVoicings(chord.symbol);
    } catch {
      return unknown();
    }
    if (!shapes || !shapes.length) return unknown();

    const symbol = chord.symbol;
    const shown = prettyChord(symbol);
    const notes = chordNotes(chord);
    const plain = CHORD_TYPES[chord.quality].plain;
    let idx = 0;
    let whole = false;

    const head = h('header', { class: 'page-head' },
      h('h1', { tabindex: '-1' }, shown),
      h('p', { class: 'lede' }, `${shown} is ${article(plain)} ${plain} chord${chord.bass ? `, played with ${prettyChord(chord.bass)} as the lowest note` : ''}.`),
      h('p', { class: 'chord-notes' }, h('span', { class: 'muted' }, 'Notes: '), notes.map(prettyChord).join('  ')));

    const count = h('p', { class: 'shape-count', 'aria-live': 'polite' });
    const prev = h('button', { type: 'button', class: 'button ghost step', 'aria-label': 'Previous shape', onclick: () => go(idx - 1) }, icon('back'));
    const next = h('button', { type: 'button', class: 'button ghost step', 'aria-label': 'Next shape', onclick: () => go(idx + 1) }, icon('next'));
    const stepper = h('div', { class: 'stepper' }, prev, count, next);

    const strip = h('div', { class: 'shape-strip', role: 'group', 'aria-label': 'All shapes, by position on the neck' },
      shapes.map((v, i) => h('button', {
        type: 'button', class: 'strip-btn',
        'aria-label': `Shape ${i + 1}, ${v.frets.includes(0) ? 'open position' : `fret ${v.baseFret}`}`,
        onclick: () => go(i),
      }, posLabel(v))));
    const stripBtns = [...strip.children];

    const neckBox = h('div', { class: 'neck-box' });
    const zoom = h('button', { type: 'button', class: 'toggle', 'aria-pressed': 'false', onclick: () => { whole = !whole; draw(); } }, 'Show whole neck');
    const strum = h('button', { type: 'button', class: 'button', onclick: () => strumIt() }, icon('play'), 'Strum it');
    const noteLine = h('p', { class: 'play-note', role: 'status' });
    const facts = h('div', { class: 'shape-facts' });
    const stage = h('div', { class: 'shape-stage' }, neckBox);

    function strumIt() {
      noteLine.textContent = '';
      Promise.resolve(ctx.player.play({
        voicings: [shapes[idx].frets], pattern: STRUMS.find((p) => p.id === 'all-downs'),
        kind: 'strum', bpm: 90, beatsPerChord: 1, timeSig: 4, loop: false,
      })).catch(() => { noteLine.textContent = 'The sound couldn’t start. Check your volume and try again.'; });
    }

    function go(i) {
      if (i < 0 || i >= shapes.length) return;
      idx = i;
      draw();
    }

    function draw() {
      const v = shapes[idx];
      count.textContent = `Shape ${idx + 1} of ${shapes.length}`;
      prev.disabled = idx === 0;
      next.disabled = idx === shapes.length - 1;
      stripBtns.forEach((b, i) => {
        if (i === idx) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
      });
      // Scroll only the strip itself, never the page.
      const b = stripBtns[idx];
      strip.scrollLeft = b.offsetLeft - (strip.clientWidth - b.offsetWidth) / 2;

      zoom.setAttribute('aria-pressed', String(whole));
      zoom.textContent = whole ? 'Show fewer frets' : 'Show whole neck';
      stage.style.touchAction = whole ? '' : 'pan-y';
      let svg;
      if (whole) {
        svg = renderNeck(v, { fromFret: 0, toFret: 15, name: shown });
        svg.setAttribute('width', String(Math.round(Number(svg.dataset.vbw) * WHOLE_SCALE)));
        neckBox.className = 'neck-box scroll';
      } else {
        const w = windowFor(v);
        svg = renderNeck(v, { fromFret: w.from, toFret: w.to, name: shown });
        neckBox.className = 'neck-box';
      }
      neckBox.replaceChildren(svg);
      if (whole) {
        const nz = v.frets.filter((f) => f > 0);
        const lo = nz.length ? Math.min(...nz) : 1;
        neckBox.scrollLeft = Math.max(0, (lo - 1.5) * NECK_FRET_W * WHOLE_SCALE);
      }

      const lines = [];
      if (idx === 0 && isKnown(symbol, ctx.store.state.known)) {
        lines.push(h('p', { class: 'fact known' }, 'You know this one. It’s on your list of chords you can play.'));
      }
      if (!v.rootBass && !chord.bass) {
        const lowest = prettyChord(noteName(chord, v.bassPc, notes));
        lines.push(h('p', { class: 'fact' }, `The lowest note is ${lowest}, not ${prettyChord(chord.root)}: an inversion. It sounds lighter.`));
      } else if (!v.rootBass && chord.bass) {
        lines.push(h('p', { class: 'fact' }, `The lowest note is ${prettyChord(chord.bass)}, as the name asks, not ${prettyChord(chord.root)}.`));
      }
      if (v.caged) {
        lines.push(h('p', { class: 'fact' },
          `CAGED: ${v.caged} shape. One of five basic shapes that cover the neck. `,
          h('a', { href: routeHash('learn', { id: 'caged' }) }, 'Learn about CAGED')));
      }
      facts.replaceChildren(...lines);
    }

    // Swipe the neck area.
    let sx = 0;
    let sy = 0;
    let tracking = false;
    stage.addEventListener('pointerdown', (e) => { if (!whole) { tracking = true; sx = e.clientX; sy = e.clientY; } });
    stage.addEventListener('pointercancel', () => { tracking = false; });
    stage.addEventListener('pointerup', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.clientX - sx;
      if (Math.abs(dx) >= SWIPE && Math.abs(dx) > Math.abs(e.clientY - sy) * 1.5) go(idx + (dx < 0 ? 1 : -1));
    });

    const root = h('div', {
      class: 'page chord-page', tabindex: '-1',
      onkeydown: (e) => {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === 'ArrowRight') { go(idx + 1); e.preventDefault(); }
        else if (e.key === 'ArrowLeft') { go(idx - 1); e.preventDefault(); }
      },
    },
      head, stepper, stage,
      h('div', { class: 'neck-actions' }, strum, zoom),
      noteLine, facts,
      h('p', { class: 'muted strip-help' }, 'All shapes, easiest first, each labelled by where it sits. Tap one to jump to it.'), strip,
      h('p', { class: 'muted swipe-hint' }, 'Swipe the neck, or use the arrow keys, for the next shape.'));
    draw();
    return root;
  },
};
