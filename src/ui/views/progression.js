// Progression screen (#/prog?t=&m=&r=&id=&src=): chords with shapes, why it works, play, save.
import { PROGRESSIONS } from '../../content/progressions.js';
import { MOODS } from '../../content/moods.js';
import { STRUMS, PICKS } from '../../content/patterns.js';
import { LESSONS } from '../../content/lessons.js';
import { progressionChords, explainProgression, parseRoman, KEYS, isMinorMode } from '../../theory/roman.js';
import { MODES, MODE_INFO, modeName } from '../../theory/scales.js';
import { pc } from '../../theory/notes.js';
import { generateVoicings } from '../../guitar/voicings.js';
import { capoHint, isKnown } from '../../guitar/capo.js';
import { routeHash } from '../router.js';
import { h, icon, prettyChord, prettyRoman } from '../dom.js';
import { renderChordRow } from '../components/chordrow.js';
import { renderPatternStrip } from '../components/pattern.js';

const MAX_CHORDS = 32;
const clampBpm = (n) => Math.min(160, Math.max(50, Math.round(Number(n)) || 90));
const noop = () => {};

// Set just before a key change rewrites the route, so the rebuilt screen keeps its settings
// (and keeps playing if it was playing).
let carry = null;
let cleanup = noop;

function broken() {
  return h('div', { class: 'page notice' },
    h('h1', { tabindex: '-1' }, 'This progression link is broken'),
    h('p', { class: 'lede' }, 'The chords in this link couldn’t be read. It may be old or mistyped.'),
    h('p', {}, h('a', { class: 'button', href: routeHash('find') }, 'Back to Find')));
}

export function valid(params) {
  const { t, m, r } = params;
  if (typeof t !== 'string' || typeof m !== 'string' || !Array.isArray(r)) return false;
  if (!r.length || r.length > MAX_CHORDS || !Object.hasOwn(MODES, m)) return false;
  try {
    pc(t);
    r.forEach(parseRoman);
    progressionChords(r, t).forEach((c) => {
      if (!generateVoicings(c.symbol).length) throw new Error('no shape');
    });
  } catch {
    return false;
  }
  return true;
}

function sourceLine(src) {
  if (typeof src !== 'string') return null;
  if (src.startsWith('mood:')) {
    const mood = MOODS.find((x) => x.id === src.slice(5));
    return mood ? `From the ${mood.name.toLowerCase()} mood` : null;
  }
  if (src.startsWith('method:')) return 'Built with one of the methods';
  if (src.startsWith('lesson:')) {
    const lesson = LESSONS.find((x) => x.id === src.slice(7));
    return lesson ? `From the lesson “${lesson.title}”` : null;
  }
  if (src === 'saved') return 'One of your saved progressions';
  return null;
}

function seg(label, options, current, onPick) {
  const buttons = options.map((o) => h('button', {
    type: 'button', class: 'seg-btn', 'aria-pressed': String(o.value === current),
    onclick: () => onPick(o.value),
  }, o.label));
  return { el: h('div', { class: 'seg', role: 'group', 'aria-label': label }, buttons), buttons };
}

function setPressed(buttons, options, current) {
  buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(options[i].value === current)));
}

