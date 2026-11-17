// Known chords, saved progressions, settings, and backup. Never throws on bad data.
const KEY = 'crutchchart:v1';
const BAD_BACKUP = "This file isn't a Crutch Chart backup.";

export const DEFAULT_STATE = {
  version: 1,
  known: ['Am', 'F', 'C', 'Dm', 'G'],
  saved: [],
  settings: { bpm: 90, patternId: 'folk', kind: 'strum', lastKey: null },
};

const clone = (x) => JSON.parse(JSON.stringify(x));
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

function valid(s) {
  return isObj(s) && s.version === 1 && Array.isArray(s.known) &&
    s.known.every((k) => typeof k === 'string') &&
    Array.isArray(s.saved) && isObj(s.settings);
}

function validSaved(p) {
  return isObj(p) && typeof p.id === 'string' && typeof p.tonic === 'string' &&
    typeof p.mode === 'string' && Array.isArray(p.chords);
}

function normalize(s) {
  const out = clone(s);
  out.settings = { ...clone(DEFAULT_STATE.settings), ...out.settings };
  out.saved = out.saved.filter(validSaved);
  return out;
}

function newId() {
  return Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export function createStore(storage = globalThis.localStorage) {
  function load() {
    try {
      const raw = storage && storage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (valid(parsed)) return normalize(parsed);
      }
    } catch { /* fall through to defaults */ }
    return clone(DEFAULT_STATE);
  }

  const store = {
    state: load(),
    save() {
      try {
        if (!storage) return false;
        storage.setItem(KEY, JSON.stringify(store.state));
        return true;
      } catch {
        return false;
      }
    },
    addSaved(p) {
      const item = { ...p };
      if (!item.id) item.id = newId();
      if (item.createdAt == null) item.createdAt = Date.now();
      store.state.saved.push(item);
      store.save();
      return item.id;
    },
    removeSaved(id) {
      store.state.saved = store.state.saved.filter((p) => p.id !== id);
      store.save();
    },
    setKnown(list) {
      const seen = new Set();
      store.state.known = (Array.isArray(list) ? list : []).filter((c) => {
        if (typeof c !== 'string' || c === '' || seen.has(c)) return false;
        seen.add(c);
        return true;
      });
      store.save();
    },
    exportBackup() {
      return JSON.stringify({ app: 'crutch-chart', version: 1, exportedAt: Date.now(), state: store.state }, null, 2);
    },
    importBackup(json) {
      let data;
      try { data = JSON.parse(json); } catch { throw new Error(BAD_BACKUP); }
      if (!isObj(data) || data.app !== 'crutch-chart' || !valid(data.state)) throw new Error(BAD_BACKUP);
      store.state = normalize(data.state);
      store.save();
    },
  };
  return store;
}
