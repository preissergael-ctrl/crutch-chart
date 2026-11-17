// Web Audio sample engine. Browser only: nothing here touches AudioContext or fetch at import time.
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const LOW = 40;
const HIGH = 79;
const RELEASE = 0.08;

export const midiToName = (midi) => `${NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
export const SAMPLE_NAMES = Array.from({ length: HIGH - LOW + 1 }, (_, i) => midiToName(LOW + i));

export function createEngine({ base = 'sounds/' } = {}) {
  let ctx = null;
  let loadPromise = null;
  let isLoaded = false;
  const buffers = new Map(); // midi -> AudioBuffer

  const ensureCtx = () => {
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      ctx = new AC();
    }
    return ctx;
  };

  const nearest = (midi) => {
    let best = null;
    for (const m of buffers.keys()) {
      if (best === null || Math.abs(m - midi) < Math.abs(best - midi)) best = m;
    }
    return best;
  };

  const noop = { stop() {} };

  return {
    load() {
      if (!loadPromise) {
        const c = ensureCtx();
        loadPromise = Promise.all(
          SAMPLE_NAMES.map(async (name, i) => {
            const res = await fetch(`${base}${name}.mp3`);
            if (!res.ok) throw new Error(`sample ${name}: HTTP ${res.status}`);
            const data = await res.arrayBuffer();
            buffers.set(LOW + i, await c.decodeAudioData(data));
          }),
        ).then(
          () => { isLoaded = true; },
          (err) => { loadPromise = null; throw err; }, // allow a retry
        );
      }
      return loadPromise;
    },
    get loaded() { return isLoaded; },
    async resume() {
      const c = ensureCtx();
      if (c.state === 'suspended') await c.resume();
    },
    now() { return ensureCtx().currentTime; },
    playNote(midi, when, velocity, duration) {
      const src = nearest(midi);
      if (src === null) return noop;
      const c = ensureCtx();
      const node = c.createBufferSource();
      node.buffer = buffers.get(src);
      node.playbackRate.value = 2 ** ((midi - src) / 12);
      const gain = c.createGain();
      const t = Math.max(when, c.currentTime);
      const end = t + duration;
      gain.gain.setValueAtTime(velocity, t);
      gain.gain.setValueAtTime(velocity, end);
      gain.gain.linearRampToValueAtTime(0, end + RELEASE);
      node.connect(gain).connect(c.destination);
      node.start(t);
      node.stop(end + RELEASE);
      let done = false;
      return {
        stop() {
          if (done) return;
          done = true;
          try { node.stop(); } catch {}
          try { node.disconnect(); gain.disconnect(); } catch {}
        },
      };
    },
    playClick(when, accent) {
      const c = ensureCtx();
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'sine';
      osc.frequency.value = accent ? 1500 : 1000;
      const t = Math.max(when, c.currentTime);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.linearRampToValueAtTime(0, t + 0.03);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.03);
      let done = false;
      return {
        stop() {
          if (done) return;
          done = true;
          try { osc.stop(); } catch {}
          try { osc.disconnect(); gain.disconnect(); } catch {}
        },
      };
    },
  };
}
