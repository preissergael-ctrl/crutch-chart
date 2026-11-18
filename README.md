# Crutch Chart

> A crutch to express myself while I learn to walk.

Crutch Chart is a guitar app for finding chord progressions by mood, seeing in plain words why they work, and playing them. It shows each chord's shape on the neck, plays the progression with real guitar sounds, and teaches the theory behind it in short lessons. It runs on a phone, works offline once it has opened, and keeps your saved progressions on the device.

It is plain HTML, CSS and JavaScript modules. There are no dependencies, no build step and no npm install.

## Run it

```
node tools/serve.mjs
```

Then open http://localhost:5173. The server also prints an address you can open on a phone on the same Wi-Fi.

## Test it

Unit tests (theory engine, guitar shapes, content claims, audio scheduling, storage, router):

```
node --test tests/
```

Smoke test in headless Chrome. It visits every screen, fails on any error or sideways scroll, saves a screenshot per screen, and checks offline mode and playback. Start the server first:

```
node tools/smoke.mjs http://localhost:5173/ <folder for screenshots>
```

## Folder layout

```
index.html, styles.css, sw.js, manifest.webmanifest   the app shell and offline support
fonts/, icons/, sounds/                              self-hosted fonts, app icons, guitar samples
src/theory/      notes, scales and modes, chords, chord numbers, the logic behind the methods
src/guitar/      chord shapes on the neck, fingers, CAGED labels, capo hints
src/content/     progressions, moods, methods, strum and picking patterns, lessons
src/audio/       timing of notes, Web Audio playback, the player
src/ui/          router, app shell, screens (views/) and drawings (components/)
src/store.js     your chords, saved progressions, settings and backup
tests/           node:test files
tools/           dev server, smoke test, icon maker, sound downloader
```

## Credits

Guitar sound: FluidR3_GM by Frank Wen, via gleitz/midi-js-soundfonts, CC BY 3.0.