export const progressionView = {
  render(params, ctx) {
    cleanup();
    cleanup = noop;
    if (!valid(params)) return broken();

    const { t: tonic, m: mode, r: romans, src } = params;
    const entry = Object.hasOwn(PROGRESSIONS, params.id ?? '') ? PROGRESSIONS[params.id] : null;
    // Saved progressions reopen with their own settings through extra query params, each one validated here:
    //   bpm=50..160  b=2|4 (beats per chord)  p=<patternId>  k=strum|pick  ts=3|4 (only when there is no id)
    const timeSig = entry ? entry.timeSig : (params.ts === '3' ? 3 : 4);
    const settings = () => ctx.store.state.settings;
    const known = () => ctx.store.state.known;

    const chords = progressionChords(romans, tonic);
    const symbols = chords.map((c) => c.symbol);
    const voicings = symbols.map((s) => generateVoicings(s)[0]);
    const info = explainProgression(romans, tonic, mode);

    // ---- State for this screen ----
    const strums = STRUMS.filter((p) => p.timeSig === timeSig);
    const picks = PICKS.filter((p) => p.timeSig === timeSig);
    const listFor = (k) => (k === 'pick' ? picks : strums);
    const wantKind = carry?.kind ?? (['strum', 'pick'].includes(params.k) ? params.k : settings().kind);
    let kind = wantKind === 'pick' && picks.length ? 'pick' : 'strum';
    const wantPattern = carry?.patternId ?? (typeof params.p === 'string' ? params.p : settings().patternId);
    let pattern = listFor(kind).find((p) => p.id === wantPattern) ?? listFor(kind)[0];
    const paramBpm = /^\d{2,3}$/.test(params.bpm ?? '') ? Number(params.bpm) : null;
    const paramBeats = ['2', '4'].includes(params.b) ? Number(params.b) : null;
    let bpm = clampBpm(carry?.bpm ?? paramBpm ?? (entry ? entry.bpm : settings().bpm));
    let beats = carry?.beats ?? paramBeats ?? (entry && [2, 4].includes(entry.beatsPerChord) ? entry.beatsPerChord : 4);
    let loop = carry?.loop ?? true;
    let countIn = carry?.countIn ?? false;
    const resume = !!carry?.resume;
    carry = null;

    let playingNow = null; // snapshot of what is sounding: { bpm, pattern, beats }
    let starting = 0;      // token of the newest play() call that has not finished loading
    let seq = 0;
    let raf = 0;
    let stepStart = 0;
    let restartTimer = 0;
    let savedTimer = 0;
    let strip = renderPatternStrip(pattern, kind);

    const row = renderChordRow(chords.map((c, i) => ({
      symbol: c.symbol, roman: romans[i], known: isKnown(c.symbol, known()), voicing: voicings[i],
    })));

    // ---- Playback ----
    const playBtn = h('button', { type: 'button', class: 'button play', onclick: () => start() }, icon('play'), 'Play');
    const stopBtn = h('button', { type: 'button', class: 'button ghost stop', onclick: () => halt(), disabled: true }, icon('stop'), 'Stop');
    const note = h('p', { class: 'play-note', role: 'status' });

    const active = () => ctx.player.playing || starting !== 0;
    function syncButtons() {
      if (active()) stopBtn.removeAttribute('disabled'); else stopBtn.setAttribute('disabled', '');
    }
    function clearHighlight() {
      row.setCurrent(null);
      strip.setStep(null);
      playingNow = null;
    }
    // The player only says when each chord starts. Steps are worked out from the time since then.
    function tick() {
      raf = 0;
      if (!ctx.player.playing || !playingNow) { clearHighlight(); syncButtons(); return; }
      const { bpm: b, pattern: p, beats: bc } = playingNow;
      const stepMs = (60 / b) * (4 / p.grid) * 1000;
      const perChord = (bc * p.grid) / 4;
      const step = Math.min(perChord - 1, Math.floor((performance.now() - stepStart) / stepMs));
      strip.setStep(step % p.steps.length);
      raf = requestAnimationFrame(tick);
    }
    ctx.player.onStep = (i) => {
      row.setCurrent(i);
      stepStart = performance.now();
      if (!raf) raf = requestAnimationFrame(tick);
      syncButtons();
    };

    async function start() {
      const token = ++seq;
      starting = token;
      note.textContent = '';
      playingNow = { bpm, pattern, beats };
      syncButtons();
      try {
        await ctx.player.play({
          voicings: voicings.map((v) => v.frets), pattern, kind, bpm, beatsPerChord: beats, timeSig, loop, countIn,
        });
      } catch (err) {
        console.warn(err);
        if (starting === token) note.textContent = 'The guitar sounds couldn’t load. Check your connection and press Play again.';
      } finally {
        if (starting === token) starting = 0;
        syncButtons();
      }
    }
    function halt() {
      starting = 0;
      ctx.player.stop();
      cancelAnimationFrame(raf);
      raf = 0;
      clearHighlight();
      syncButtons();
    }
    // Changing key, pattern, tempo, beats or kind while playing: stop, then play again.
    function restartIfPlaying() { if (active()) { halt(); start(); } }

    // ---- Controls ----
    const minor = isMinorMode(mode);
    const keys = minor ? KEYS.minor : KEYS.major;
    const keyList = keys.includes(tonic) ? keys : [tonic, ...keys];
    const keySelect = h('select', { id: 'key-pick', class: 'select' },
      keyList.map((k) => h('option', { value: k, selected: k === tonic }, `${prettyChord(k)}${minor ? ' minor' : ' major'}`)));
    keySelect.addEventListener('change', () => {
      carry = { bpm, beats, loop, countIn, kind, patternId: pattern.id, resume: active() };
      ctx.go('prog', { t: keySelect.value, m: mode, r: romans, src, id: params.id, ts: params.ts });
    });

    const bpmOut = h('output', { class: 'tempo-out', for: 'tempo' }, String(bpm));
    const tempo = h('input', { id: 'tempo', type: 'range', min: 50, max: 160, step: 1, value: bpm, class: 'range', 'aria-valuetext': `${bpm} beats per minute` });
    tempo.addEventListener('input', () => {
      bpm = clampBpm(tempo.value);
      bpmOut.textContent = String(bpm);
      tempo.setAttribute('aria-valuetext', `${bpm} beats per minute`);
      clearTimeout(restartTimer);
      restartTimer = setTimeout(restartIfPlaying, 250);
    });

    const toggle = (label, get, set) => {
      const b = h('button', { type: 'button', class: 'toggle', 'aria-pressed': String(get()) }, label);
      b.addEventListener('click', () => { set(!get()); b.setAttribute('aria-pressed', String(get())); });
      return b;
    };

    const BEAT_OPTS = [{ value: 2, label: '2 beats' }, { value: 4, label: '4 beats' }];
    const beatsSeg = seg('Beats per chord', BEAT_OPTS, beats, (v) => {
      beats = v; setPressed(beatsSeg.buttons, BEAT_OPTS, beats); restartIfPlaying();
    });

    const KIND_OPTS = [{ value: 'strum', label: 'Strum' }, { value: 'pick', label: 'Pick' }];
    const patternList = h('ul', { class: 'pattern-list', 'aria-label': 'Patterns' });

    function remember() {
      const s = settings();
      s.kind = kind;
      s.patternId = pattern.id;
      ctx.store.save();
    }
    function drawPatterns() {
      patternList.replaceChildren(...listFor(kind).map((p) => h('li', {},
        h('button', {
          type: 'button', class: 'pat-btn', 'aria-pressed': String(p.id === pattern.id),
          onclick: () => { pattern = p; remember(); drawPatterns(); restartIfPlaying(); },
        }, p.name))));
      const next = renderPatternStrip(pattern, kind);
      strip.el.replaceWith(next.el);
      strip = next;
    }
    const kindSeg = seg('Strum or pick', KIND_OPTS, kind, (v) => {
      if (v === kind || !listFor(v).length) return;
      kind = v;
      pattern = listFor(kind).find((p) => p.id === pattern.id) ?? listFor(kind)[0];
      setPressed(kindSeg.buttons, KIND_OPTS, kind);
      remember(); drawPatterns(); restartIfPlaying();
    });

    // ---- Why it works ----
    const whyLines = info.map((x) => {
      const b = x.borrowed ? `borrowed from ${prettyChord(tonic)} ${modeName(x.borrowed)} (same home note)` : null;
      return h('li', {},
        h('span', { class: 'why-head' },
          h('span', { class: 'why-chord' }, prettyChord(x.name)),
          h('span', { class: 'why-num' }, prettyRoman(x.roman))),
        h('span', { class: 'why-role' }, x.role),
        b ? h('span', { class: 'why-borrow' }, b) : null);
    });

    // ---- Capo ----
    const hint = capoHint(symbols, known());
    const capoCard = hint
      ? h('section', { class: 'capo', 'aria-labelledby': 'capo-title' },
        h('h2', { id: 'capo-title' }, 'Easier with a capo'),
        h('p', {}, `Put a capo (a clamp that raises every string) on fret ${hint.capo} and play ${hint.playAs.map(prettyChord).join(' ')}. You hear the same chords, ${symbols.map(prettyChord).join(' ')}, with easier shapes.`))
      : null;

    // ---- Save ----
    const defaultName = entry ? entry.name : 'My progression';
    const saveBox = h('div', { class: 'save' });
    const saveStatus = h('p', { class: 'save-status', role: 'status' });
    const openSave = h('button', { type: 'button', class: 'button ghost', onclick: () => showForm() }, 'Save');
    function showForm() {
      const input = h('input', { id: 'save-name', class: 'text', type: 'text', maxlength: 60, value: defaultName, autocomplete: 'off' });
      const form = h('form', { class: 'save-form' },
        h('label', { for: 'save-name' }, 'Name'),
        h('div', { class: 'save-line' }, input,
          h('button', { type: 'submit', class: 'button' }, 'Save'),
          h('button', { type: 'button', class: 'button ghost', onclick: () => { saveBox.replaceChildren(openSave); openSave.focus(); } }, 'Cancel')));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = input.value.trim() || defaultName;
        ctx.store.addSaved({
          name, tonic, mode,
          chords: chords.map((c, i) => ({ roman: romans[i], name: c.symbol, quality: c.quality, root: c.root })),
          shapes: voicings.map((v) => v.key),
          beatsPerChord: beats, timeSig, bpm, patternId: pattern.id, kind,
          source: src || 'custom',
        });
        saveBox.replaceChildren(openSave);
        saveStatus.replaceChildren('Saved. ', h('a', { href: routeHash('saved') }, 'See your saved progressions'));
        clearTimeout(savedTimer);
        savedTimer = setTimeout(() => saveStatus.replaceChildren(), 6000);
        openSave.focus();
      });
      saveBox.replaceChildren(form);
      input.focus();
      input.select();
    }
    saveBox.append(openSave);

    // ---- Page ----
    const srcText = sourceLine(src);
    const page = h('div', { class: 'page prog' },
      h('a', { class: 'back', href: routeHash('find') }, icon('back'), 'Find'),
      h('header', { class: 'page-head' },
        h('h1', { tabindex: '-1' }, entry ? entry.name : 'Your progression'),
        srcText ? h('p', { class: 'lede' }, srcText) : null),
      h('div', { class: 'keybar' },
        h('label', { for: 'key-pick' }, 'Key'),
        keySelect,
        h('p', { class: 'mode-note' }, `${MODE_INFO[mode].name}: ${MODE_INFO[mode].plain.replace(/^./, (c) => c.toLowerCase())}.`)),
      row.el,
      h('section', { class: 'section', 'aria-labelledby': 'why-title' },
        h('h2', { id: 'why-title' }, 'Why it works'),
        entry ? h('p', { class: 'why-text' }, entry.why) : null,
        h('ul', { class: 'why-list' }, whyLines)),
      capoCard,
      h('section', { class: 'section player', 'aria-labelledby': 'play-title' },
        h('h2', { id: 'play-title' }, 'Play it'),
        h('div', { class: 'play-row' }, playBtn, stopBtn,
          toggle('Loop', () => loop, (v) => { loop = v; }),
          toggle('Count-in', () => countIn, (v) => { countIn = v; })),
        note,
        h('div', { class: 'field' },
          h('label', { for: 'tempo' }, 'Tempo'),
          h('div', { class: 'tempo-line' }, tempo, h('span', { class: 'tempo-val' }, bpmOut, ' beats per minute'))),
        h('div', { class: 'field' }, h('span', { class: 'label' }, 'Length of each chord'), beatsSeg.el),
        h('div', { class: 'field' }, h('span', { class: 'label' }, 'Style'), kindSeg.el),
        patternList,
        strip.el),
      h('section', { class: 'section', 'aria-labelledby': 'save-title' },
        h('h2', { id: 'save-title' }, 'Keep it'),
        h('p', { class: 'section-intro' }, 'Save this progression, in this key, to find it again under Saved.'),
        saveBox, saveStatus));

    drawPatterns();
    if (resume) queueMicrotask(() => start());

    cleanup = () => {
      if (ctx.player.onStep !== noop) ctx.player.onStep = noop;
      cancelAnimationFrame(raf);
      clearTimeout(restartTimer);
      clearTimeout(savedTimer);
      starting = 0;
      playingNow = null;
    };
    return page;
  },

  destroy() {
    cleanup();
    cleanup = noop;
  },
};
