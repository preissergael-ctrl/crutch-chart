// Saved: your saved progressions, "My chords", and backup. Also links to About.
import { PROGRESSIONS } from '../../content/progressions.js';
import { parseChord, normalizeChordInput } from '../../theory/chords.js';
import { isKnown } from '../../guitar/capo.js';
import { modeName } from '../../theory/scales.js';
import { routeHash } from '../router.js';
import { h, icon, prettyChord } from '../dom.js';

const pad = (n) => String(n).padStart(2, '0');
export function backupName(d = new Date()) {
  return `crutch-chart-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

const sameList = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

// The named progression a saved one came from: its stored progId when the chords and mode still
// match, else the only named progression with the same chords and mode (none if two share them).
function progIdOf(p, romans) {
  const fits = (id) => Object.hasOwn(PROGRESSIONS, id) && PROGRESSIONS[id].mode === p.mode && sameList(PROGRESSIONS[id].romans, romans);
  if (typeof p.progId === 'string' && fits(p.progId)) return p.progId;
  const ids = Object.keys(PROGRESSIONS).filter(fits);
  return ids.length === 1 ? ids[0] : undefined;
}

// Opens the progression with its name, tempo and pattern (progression.js validates these params).
export function openParams(p) {
  const romans = p.chords.map((c) => c.roman);
  const params = {
    t: p.tonic, m: p.mode, r: romans, id: progIdOf(p, romans), src: 'saved', n: p.name,
    bpm: p.bpm, b: p.beatsPerChord, p: p.patternId, k: p.kind,
  };
  if (p.timeSig === 3 && !params.id) params.ts = 3;
  return params;
}
const openHash = (p) => routeHash('prog', openParams(p));

function keyText(p) {
  return `Key of ${prettyChord(p.tonic)} ${modeName(p.mode)} · ${p.bpm} beats per minute`;
}

export const savedView = {
  render(params, ctx) {
    const state = () => ctx.store.state; // read fresh: a restore replaces it
    let urls = [];

    const listBox = h('div', {});
    const listTitle = h('h2', { id: 'saved-title', tabindex: '-1' }, 'Saved progressions');
    const chordsBox = h('div', {});
    const backupMsg = h('p', { class: 'save-status', role: 'status' });

    // ---- Saved progressions ----
    // One odd item (say, from an old or hand-edited backup) must never break the whole screen.
    function safeRow(p, i, list) {
      try { return savedRow(p, i, list); } catch (err) { console.warn('Skipped a saved progression', err); return null; }
    }
    // After a delete, focus the next row's Open link, else the previous one, else the heading.
    function focusAfterDelete(index) {
      const links = listBox.querySelectorAll('.saved-row a.button');
      const target = links[index] ?? links[index - 1] ?? listTitle;
      target.focus();
    }
    function savedRow(p, index) {
      const actions = h('div', { class: 'saved-actions' });
      const showDefault = () => {
        const del = h('button', { type: 'button', class: 'button ghost small', 'aria-label': `Delete ${p.name}`, onclick: () => showConfirm() }, 'Delete');
        actions.replaceChildren(
          h('a', { class: 'button small', href: openHash(p), 'aria-label': `Open ${p.name}` }, 'Open'), del);
        return del;
      };
      const showConfirm = () => {
        const no = h('button', { type: 'button', class: 'button ghost small', onclick: () => showDefault().focus() }, 'No');
        const yes = h('button', {
          type: 'button', class: 'button small', 'aria-label': `Yes, delete ${p.name}`,
          onclick: () => { ctx.store.removeSaved(p.id); drawList(); focusAfterDelete(index); },
        }, 'Yes');
        actions.replaceChildren(h('span', { class: 'confirm-q', role: 'alert' }, 'Delete?'), yes, no);
        no.focus();
      };
      showDefault();
      return h('li', { class: 'saved-row' },
        h('div', { class: 'saved-text' },
          h('span', { class: 'saved-name' }, p.name),
          h('span', { class: 'prog-chords' }, p.chords.map((c) => h('span', { class: 'prog-chord' }, prettyChord(c?.name ?? '?')))),
          h('span', { class: 'saved-meta' }, keyText(p))),
        actions);
    }
    function drawList() {
      const list = state().saved;
      listBox.replaceChildren(list.length
        ? h('ul', { class: 'saved-list', 'aria-label': 'Saved progressions' }, list.map(safeRow))
        : h('div', { class: 'empty' },
          h('p', {}, 'Nothing saved yet. Open any progression and press Save to keep it here.'),
          h('p', {}, h('a', { class: 'button', href: routeHash('find') }, 'Find a progression'))));
    }

    // ---- My chords ----
    function drawChords(message = '', focusIndex = null) {
      const msg = h('p', { class: 'field-msg', role: 'status' }, message);
      const input = h('input', {
        id: 'add-chord', class: 'text', type: 'text', maxlength: 12, autocomplete: 'off',
        autocapitalize: 'off', spellcheck: 'false', placeholder: 'For example Em or Bb7',
      });
      const form = h('form', { class: 'save-form' },
        h('label', { for: 'add-chord' }, 'Add a chord'),
        h('div', { class: 'save-line' }, input, h('button', { type: 'submit', class: 'button' }, 'Add')),
        msg);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const raw = input.value.trim();
        if (!raw) return;
        let chord;
        try { chord = parseChord(normalizeChordInput(raw)); } catch {
          msg.textContent = `I don’t know the chord “${raw}”. Try names like Am, F♯m or B♭7.`;
          return;
        }
        if (isKnown(chord.symbol, state().known)) { msg.textContent = 'Already on your list.'; return; }
        ctx.store.setKnown([...state().known, chord.symbol]);
        drawChords(`Added ${prettyChord(chord.symbol)}.`);
        chordsBox.querySelector('#add-chord')?.focus();
      });
      const items = state().known.map((k) => h('li', {},
        h('span', { class: 'chip' },
          h('span', {}, prettyChord(k)),
          h('button', {
            type: 'button', class: 'chip-x', 'aria-label': `Remove ${prettyChord(k)}`,
            onclick: () => {
              const at = state().known.indexOf(k);
              ctx.store.setKnown(state().known.filter((x) => x !== k));
              drawChords(`Removed ${prettyChord(k)}.`, at);
            },
          }, '×'))));
      chordsBox.replaceChildren(
        items.length
          ? h('ul', { class: 'chips', 'aria-label': 'My chords' }, items)
          : h('p', { class: 'section-intro' }, 'Your list is empty, so every chord will look new.'),
        form);
      // After removing a chip, focus the next chip's remove button, else the previous one, else the input.
      if (focusIndex !== null) {
        const xs = chordsBox.querySelectorAll('.chip-x');
        (xs[focusIndex] ?? xs[focusIndex - 1] ?? chordsBox.querySelector('#add-chord')).focus();
      }
    }

    // ---- Backup ----
    function download() {
      const blob = new Blob([ctx.store.exportBackup()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      urls.push(url);
      const a = h('a', { href: url, download: backupName() });
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => { URL.revokeObjectURL(url); urls = urls.filter((u) => u !== url); }, 1000);
      backupMsg.textContent = 'Backup downloaded.';
    }
    const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'file-input', id: 'restore-file', 'aria-label': 'Choose a backup file' });
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      fileInput.value = '';
      if (!file) return;
      try {
        ctx.store.importBackup(await file.text());
        drawList();
        drawChords();
        backupMsg.textContent = 'Backup restored.';
      } catch (err) {
        backupMsg.textContent = err.message;
      }
    });

    drawList();
    drawChords();

    savedView.destroy = () => { urls.forEach((u) => URL.revokeObjectURL(u)); urls = []; };
    return h('div', { class: 'page saved' },
      h('header', { class: 'page-head' },
        h('h1', { tabindex: '-1' }, 'Saved'),
        h('p', { class: 'lede' }, 'Your progressions and the chords you already know. Everything stays on this phone.')),
      h('section', { class: 'section first', 'aria-labelledby': 'saved-title' },
        listTitle, listBox),
      h('section', { class: 'section', 'aria-labelledby': 'mine-title' },
        h('h2', { id: 'mine-title' }, 'My chords'),
        h('p', { class: 'section-intro' }, 'The chords you can already play. They decide what is marked as new, and when a capo is suggested.'),
        chordsBox),
      h('section', { class: 'section', 'aria-labelledby': 'backup-title' },
        h('h2', { id: 'backup-title' }, 'Backup'),
        h('p', { class: 'section-intro' }, 'Save a copy of your progressions and chords as a file, or restore one. Restoring replaces what is here now.'),
        h('div', { class: 'save-line' },
          h('button', { type: 'button', class: 'button ghost', onclick: download }, 'Download backup'),
          h('button', { type: 'button', class: 'button ghost', onclick: () => fileInput.click() }, 'Restore backup'),
          fileInput),
        backupMsg),
      h('p', { class: 'about-link' }, h('a', { href: routeHash('about') }, 'About Crutch Chart', icon('next', 'icon inline-icon'))));
  },
};
