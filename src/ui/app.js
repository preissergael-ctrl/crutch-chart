// Boot, tab bar, and view switching.
// A view is { render(params, ctx) -> HTMLElement, destroy?() }.
// ctx = { store, player, go(view, params) }. Always read ctx.store.state fresh: a backup import replaces it.
import { createStore } from '../store.js';
import { createEngine } from '../audio/engine.js';
import { createPlayer } from '../audio/player.js';
import { parseRoute, routeHash } from './router.js';
import { h } from './dom.js';
import { findView, moodView } from './views/find.js';
import { progressionView } from './views/progression.js';
import { chordView } from './views/chord.js';
import { methodView } from './views/method.js';
import { learnView } from './views/learn.js';
import { savedView } from './views/saved.js';
import { aboutView } from './views/about.js';

// Screens that later tasks build. Until then they show a calm placeholder.
const comingSoon = {
  render() {
    return h('div', { class: 'page notice' },
      h('h1', { tabindex: '-1' }, 'Coming soon'),
      h('p', { class: 'lede' }, 'This part of Crutch Chart isn’t built yet.'),
      h('p', {}, h('a', { class: 'button', href: routeHash('find') }, 'Back to Find')));
  },
};

const VIEWS = {
  find: findView,
  mood: moodView,
  method: methodView,
  prog: progressionView,
  chord: chordView,
  learn: learnView,
  saved: savedView,
  about: aboutView,
};

// Which tab lights up for each screen.
const TAB_OF = { learn: 'learn', saved: 'saved', about: 'saved' };

// Reading localStorage can throw (blocked site data); fall back to a store that just doesn't persist.
function makeStore() {
  try { return createStore(); } catch { return createStore(null); }
}
const store = makeStore();
const engine = createEngine();
const player = createPlayer(engine);
const ctx = {
  store,
  player,
  go(view, params = {}) { location.hash = routeHash(view, params); },
};

let current = null;
let firstRender = true;

function crashed() {
  return h('div', { class: 'page notice' },
    h('h1', { tabindex: '-1' }, 'Something went wrong on this screen'),
    h('p', { class: 'lede' }, 'Your saved progressions and chords are safe.'),
    h('p', {}, h('a', { class: 'button', href: routeHash('find') }, 'Back to Find')));
}

export function mount(view, params = {}) {
  const root = document.getElementById('view');
  player.stop();
  if (current && current.destroy) {
    try { current.destroy(); } catch (err) { console.error(err); }
  }
  current = view;
  let el;
  try {
    el = view.render(params, ctx);
  } catch (err) {
    console.error(err);
    current = null;
    el = crashed();
  }
  root.replaceChildren(el);

  const heading = root.querySelector('h1');
  document.title = heading && heading.textContent !== 'Crutch Chart'
    ? `${heading.textContent} – Crutch Chart` : 'Crutch Chart';
  if (!firstRender) {
    window.scrollTo(0, 0);
    // Move focus to the new screen so keyboard and screen reader users start at the top.
    (heading || root).focus({ preventScroll: true });
  }
  firstRender = false;
}

function setTabs(viewName) {
  const tab = TAB_OF[viewName] || 'find';
  for (const a of document.querySelectorAll('.tab')) {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

function route() {
  const { view, params } = parseRoute(location.hash);
  setTabs(view);
  mount(VIEWS[view] || comingSoon, params);
}

window.addEventListener('hashchange', route);
// The skip button can't be a #link: the hash is the router's.
document.querySelector('.skip')?.addEventListener('click', () => {
  const root = document.getElementById('view');
  (root.querySelector('h1') || root).focus();
});
route();

if (location.hostname === 'localhost') window.__crutch = { store, engine, player, ctx };

// Offline support. Registration problems must never break the app.
function registerWorker() {
  try {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('Service worker not registered', err));
  } catch (err) { console.warn(err); }
}
if ('serviceWorker' in navigator) {
  if (document.readyState === 'complete') registerWorker();
  else window.addEventListener('load', registerWorker);
}
