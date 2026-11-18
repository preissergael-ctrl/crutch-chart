// Find: pick a mood, a method, or start from the chords you know. Also the mood view (#/mood/<id>).
import { MOODS } from '../../content/moods.js';
import { METHODS } from '../../content/methods.js';
import { PROGRESSIONS } from '../../content/progressions.js';
import { progressionChords } from '../../theory/roman.js';
import { routeHash } from '../router.js';
import { h, icon, prettyChord, firstSentence } from '../dom.js';

// Each mood gets a quiet color and a little line that moves the way the music feels.
const LOOK = {
  happy:       { color: '#a87a22', line: 'M3 18 L15 12 L25 14 L45 5' },
  bittersweet: { color: '#9b5f55', line: 'M3 16 C12 4 21 4 27 12 S39 19 45 10' },
  sad:         { color: '#4d6884', line: 'M3 6 C15 7 25 13 45 19' },
  hopeful:     { color: '#4f8160', line: 'M3 14 C10 21 17 21 23 13 S37 4 45 4' },
  romantic:    { color: '#9c5368', line: 'M3 12 C8 4 15 4 21 12 S35 20 45 10' },
  dreamy:      { color: '#6f69a0', line: 'M3 12 C7 8 11 8 15 12 S23 16 27 12 S35 8 39 12 S43 14 45 13' },
  epic:        { color: '#9a4f2c', line: 'M3 20 H12 V15 H22 V10 H32 V4 H45' },
  chill:       { color: '#3f7f7b', line: 'M3 14 C13 9 21 17 31 12 S42 12 45 12' },
  bluesy:      { color: '#3e5d8a', line: 'M3 16 H13 C19 16 19 8 25 8 H31 C36 8 38 16 45 16' },
  rock:        { color: '#6a5745', line: 'M3 17 L11 7 L19 17 L27 7 L35 17 L43 7' },
  spanish:     { color: '#ad5236', line: 'M3 5 H11 V10 H19 V15 H27 V20 H33 L45 7' },
  dark:        { color: '#3b4249', line: 'M3 15 L9 19 L15 15 L21 19 L27 15 L33 19 L39 15 L45 19' },
};
const FALLBACK = { color: '#1f3a30', line: 'M3 12 H45' };

function moodLine(id, cls = 'mood-line') {
  const look = LOOK[id] || FALLBACK;
  return h('svg', { class: cls, viewBox: '0 0 48 24', 'aria-hidden': 'true' }, h('path', { d: look.line }));
}

const moodStyle = (id) => `--mood: ${(LOOK[id] || FALLBACK).color}`;

function moodTile(m) {
  return h('li', {},
    h('a', { class: 'mood-tile', href: routeHash('mood', { id: m.id }), style: moodStyle(m.id) },
      moodLine(m.id),
      h('span', { class: 'mood-name' }, m.name),
      h('span', { class: 'mood-blurb' }, m.blurb)));
}

function methodRow(m, i) {
  return h('li', {},
    h('a', { class: 'method-row', href: routeHash('method', { id: m.id }) },
      h('span', { class: 'method-num', 'aria-hidden': 'true' }, String(i + 1)),
      h('span', { class: 'method-text' },
        h('span', { class: 'method-name' }, m.name),
        h('span', { class: 'method-summary' }, m.summary)),
      icon('next', 'icon method-go')));
}

function myChordsCard(known) {
  const n = known.length;
  const text = n === 0
    ? "You haven’t marked any chords yet. Start with the chord family in C major: seven chords that sound right together."
    : `You know ${n} chord${n === 1 ? '' : 's'}. See the chord family they fit in (chords that sound right together) and what you can play today.`;
  return h('section', { class: 'mine', 'aria-labelledby': 'mine-title' },
    h('h2', { id: 'mine-title' }, 'Start from my chords'),
    h('p', {}, text),
    n ? h('ul', { class: 'chips', 'aria-label': 'Chords you know' }, known.map((c) => h('li', { class: 'chip' }, prettyChord(c)))) : null,
    h('a', { class: 'button', href: routeHash('method', { id: 'family' }) }, n ? 'See what I can play' : 'Show me the family'));
}

export const findView = {
  render(_params, ctx) {
    const known = ctx.store.state.known;
    return h('div', { class: 'page find' },
      h('header', { class: 'page-head' },
        h('h1', { tabindex: '-1' }, 'What do you want to feel?'),
        h('p', { class: 'lede' }, 'Pick a mood. You get chord loops that create it, and a plain reason why they work.')),
      h('ul', { class: 'moods', 'aria-label': 'Moods' }, MOODS.map(moodTile)),
      h('section', { class: 'section', 'aria-labelledby': 'methods-title' },
        h('h2', { id: 'methods-title' }, 'Or build it a way'),
        h('p', { class: 'section-intro' }, 'Nine ways to make a progression of your own, each small enough to try in a minute.'),
        h('ol', { class: 'methods' }, METHODS.map(methodRow))),
      myChordsCard(known));
  },
};

function progCard(id, moodId) {
  const p = PROGRESSIONS[id];
  if (!p) return null;
  let chords;
  try {
    chords = progressionChords(p.romans, p.tonic).map((c) => c.symbol);
  } catch {
    return null;
  }
  const href = routeHash('prog', { t: p.tonic, m: p.mode, r: p.romans, id, src: `mood:${moodId}` });
  return h('li', {},
    h('a', { class: 'prog-card', href },
      h('span', { class: 'prog-name' }, p.name),
      h('span', { class: 'prog-chords', 'aria-label': `Chords: ${chords.map(prettyChord).join(', ')}` },
        chords.map((c) => h('span', { class: 'prog-chord', 'aria-hidden': 'true' }, prettyChord(c)))),
      h('span', { class: 'prog-why' }, firstSentence(p.why))));
}

function backLink() {
  return h('a', { class: 'back', href: routeHash('find') }, icon('back'), 'All moods');
}

export const moodView = {
  render(params) {
    const mood = MOODS.find((m) => m.id === params.id);
    if (!mood) {
      return h('div', { class: 'page notice' },
        h('h1', { tabindex: '-1' }, 'That mood doesn’t exist'),
        h('p', { class: 'lede' }, 'The link may be old or mistyped. Every mood is on the Find screen.'),
        h('p', {}, h('a', { class: 'button', href: routeHash('find') }, 'Back to Find')));
    }
    const cards = mood.progressionIds.map((id) => progCard(id, mood.id)).filter(Boolean);
    return h('div', { class: 'page mood', style: moodStyle(mood.id) },
      backLink(),
      h('header', { class: 'page-head' },
        moodLine(mood.id, 'mood-line mood-line-big'),
        h('h1', { tabindex: '-1' }, mood.name),
        h('p', { class: 'lede' }, mood.blurb)),
      h('section', { class: 'section', 'aria-labelledby': 'progs-title' },
        h('h2', { id: 'progs-title' }, cards.length === 1 ? 'A progression that feels this way' : 'Progressions that feel this way'),
        h('p', { class: 'section-intro' }, 'A progression is a short run of chords played in order, usually on repeat. Open one to hear it and see why it works.'),
        h('ul', { class: 'progs' }, cards)));
  },
};
