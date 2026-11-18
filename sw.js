// Service worker: lets Crutch Chart open with no internet.
// Strategy: try the network first (so you always get the newest version), fall back to the saved copy offline.
// Bump CACHE whenever shipped files are added or changed. tests/sw.test.js fails if a file is missing from the list below.
const CACHE = 'crutchchart-v2';
const APP_FILES = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './fonts/literata.woff2',
  './fonts/outfit.woff2',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './src/audio/engine.js',
  './src/audio/player.js',
  './src/audio/schedule.js',
  './src/content/lessons.js',
  './src/content/methods.js',
  './src/content/moods.js',
  './src/content/patterns.js',
  './src/content/progressions.js',
  './src/guitar/capo.js',
  './src/guitar/shapes.js',
  './src/guitar/voicings.js',
  './src/store.js',
  './src/theory/chords.js',
  './src/theory/methods.js',
  './src/theory/notes.js',
  './src/theory/roman.js',
  './src/theory/scales.js',
  './src/ui/app.js',
  './src/ui/components/chordrow.js',
  './src/ui/components/neck.js',
  './src/ui/components/pattern.js',
  './src/ui/dom.js',
  './src/ui/router.js',
  './src/ui/views/about.js',
  './src/ui/views/chord.js',
  './src/ui/views/find.js',
  './src/ui/views/learn.js',
  './src/ui/views/method.js',
  './src/ui/views/methods/bases.js',
  './src/ui/views/methods/family.js',
  './src/ui/views/methods/more.js',
  './src/ui/views/methods/shared.js',
  './src/ui/views/progression.js',
  './src/ui/views/saved.js',
  './sounds/A2.mp3',
  './sounds/A3.mp3',
  './sounds/A4.mp3',
  './sounds/Ab2.mp3',
  './sounds/Ab3.mp3',
  './sounds/Ab4.mp3',
  './sounds/B2.mp3',
  './sounds/B3.mp3',
  './sounds/B4.mp3',
  './sounds/Bb2.mp3',
  './sounds/Bb3.mp3',
  './sounds/Bb4.mp3',
  './sounds/C3.mp3',
  './sounds/C4.mp3',
  './sounds/C5.mp3',
  './sounds/D3.mp3',
  './sounds/D4.mp3',
  './sounds/D5.mp3',
  './sounds/Db3.mp3',
  './sounds/Db4.mp3',
  './sounds/Db5.mp3',
  './sounds/E2.mp3',
  './sounds/E3.mp3',
  './sounds/E4.mp3',
  './sounds/E5.mp3',
  './sounds/Eb3.mp3',
  './sounds/Eb4.mp3',
  './sounds/Eb5.mp3',
  './sounds/F2.mp3',
  './sounds/F3.mp3',
  './sounds/F4.mp3',
  './sounds/F5.mp3',
  './sounds/G2.mp3',
  './sounds/G3.mp3',
  './sounds/G4.mp3',
  './sounds/G5.mp3',
  './sounds/Gb2.mp3',
  './sounds/Gb3.mp3',
  './sounds/Gb4.mp3',
  './sounds/Gb5.mp3',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    // cache: 'no-cache' = always ask the server for the newest file, so the phone never mixes old and new code.
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true })
        .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
