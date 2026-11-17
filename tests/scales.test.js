import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODES, MODE_INFO, scaleNotes } from '../src/theory/scales.js';

test('C major', () => assert.deepEqual(scaleNotes('C','ionian'), ['C','D','E','F','G','A','B']));
test('F major spells Bb', () => assert.deepEqual(scaleNotes('F','ionian'), ['F','G','A','Bb','C','D','E']));
test('A aeolian', () => assert.deepEqual(scaleNotes('A','aeolian'), ['A','B','C','D','E','F','G']));
test('A harmonic minor', () => assert.deepEqual(scaleNotes('A','harmonicMinor'), ['A','B','C','D','E','F','G#']));
test('C lydian', () => assert.deepEqual(scaleNotes('C','lydian'), ['C','D','E','F#','G','A','B']));
test('E phrygian', () => assert.deepEqual(scaleNotes('E','phrygian'), ['E','F','G','A','B','C','D']));
test('F# major', () => assert.deepEqual(scaleNotes('F#','ionian'), ['F#','G#','A#','B','C#','D#','E#']));
test('A minor pentatonic', () => assert.deepEqual(scaleNotes('A','minorPentatonic'), ['A','C','D','E','G']));
test('every mode has MODE_INFO', () => { for (const m of Object.keys(MODES)) assert.ok(MODE_INFO[m].plain.length > 10); });
