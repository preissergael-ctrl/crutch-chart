import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, routeHash } from '../src/ui/router.js';

const ROUTES = [
  ['find', {}],
  ['mood', { id: 'sad' }],
  ['method', { id: 'family' }],
  ['method', { id: 'rotate', t: 'A', m: 'aeolian', r: ['i', 'bVI', 'bIII', 'bVII'] }],
  ['prog', { t: 'C', m: 'ionian', r: ['I', 'V', 'vi', 'IV'], src: 'mood:happy', id: 'axis' }],
  ['prog', { t: 'Bb', m: 'ionian', r: ['I', 'V', 'vi', 'IV'] }],
  ['prog', { t: 'F#', m: 'aeolian', r: ['i', 'bVII', 'bVI', 'V'], src: 'method:loops' }],
  ['chord', { symbol: 'F' }],
  ['chord', { symbol: 'G/B' }],
  ['chord', { symbol: 'Bm7b5' }],
  ['chord', { symbol: 'F#m' }],
  ['learn', {}],
  ['learn', { id: 'borrowed' }],
  ['saved', {}],
  ['about', {}],
];

test('every route round-trips', () => {
  for (const [view, params] of ROUTES) {
    const hash = routeHash(view, params);
    assert.ok(hash.startsWith('#/'), hash);
    assert.deepEqual(parseRoute(hash), { view, params }, hash);
  }
});

test('route hashes look as documented', () => {
  assert.equal(routeHash('find', {}), '#/find');
  assert.equal(routeHash('mood', { id: 'sad' }), '#/mood/sad');
  assert.equal(routeHash('learn', {}), '#/learn');
  assert.equal(routeHash('learn', { id: 'caged' }), '#/learn/caged');
  assert.equal(routeHash('chord', { symbol: 'G/B' }), '#/chord/G%2FB');
  assert.equal(
    routeHash('prog', { t: 'C', m: 'ionian', r: ['I', 'V', 'vi', 'IV'], id: 'axis', src: 'mood:happy' }),
    '#/prog?t=C&m=ionian&r=I,V,vi,IV&id=axis&src=mood:happy',
  );
});

test('documented prog hash parses', () => {
  assert.deepEqual(parseRoute('#/prog?t=A&m=aeolian&r=i,bVII,bVI,V&id=andalusian'), {
    view: 'prog', params: { t: 'A', m: 'aeolian', r: ['i', 'bVII', 'bVI', 'V'], id: 'andalusian' },
  });
  assert.deepEqual(parseRoute('#/chord/G%2FB'), { view: 'chord', params: { symbol: 'G/B' } });
});

test('r=bVII,I survives encoding', () => {
  const hash = routeHash('prog', { t: 'C', m: 'ionian', r: ['bVII', 'I'] });
  assert.match(hash, /r=bVII,I/);
  assert.deepEqual(parseRoute(hash).params.r, ['bVII', 'I']);
});

test('sharps, pluses and slashes survive encoding', () => {
  const params = { t: 'C#', m: 'harmonicMinor', r: ['i', 'III+', '#iv°', 'V7/3'] };
  assert.deepEqual(parseRoute(routeHash('prog', params)).params, params);
});

test('unknown or empty hash gives find', () => {
  for (const h of ['', '#', '#/', '#/nope', '#/mood', '#/mood/', 'garbage', '#/chord/', '#/method', undefined, null]) {
    assert.deepEqual(parseRoute(h), { view: 'find', params: {} }, String(h));
  }
});

test('bad percent-encoding does not throw', () => {
  assert.deepEqual(parseRoute('#/chord/%E0%A4%A'), { view: 'find', params: {} });
  assert.doesNotThrow(() => parseRoute('#/prog?t=%ZZ&r=I'));
});

test('ids with odd characters round-trip', () => {
  const params = { id: 'a b/c' };
  assert.deepEqual(parseRoute(routeHash('mood', params)), { view: 'mood', params });
});

test('method route carries a base progression', () => {
  assert.equal(routeHash('method', { id: 'rotate', t: 'C', m: 'ionian', r: ['I', 'V', 'vi', 'IV'] }),
    '#/method/rotate?t=C&m=ionian&r=I,V,vi,IV');
  assert.deepEqual(parseRoute('#/method/spice?t=Bb&m=ionian&r=I,bVII'),
    { view: 'method', params: { id: 'spice', t: 'Bb', m: 'ionian', r: ['I', 'bVII'] } });
  assert.deepEqual(parseRoute('#/method/family'), { view: 'method', params: { id: 'family' } });
});
