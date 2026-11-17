import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EASY_OPEN, isKnown, capoHint } from '../src/guitar/capo.js';

test('capo 3 for Bb F Gm Eb', () => {
  assert.deepEqual(capoHint(['Bb', 'F', 'Gm', 'Eb'], []), { capo: 3, playAs: ['G', 'D', 'Em', 'C'] });
});
test('no hint when all known', () => {
  assert.equal(capoHint(['C', 'G', 'Am', 'F'], ['Am', 'F', 'C', 'Dm', 'G']), null);
});
test('capo 5 for C G Am F with nothing known', () => {
  assert.deepEqual(capoHint(['C', 'G', 'Am', 'F'], []), { capo: 5, playAs: ['G', 'D', 'Em', 'C'] });
});
test('isKnown matches enharmonics', () => {
  assert.equal(isKnown('A#m', ['Bbm']), true);
  assert.equal(isKnown('Bm', ['Bbm']), false);
});
test('isKnown ignores unparseable entries', () => {
  assert.equal(isKnown('Am', ['nonsense', 'Am']), true);
  assert.equal(isKnown('F', ['nonsense']), false);
});
test('slash chord keeps its bass', () => {
  assert.deepEqual(capoHint(['Bb/D', 'F', 'Gm', 'Eb'], ['G/B']), { capo: 3, playAs: ['G/B', 'D', 'Em', 'C'] });
});
test('empty list and no solution give null', () => {
  assert.equal(capoHint([], []), null);
  assert.equal(capoHint(['C', 'F#'], []), null);
});
test('EASY_OPEN has 24 shapes', () => assert.equal(EASY_OPEN.length, 24));
