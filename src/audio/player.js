// Play/stop/loop on top of an engine. Pure: only needs the engine interface and timers.
import { scheduleProgression } from './schedule.js';

const LEAD = 0.1;
const LOOP_AHEAD = 0.2;

export function createPlayer(engine) {
  let handles = [];
  let timers = [];
  let gen = 0;

  const player = {
    playing: false,
    onStep: () => {},

    stop() {
      gen++;
      for (const h of handles) h.stop();
      for (const t of timers) clearTimeout(t);
      handles = [];
      timers = [];
      player.playing = false;
    },

    async play(opts) {
      player.stop();
      const mine = gen;
      await engine.resume();
      await engine.load();
      if (mine !== gen) return;

      const { loop = false, countIn = false, bpm } = opts;
      const beats = Number(String(opts.timeSig ?? 4).split('/')[0]) || 4;
      const beat = 60 / bpm;
      const after = (when, fn) => {
        timers.push(setTimeout(() => { if (mine === gen) fn(); }, Math.max(0, (when - engine.now()) * 1000)));
      };

      const runPass = (startAt, withCountIn) => {
        let offset = 0;
        if (withCountIn) {
          for (let b = 0; b < beats; b++) handles.push(engine.playClick(startAt + b * beat, b === 0));
          offset = beats * beat;
        }
        const t0 = startAt + offset;
        const sched = scheduleProgression(opts);
        for (const ev of sched.events) {
          handles.push(engine.playNote(ev.midi, t0 + ev.time, ev.velocity, ev.duration));
        }
        sched.chordStarts.forEach((cs, i) => after(t0 + cs, () => player.onStep(i)));
        const end = t0 + sched.length;
        if (loop) after(end - LOOP_AHEAD, () => runPass(end, false));
        else after(end, () => { player.playing = false; });
      };

      player.playing = true;
      runPass(engine.now() + LEAD, countIn);
    },
  };
  return player;
}
