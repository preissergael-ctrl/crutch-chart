// Every file the app uses must be in the service worker's precache list, or it won't work offline.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const sw = readFileSync(new URL('sw.js', root), 'utf8');
const listed = new Set([...sw.matchAll(/'(\.\/[^']*)'/g)].map((m) => m[1]));

const files = (dir, ok, deep = false) => readdirSync(new URL(`${dir}/`, root), { recursive: deep })
  .map((f) => String(f).split(String.fromCharCode(92)).join('/')).filter(ok).map((f) => `./${dir}/${f}`);

test('service worker precaches every app file', () => {
  const need = [
    './', './index.html', './styles.css', './manifest.webmanifest',
    ...files('src', (f) => f.endsWith('.js'), true),
    ...files('sounds', (f) => f.endsWith('.mp3')),
    ...files('fonts', () => true),
    ...files('icons', () => true),
  ];
  assert.equal(files('sounds', (f) => f.endsWith('.mp3')).length, 40);
  const missing = need.filter((f) => !listed.has(f));
  assert.deepEqual(missing, []);
});

test('service worker lists only files that exist, under the right cache name', () => {
  assert.match(sw, /const CACHE = 'crutchchart-v1'/);
  for (const f of listed) {
    if (f === './') continue;
    assert.doesNotThrow(() => readFileSync(new URL(f.slice(2), root)), `${f} is listed but missing`);
  }
});
