import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fromTab } from '../src/guitar/voicings.js';
import { STRUMS, PICKS } from '../src/content/patterns.js';
import { midiOf, resolveRole, scheduleBar, scheduleProgression } from '../src/audio/schedule.js';

const C = fromTab('x32010');
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} !~ ${b}`);
const strum = (id) => STRUMS.find((p) => p.id === id);
const pick = (id) => PICKS.find((p) => p.id === id);

test('midiOf', () => {
  assert.equal(midiOf(0, 0), 40);
  assert.equal(midiOf(5, 3), 67);
});

test('resolveRole', () => {
  assert.equal(resolveRole('B', C), 1);
  assert.equal(resolveRole('A', C), 2);
  assert.equal(resolveRole('1', fromTab('xx0231')), 5);
  assert.equal(resolveRole('2', C), 4);
  assert.equal(resolveRole('3', C), 3);
  assert.equal(resolveRole('-', C), null);
  assert.equal(resolveRole('3', fromTab('xx0231') ), 3);
  assert.equal(resolveRole('A', [null, null, null, null, null, 0]), null);
});

test('pattern shapes and counts', () => {
  for (const p of [...STRUMS, ...PICKS]) assert.equal(p.steps.length, p.timeSig * p.grid / 4, p.id);
  assert.equal(STRUMS.filter((p) => p.timeSig === 4).length, 8);
  assert.equal(STRUMS.filter((p) => p.timeSig === 3).length, 2);
  assert.equal(PICKS.length, 6);
  assert.ok(PICKS.some((p) => p.timeSig === 3));
  assert.equal(strum('all-downs').steps.join(' '), 'D - D - D - D -');
  assert.equal(strum('folk').steps.join(' '), 'D - D U - U D U');
  assert.equal(strum('waltz').steps.join(' '), 'D - D U D U');
  assert.equal(new Set([...STRUMS, ...PICKS].map((p) => p.id)).size, 16);
});

test('downstroke ascending, upstroke descending, 0.012 spread', () => {
  const down = scheduleBar(C, { grid: 8, steps: ['D'] }, 'strum', 0, 120);
  assert.deepEqual(down.map((e) => e.midi), [48, 52, 55, 60, 64]);
  down.forEach((e, i) => near(e.time, i * 0.012));
  assert.equal(down[0].velocity, 0.9);
  const up = scheduleBar(C, { grid: 8, steps: ['U'] }, 'strum', 0, 120);
  assert.deepEqual(up.map((e) => e.midi), [64, 60, 55, 52, 48]);
  assert.equal(up[0].velocity, 0.7);
});

test('step length, rests, muted hit', () => {
  const ev = scheduleBar(C, { grid: 8, steps: ['D', '-', 'X'] }, 'strum', 1, 120);
  // 8th note at 120 bpm = 0.25 s
  near(ev[0].time, 1);
  const x = ev.filter((e) => e.velocity === 0.25);
  assert.equal(x.length, 5);
  near(x[0].time, 1.5);
  assert.equal(x[0].duration, 0.05);
  const six = scheduleBar(C, { grid: 16, steps: ['-', 'D'] }, 'strum', 0, 120);
  near(six[0].time, 0.125);
});

test('durations run to next sounding step or end of span', () => {
  const ev = scheduleBar(C, { grid: 8, steps: ['D', '-', 'D', '-'] }, 'strum', 0, 120);
  near(ev[0].duration, 0.5);
  near(ev[ev.length - 1].duration, 0.5); // to end of bar (1 s) from 0.5
  const tiny = scheduleBar(C, { grid: 16, steps: ['D', 'D'] }, 'strum', 0, 400);
  assert.ok(tiny.every((e) => e.duration >= 0.05));
});

test('picks: velocities, rests, dedupe', () => {
  const ev = scheduleBar(C, { grid: 8, steps: [['B', '1'], ['-'], ['3', '3'], ['A']] }, 'pick', 0, 120);
  assert.equal(ev.length, 4);
  assert.equal(ev[0].velocity, 0.85);
  assert.equal(ev[1].velocity, 0.8);
  near(ev[2].time, 0.5);
  assert.equal(ev[2].velocity, 0.8);
  assert.equal(ev[3].velocity, 0.85);
  near(ev[0].duration, 0.5);
});

test('progression length and starts', () => {
  const r = scheduleProgression({ voicings: [C, C], pattern: strum('all-downs'), kind: 'strum', bpm: 120, beatsPerChord: 4, timeSig: 4 });
  near(r.length, 4);
  assert.deepEqual(r.chordStarts, [0, 2]);
  assert.deepEqual(r.events.map((e) => e.time), [...r.events.map((e) => e.time)].sort((a, b) => a - b));
});

test('beatsPerChord 2 in 4/4 uses half the bar; larger repeats', () => {
  const half = scheduleProgression({ voicings: [C], pattern: strum('all-downs'), kind: 'strum', bpm: 120, beatsPerChord: 2, timeSig: 4 });
  const starts = [...new Set(half.events.map((e) => Math.round(e.time * 1000) / 1000))].filter((t, i, a) => i === 0 || t - a[i - 1] > 0.1);
  assert.equal(starts.length, 2);
  near(half.length, 1);
  const rep = scheduleProgression({ voicings: [C], pattern: strum('all-downs'), kind: 'strum', bpm: 120, beatsPerChord: 8, timeSig: 4 });
  assert.equal(rep.events.length, 8 * 5);
  near(rep.events.at(-1).time + 0, rep.events.at(-1).time);
  assert.ok(rep.events.every((e) => e.time < 4));
});

test('durations do not cross chord boundary; sorted', () => {
  const r = scheduleProgression({ voicings: [C, fromTab('320003')], pattern: pick('travis'), kind: 'pick', bpm: 100, beatsPerChord: 4, timeSig: 4 });
  const secs = 4 * 0.6;
  for (const e of r.events) if (e.time < secs) assert.ok(e.time + e.duration <= secs + 1e-9);
  for (let i = 1; i < r.events.length; i++) assert.ok(r.events[i].time >= r.events[i - 1].time);
});
