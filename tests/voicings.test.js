import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHORD_TYPES } from '../src/theory/chords.js';
import { generateVoicings, assignFingers, fromTab } from '../src/guitar/voicings.js';

const keys = c => generateVoicings(c).map(v => v.key);
test('known shapes exist', () => {
  assert.ok(keys('C').includes('x32010')); assert.ok(keys('G').includes('320003')); assert.ok(keys('Am').includes('x02210'));
  assert.ok(keys('F').includes('133211')); assert.ok(keys('Dm').includes('xx0231')); assert.ok(keys('E').includes('022100'));
  assert.ok(keys('Bb').includes('x13331')); assert.ok(keys('Bm').includes('x24432')); });
test('easiest first', () => { assert.equal(keys('C')[0],'x32010'); assert.equal(keys('G')[0],'320003'); assert.equal(keys('Am')[0],'x02210');
  assert.equal(keys('F')[0],'133211'); assert.equal(keys('Dm')[0],'xx0231'); assert.equal(keys('E')[0],'022100'); assert.equal(keys('D')[0],'xx0232'); });
test('fingers', () => { assert.deepEqual(assignFingers(fromTab('133211')).fingers,[1,3,4,2,1,1]);
  assert.deepEqual(assignFingers(fromTab('x32010')).fingers,[null,3,2,null,1,null]);
  assert.deepEqual(assignFingers(fromTab('320003')).fingers,[2,1,null,null,null,3]); assert.equal(assignFingers(fromTab('103211')), null); });
test('caged labels', () => { const f = generateVoicings('F').find(v=>v.key==='133211'); assert.equal(f.caged,'E');
  assert.equal(generateVoicings('C').find(v=>v.key==='x35553').caged,'A'); });
test('slash chord bass', () => { for (const v of generateVoicings('G/B')) assert.equal(v.bassPc, 11); assert.ok(keys('G/B').includes('x20003')); });
test('frets stay within 0..15 and span', () => { for (const v of generateVoicings('A')) { const f=v.frets.filter(x=>x>0); assert.ok(Math.max(...f,0)<=15); if (f.length) assert.ok(Math.max(...f)-Math.min(...f) <= 3); } });
test('every type and root has a shape', () => {
  for (const r of ['C','Db','D','Eb','E','F','F#','G','Ab','A','Bb','B']) for (const q of Object.keys(CHORD_TYPES))
    assert.ok(generateVoicings(r+q).length > 0, r+q); });
test('fromTab handles (10) groups and cache is not corruptible', () => {
  assert.deepEqual(fromTab('x(10)(12)7x5'), [null,10,12,7,null,5]);
  const a = generateVoicings('C'); a.length = 0; a.push(null);
  assert.ok(generateVoicings('C').length > 1);
  assert.ok(generateVoicings('C')[0] && generateVoicings('C')[0].key === 'x32010');
});
