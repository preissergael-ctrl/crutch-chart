// Pure scheduling: chord shape + pattern -> timed note events. No browser APIs.
import { STANDARD } from '../guitar/voicings.js';

const SPREAD = 0.012;
const MIN_DUR = 0.05;

export const midiOf = (stringIdx, fret, tuning = STANDARD) => tuning[stringIdx] + fret;

const sounding = (frets) => frets.map((f, i) => (f == null ? -1 : i)).filter((i) => i >= 0);

export function resolveRole(role, frets) {
  const s = sounding(frets);
  let idx;
  if (role === 'B') idx = s[0];
  else if (role === 'A') idx = s[1];
  else if (role === '1') idx = s[s.length - 1];
  else if (role === '2') idx = s[s.length - 2];
  else if (role === '3') idx = s[s.length - 3];
  return idx === undefined ? null : idx;
}

function stepEvents(frets, steps, grid, kind, start, bpm, spanEnd) {
  const stepLen = (60 / bpm) * (4 / grid);
  const s = sounding(frets);
  const hits = [];
  steps.forEach((step, i) => {
    const t = start + i * stepLen;
    if (kind === 'strum') {
      if (step === 'D') hits.push({ t, strings: s, velocity: 0.9, spread: true });
      else if (step === 'U') hits.push({ t, strings: [...s].reverse(), velocity: 0.7, spread: true });
      else if (step === 'X') hits.push({ t, strings: s, velocity: 0.25, muted: true });
    } else {
      const seen = [];
      for (const role of step) {
        const idx = resolveRole(role, frets);
        if (idx !== null && !seen.some((x) => x.idx === idx)) {
          seen.push({ idx, velocity: role === 'B' || role === 'A' ? 0.85 : 0.8 });
        }
      }
      if (seen.length) hits.push({ t, perString: seen });
    }
  });
  const events = [];
  hits.forEach((h, n) => {
    const end = n + 1 < hits.length ? hits[n + 1].t : spanEnd;
    const dur = h.muted ? MIN_DUR : Math.max(MIN_DUR, end - h.t);
    if (h.perString) {
      for (const p of h.perString) events.push({ time: h.t, midi: midiOf(p.idx, frets[p.idx]), velocity: p.velocity, duration: dur });
    } else {
      h.strings.forEach((idx, k) => {
        events.push({ time: h.t + (h.spread ? k * SPREAD : 0), midi: midiOf(idx, frets[idx]), velocity: h.velocity, duration: dur });
      });
    }
  });
  return events;
}

const bySortedTime = (a, b) => a.time - b.time;

export function scheduleBar(frets, pattern, kind, startTime, bpm) {
  const stepLen = (60 / bpm) * (4 / pattern.grid);
  const spanEnd = startTime + pattern.steps.length * stepLen;
  return stepEvents(frets, pattern.steps, pattern.grid, kind, startTime, bpm, spanEnd).sort(bySortedTime);
}

export function scheduleProgression({ voicings, pattern, kind, bpm, beatsPerChord }) {
  const perChord = (beatsPerChord * pattern.grid) / 4;
  const steps = [];
  for (let i = 0; i < perChord; i++) steps.push(pattern.steps[i % pattern.steps.length]);
  const chordLen = (beatsPerChord * 60) / bpm;
  const events = [];
  const chordStarts = [];
  voicings.forEach((frets, i) => {
    const start = i * chordLen;
    chordStarts.push(start);
    events.push(...stepEvents(frets, steps, pattern.grid, kind, start, bpm, start + chordLen));
  });
  events.sort(bySortedTime);
  return { events, length: voicings.length * chordLen, chordStarts };
}
