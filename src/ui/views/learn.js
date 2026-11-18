// Learn: the list of lessons (#/learn) and one lesson (#/learn/<id>).
import { LESSONS } from '../../content/lessons.js';
import { METHODS } from '../../content/methods.js';
import { progressionChords } from '../../theory/roman.js';
import { generateVoicings } from '../../guitar/voicings.js';
import { routeHash } from '../router.js';
import { h, icon, prettyChord } from '../dom.js';
import { renderNeck } from '../components/neck.js';

function lessonRow(l, i) {
  return h('li', {},
    h('a', { class: 'method-row lesson-row', href: routeHash('learn', { id: l.id }) },
      h('span', { class: 'lesson-num', 'aria-hidden': 'true' }, String(i + 1)),
      h('span', { class: 'method-text' },
        h('span', { class: 'method-name' }, l.title),
        h('span', { class: 'method-summary' }, l.teaser)),
      icon('next', 'icon method-go')));
}

function listPage() {
  return h('div', { class: 'page learn' },
    h('header', { class: 'page-head' },
      h('h1', { tabindex: '-1' }, 'Learn'),
      h('p', { class: 'lede' }, 'Short lessons behind the moods and methods. Each one builds on the last and ends with something to play.')),
    h('ol', { class: 'methods lessons', 'aria-label': 'Lessons' }, LESSONS.map(lessonRow)));
}

function unknown() {
  return h('div', { class: 'page notice' },
    h('h1', { tabindex: '-1' }, 'We couldn’t find that lesson'),
    h('p', { class: 'lede' }, 'The link may be old or mistyped. Every lesson is on the Learn list.'),
    h('p', {}, h('a', { class: 'button', href: routeHash('learn') }, 'All lessons')));
}

function tryBlock(t, lessonId) {
  let chords;
  try {
    chords = progressionChords(t.r, t.t).map((c) => prettyChord(c.symbol));
  } catch {
    return null;
  }
  const href = routeHash('prog', { t: t.t, m: t.m, r: t.r, src: `lesson:${lessonId}` });
  return h('a', { class: 'lesson-try', href, 'aria-label': `Try it: ${t.label}. Chords: ${chords.join(', ')}. Opens the progression.` },
    h('span', { class: 'lesson-try-text' },
      h('span', { class: 'lesson-try-eyebrow' }, 'Try it'),
      h('span', { class: 'lesson-try-label' }, t.label),
      h('span', { class: 'prog-chords', 'aria-hidden': 'true' }, chords.map((c) => h('span', { class: 'prog-chord' }, c)))),
    icon('play', 'icon lesson-try-play'));
}

// The easiest shape, zoomed to the frets it uses.
function neckBlock(symbol) {
  let v;
  try { v = generateVoicings(symbol)[0]; } catch { return null; }
  if (!v) return null;
  const nz = v.frets.filter((f) => f > 0);
  const lo = nz.length ? Math.min(...nz) : 1;
  const hi = nz.length ? Math.max(...nz) : 1;
  const from = hi <= 5 ? 1 : Math.max(1, lo - 1);
  const shown = prettyChord(symbol);
  return h('figure', { class: 'lesson-neck' },
    h('div', { class: 'neck-box' }, renderNeck(v, { fromFret: from, toFret: from + 4, name: shown })),
    h('figcaption', {},
      h('span', {}, `${shown}, easiest shape. `),
      h('a', { href: routeHash('chord', { symbol }) }, `All ways to play ${shown}`)));
}

function methodBlock(id) {
  const m = METHODS.find((x) => x.id === id);
  if (!m) return null;
  return h('p', { class: 'lesson-method' },
    h('a', { href: routeHash('method', { id }) }, `Open the “${m.name}” tool`, icon('next', 'icon')));
}

function renderBlock(b, lessonId) {
  if (b.p) return h('p', { class: 'lesson-p' }, b.p);
  if (b.try) return tryBlock(b.try, lessonId);
  if (b.neck) return neckBlock(b.neck);
  if (b.method) return methodBlock(b.method);
  return null;
}

function lessonPage(lesson) {
  const i = LESSONS.indexOf(lesson);
  const next = LESSONS[i + 1];
  const foot = next
    ? h('a', { class: 'lesson-next', href: routeHash('learn', { id: next.id }) },
      h('span', {}, h('span', { class: 'lesson-next-eyebrow' }, 'Next lesson'), h('span', { class: 'lesson-next-title' }, next.title)),
      icon('next', 'icon'))
    : h('a', { class: 'lesson-next', href: routeHash('learn') },
      h('span', {}, h('span', { class: 'lesson-next-eyebrow' }, 'That’s every lesson'), h('span', { class: 'lesson-next-title' }, 'Back to all lessons')),
      icon('next', 'icon'));
  return h('div', { class: 'page lesson' },
    h('a', { class: 'back', href: routeHash('learn') }, icon('back'), 'All lessons'),
    h('header', { class: 'page-head' },
      h('p', { class: 'lesson-pos' }, `Lesson ${i + 1}`),
      h('h1', { tabindex: '-1' }, lesson.title)),
    h('div', { class: 'lesson-body' }, lesson.blocks.map((b) => renderBlock(b, lesson.id))),
    foot);
}

export const learnView = {
  render(params) {
    if (!params.id) return listPage();
    const lesson = LESSONS.find((l) => l.id === params.id);
    return lesson ? lessonPage(lesson) : unknown();
  },
};
