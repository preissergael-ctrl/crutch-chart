import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fromTab } from '../src/guitar/voicings.js';
import { STRUMS } from '../src/content/patterns.js';
import { createPlayer } from '../src/audio/player.js';
import { SAMPLE_NAMES, midiToName } from '../src/audio/engine.js';

function fakeEngine() {
  const e = {
    calls: [], clicks: [], order: [], stopped: 0, loadCalls: 0,
    now: () => 0,
    load() { e.loadCalls++; return new Promise((r) => setTimeout(() => { e.order.push('loaded'); r(); }, 10)); },
    resume() { e.order.push('resume'); return Promise.resolve(); },
    playNote(midi, when, velocity, duration) {
      e.order.push('note');
      e.calls.push({ midi, when, velocity, duration });
      return { stop() { e.stopped++; } };
    },
    playClick(when, accent) {
      e.clicks.push({ when, accent });
      return { stop() { e.stopped++; } };
    },
  };
  return e;
}

const C = fromTab('x32010');
const G = fromTab('320003');
const opts = (extra = {}) => ({
  voicings: [C, G], pattern: STRUMS[0], kind: 'strum', bpm: 120, beatsPerChord: 4, timeSig: 4, loop: false, ...extra,
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

test('second play stops the first', async () => {
  const e = fakeEngine();
  const p = createPlayer(e);
  await p.play(opts());
  const first = e.calls.length;
  assert.ok(first > 0);
  assert.equal(e.stopped, 0);
  await p.play(opts());
  assert.equal(e.stopped, first, 'all handles of the first play stopped');
  assert.equal(e.calls.length, first * 2);
  p.stop();
  assert.equal(e.stopped, first * 2);
});

test('overlapping play calls while loading schedule only once', async () => {
  const e = fakeEngine();
  const p = createPlayer(e);
  const a = p.play(opts());
  const b = p.play(opts());
  await Promise.all([a, b]);
  const single = (await (async () => { const e2 = fakeEngine(); const p2 = createPlayer(e2); await p2.play(opts()); p2.stop(); return e2.calls.length; })());
  assert.equal(e.calls.length, single);
  p.stop();
});

test('play before load waits', async () => {
  const e = fakeEngine();
  const p = createPlayer(e);
  const pending = p.play(opts());
  assert.equal(e.calls.length, 0);
  await wait(3);
  assert.equal(e.calls.length, 0, 'no notes before load resolves');
  assert.equal(p.playing, false);
  await pending;
  assert.equal(e.order[0], 'resume');
  assert.ok(e.order.indexOf('loaded') < e.order.indexOf('note'));
  assert.equal(p.playing, true);
  p.stop();
  assert.equal(p.playing, false);
});

test('stop during load cancels the play', async () => {
  const e = fakeEngine();
  const p = createPlayer(e);
  const pending = p.play(opts());
  p.stop();
  await pending;
  assert.equal(e.calls.length, 0);
  assert.equal(p.playing, false);
});

test('stop clears onStep timers', async () => {
  const e = fakeEngine();
  const p = createPlayer(e);
  const steps = [];
  p.onStep = (i) => steps.push(i);
  // 160 bpm, 1 beat per chord: chords start at 0.1, 0.475 s
  await p.play(opts({ bpm: 160, beatsPerChord: 1 }));
  await wait(150);
  assert.deepEqual(steps, [0]);
  p.stop();
  await wait(500);
  assert.deepEqual(steps, [0]);
});

test('onStep fires per chord and a non-looping pass ends', async () => {
  const e = fakeEngine();
  const p = createPlayer(e);
  const steps = [];
  p.onStep = (i) => steps.push(i);
  await p.play(opts({ bpm: 160, beatsPerChord: 1 }));
  assert.equal(p.playing, true);
  await wait(900);
  assert.deepEqual(steps, [0, 1]);
  assert.equal(p.playing, false);
});

test('count-in delays the first note', async () => {
  const e = fakeEngine();
  const p = createPlayer(e);
  await p.play(opts({ countIn: true }));
  assert.equal(e.clicks.length, 4);
  assert.equal(e.clicks[0].accent, true);
  assert.equal(e.clicks[1].accent, false);
  assert.ok(Math.abs(e.clicks[0].when - 0.1) < 1e-9);
  assert.ok(Math.abs(e.clicks[3].when - 1.6) < 1e-9);
  assert.ok(Math.abs(e.calls[0].when - 2.1) < 1e-9, `first note at ${e.calls[0].when}`);
  p.stop();
});

test('loop schedules the next pass back to back, once', async () => {
  const e = fakeEngine();
  const p = createPlayer(e);
  // 160bpm, 1 beat x 2 chords = 0.75 s pass; next pass scheduled at 0.1+0.75-0.2
  await p.play(opts({ bpm: 160, beatsPerChord: 1, loop: true }));
  const firstPass = e.calls.length;
  await wait(750);
  assert.equal(e.clicks.length, 0);
  assert.ok(e.calls.length > firstPass);
  const second = e.calls.slice(firstPass);
  const passStart = 0.1 + 0.75;
  assert.ok(Math.abs(second[0].when - passStart) < 1e-6, `second pass at ${second[0].when}`);
  p.stop();
  assert.equal(p.playing, false);
});

test('sample names', () => {
  assert.equal(SAMPLE_NAMES.length, 40);
  assert.equal(SAMPLE_NAMES[0], 'E2');
  assert.equal(SAMPLE_NAMES[39], 'G5');
  assert.equal(midiToName(51), 'Eb3');
  assert.equal(midiToName(80 - 1), 'G5');
  for (const n of SAMPLE_NAMES) {
    assert.ok(existsSync(new URL(`../sounds/${n}.mp3`, import.meta.url)), `${n}.mp3 missing`);
  }
});
