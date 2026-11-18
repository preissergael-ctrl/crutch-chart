// Headless Chrome smoke test: visits every route, records errors, saves a screenshot per route.
// Run: node tools/smoke.mjs http://localhost:5173/ <outDir>
// Exits 1 if any route threw, logged a console error, failed to load a file, or scrolls sideways.
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

// Later tasks append their routes here.
export const ROUTES = [
  '#/find',
  '#/mood/sad',
  '#/mood/nope',
  '#/prog?t=C&m=ionian&r=I,V,vi,IV&id=axis',
  '#/prog?t=Bb&m=ionian&r=I,V,vi,IV',
  '#/prog?t=A&m=aeolian&r=i,bVII,bVI,V&id=andalusian',
  '#/prog?t=C&m=nope&r=I,V',
  '#/chord/F',
  '#/chord/G%2FB',
  '#/chord/Bm7b5',
  '#/chord/C',
  '#/chord/H',
  '#/method/family',
  '#/method/loops',
  '#/method/rotate',
  '#/method/tension',
  '#/method/circle',
  '#/method/borrow',
  '#/method/modes',
  '#/method/spice',
  '#/method/bass',
  '#/method/rotate?t=A&m=aeolian&r=i,bVI,bIII,bVII',
  '#/method/spice?t=C&m=nope&r=I',
  '#/method/circle?t=C&m=ionian&n=3',
  '#/method/circle?t=C&m=ionian&n=5',
  '#/method/circle?t=A&m=aeolian&n=3',
  '#/method/circle?t=A&m=aeolian&n=5',
  '#/method/nope',
  '#/learn',
  '#/learn/borrowed',
  '#/learn/caged',
  '#/learn/reading-the-neck',
  '#/learn/nope',
  '#/prog?t=C&m=ionian&r=I,bVII,IV,I&src=lesson:borrowed',
  '#/prog?t=A&m=aeolian&r=i,bVII,bVI,V&src=saved&bpm=70&b=2&p=folk&k=strum',
  '#/saved',
  '#/about',
  '#/prog?t=C&m=ionian&r=Imaj7,vi7,ii7,V7&id=romantic-7ths',
  '#/prog?t=A&m=mixolydian&r=I7,I7,I7,I7,IV7,IV7,I7,I7,V7,IV7,I7,V7&id=twelve-bar',
  '#/prog?t=A&m=aeolian&r=i,bVII,bVI,V&id=andalusian&src=saved&n=Rainy%20window',
];

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9334;
const WIDTH = 390;
const HEIGHT = 844;
const MAX_SHOT = 6000;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fileFor = (route) => route.replace(/^#\/?/, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'home';

async function waitForChrome() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (res.ok) return await res.json();
    } catch { /* not up yet */ }
    await wait(250);
  }
  throw new Error('Chrome did not start');
}

function connect(url, onEvent) {
  const ws = new WebSocket(url);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      const { ok, fail } = pending.get(d.id);
      pending.delete(d.id);
      if (d.error) fail(new Error(`${d.error.message} (${d.error.code})`));
      else ok(d.result);
    } else if (d.method) onEvent?.(d.method, d.params);
  };
  const send = (method, params = {}) => new Promise((ok, fail) => {
    const i = ++id;
    pending.set(i, { ok, fail });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const open = new Promise((ok, fail) => { ws.onopen = ok; ws.onerror = fail; });
  return { ws, send, open };
}

async function main() {
  const [base, outArg] = process.argv.slice(2);
  if (!base || !outArg) {
    console.error('Usage: node tools/smoke.mjs <baseUrl> <outDir>');
    process.exit(2);
  }
  const outDir = resolve(outArg);
  mkdirSync(outDir, { recursive: true });
  // Outside the repo: Chrome's cache storage fails inside a OneDrive folder.
  const profile = join(tmpdir(), `crutch-smoke-profile-${Date.now()}`);

  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required',
    'about:blank',
  ], { stdio: 'ignore' });
  const exited = new Promise((r) => chrome.once('exit', r));

  const errors = [];
  let currentRoute = '(startup)';
  let page;
  try {
    const version = await waitForChrome();
    const tabs = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
    const target = tabs.find((t) => t.type === 'page');
    let loaded = null;
    page = connect(target.webSocketDebuggerUrl, (method, p) => {
      if (method === 'Runtime.exceptionThrown') {
        const d = p.exceptionDetails;
        errors.push(`${currentRoute}: exception: ${d.exception?.description || d.text}`);
      } else if (method === 'Runtime.consoleAPICalled' && p.type === 'error') {
        errors.push(`${currentRoute}: console.error: ${p.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
      } else if (method === 'Log.entryAdded' && p.entry.level === 'error') {
        errors.push(`${currentRoute}: ${p.entry.source}: ${p.entry.text}${p.entry.url ? ` (${p.entry.url})` : ''}`);
      } else if (method === 'Page.loadEventFired' && loaded) {
        loaded();
      }
    });
    await page.open;
    const { send } = page;
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Log.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: true });

    const only = process.env.SMOKE_ONLY ? process.env.SMOKE_ONLY.split('|') : null;
    for (const route of ROUTES.filter((r) => !only || only.some((s) => r.includes(s)))) {
      currentRoute = route;
      const sep = base.includes('?') ? '&' : '?';
      const url = `${base}${sep}smoke=${Date.now()}${route}`;
      if (route === '#/saved') {
        // Seed two saved progressions so the screenshot shows a filled list (same origin as the app).
        const ch = (roman, name, quality, root) => ({ roman, name, quality, root });
        const state = {
          version: 1, known: ['Am', 'F', 'C', 'Dm', 'G', 'Bb7'], settings: { bpm: 90, patternId: 'folk', kind: 'strum', lastKey: null },
          saved: [
            { id: 'a1', name: 'Rainy window', tonic: 'A', mode: 'aeolian', chords: [ch('i', 'Am', 'm', 'A'), ch('bVII', 'G', '', 'G'), ch('bVI', 'F', '', 'F'), ch('V', 'E', '', 'E')], bpm: 70, beatsPerChord: 2, timeSig: 4, patternId: 'folk', kind: 'strum', source: 'saved', createdAt: 1 },
            { id: 'bad', name: 'Broken', tonic: 'A', mode: 'aeolian', chords: [null] },
            { id: 'b2', name: 'Morning in Bb', tonic: 'Bb', mode: 'ionian', chords: [ch('I', 'Bb', '', 'Bb'), ch('V', 'F', '', 'F'), ch('vi', 'Gm', 'm', 'G'), ch('IV', 'Eb', '', 'Eb')], bpm: 100, beatsPerChord: 4, timeSig: 4, patternId: 'folk', kind: 'strum', source: 'custom', createdAt: 2 },
          ],
        };
        await send('Runtime.evaluate', { expression: `localStorage.setItem('crutchchart:v1', ${JSON.stringify(JSON.stringify(state))})` });
      }
      const onLoad = new Promise((r) => { loaded = r; });
      const nav = await send('Page.navigate', { url });
      if (nav.errorText) errors.push(`${route}: navigation failed: ${nav.errorText}`);
      await Promise.race([onLoad, wait(8000)]);
      loaded = null;
      await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => true)', awaitPromise: true });
      await wait(400);

      const hasH1 = await send('Runtime.evaluate', { expression: "!!document.querySelector('#view h1')", returnByValue: true });
      if (hasH1.result.value !== true) errors.push(`${route}: no #view h1 rendered`);

      const { result } = await send('Runtime.evaluate', {
        expression: 'JSON.stringify({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth })',
        returnByValue: true,
      });
      const size = JSON.parse(result.value);
      if (size.w > WIDTH) errors.push(`${route}: page scrolls sideways (${size.w}px wide)`);

      // Stretch the viewport to the page height so fixed bars sit at the bottom of the shot.
      const tall = Math.min(Math.max(size.h, HEIGHT), MAX_SHOT);
      await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: tall, deviceScaleFactor: 2, mobile: true });
      await wait(200);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 2, mobile: true });
      const file = join(outDir, `${fileFor(route)}.png`);
      writeFileSync(file, Buffer.from(shot.data, 'base64'));
      console.log(`ok  ${route}  ->  ${file}`);

      if (route.includes('n=Rainy')) {
        const r = await send('Runtime.evaluate', { expression: "document.querySelector('#view h1').textContent + ' | ' + (document.querySelector('.why-text')?.textContent || '')", returnByValue: true });
        if (!r.result.value.startsWith('Rainy window | The chords walk down')) errors.push(`${route}: saved name or why text missing (${r.result.value.slice(0, 80)})`);
      }
      if (route.includes('id=twelve-bar')) {
        const r = await send('Runtime.evaluate', { expression: "[...document.querySelectorAll('.why-borrow')].map((e) => e.textContent).join(' | ')", returnByValue: true });
        if (r.result.value.includes('harmonic') || !r.result.value.includes('A major')) errors.push(`${route}: borrowed labels are ${r.result.value}`);
      }

      if (route === '#/method/family') {
        const r = await send('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true });
        if (!r.result.value.includes('You already know 5 of the 7 chords in C major')) errors.push(`${route}: family headline is wrong`);
      }

      // Playback check: press Play twice (the second press must restart cleanly), then a chord should light up.
      // Method tools: pressing a row's Play must start sound, and leaving the screen must stop it.
      if (route === '#/saved') {
        const add = async (sym) => (await send('Runtime.evaluate', {
          expression: `(() => { const i = document.querySelector('#add-chord'); i.value = ${JSON.stringify(sym)}; i.form.requestSubmit(); return document.querySelector('.field-msg').textContent; })()`,
          returnByValue: true,
        })).result.value;
        const bad = await add('Hm');
        if (!bad.includes('I don’t know the chord “Hm”')) errors.push(`${route}: bad chord message was "${bad}"`);
        const dup = await add('Am');
        if (dup !== 'Already on your list.') errors.push(`${route}: duplicate message was "${dup}"`);
        const good = await add('Em');
        if (!good.startsWith('Added')) errors.push(`${route}: adding Em said "${good}"`);
        const uni = await add('f♯m');
        if (uni !== 'Added F♯m.') errors.push(`${route}: typing f♯m said "${uni}"`);
        const opens = await send('Runtime.evaluate', { expression: "document.querySelector('.saved-row .button')?.getAttribute('href')", returnByValue: true });
        if (!String(opens.result.value).includes('bpm=70')) errors.push(`${route}: Open link lacks saved settings (${opens.result.value})`);
        if (!String(opens.result.value).includes('n=Rainy%20window')) errors.push(`${route}: Open link lacks the saved name (${opens.result.value})`);
        const del = await send('Runtime.evaluate', {
          expression: `(() => { document.querySelector('.saved-row .button.ghost').click(); document.querySelector('.saved-row .confirm-q + .button').click();
            const a = document.activeElement; return JSON.stringify({ rows: document.querySelectorAll('.saved-row').length, focus: a ? a.tagName + ' ' + (a.getAttribute('aria-label') || a.textContent) : 'none' }); })()`,
          returnByValue: true,
        });
        const d = JSON.parse(del.result.value);
        if (d.rows !== 1 || !d.focus.startsWith('A Open Morning')) errors.push(`${route}: after delete, rows ${d.rows}, focus on ${d.focus}`);
        const chip = await send('Runtime.evaluate', {
          expression: "(() => { document.querySelector('.chip-x').click(); const a = document.activeElement; return a ? a.className + ' ' + a.getAttribute('aria-label') : 'none'; })()",
          returnByValue: true,
        });
        if (!String(chip.result.value).startsWith('chip-x Remove')) errors.push(`${route}: after removing a chip, focus on ${chip.result.value}`);
        if (errors.length === 0 || !errors.some((e) => e.startsWith(route))) console.log(`ok  ${route}  my chords validate, add, and the Open link carries saved settings`);
      }

      if (route === '#/method/loops') {
        const before = errors.length;
        await send('Runtime.evaluate', { expression: "document.querySelector('.play-btn')?.click()" });
        await wait(1000);
        const r = await send('Runtime.evaluate', {
          expression: "JSON.stringify({ playing: window.__crutch.player.playing, label: document.querySelector('.play-btn')?.textContent || '' })",
          returnByValue: true,
        });
        const st = JSON.parse(r.result.value);
        if (!st.playing && !/stop/i.test(st.label)) errors.push(`${route}: Play in a method row did not start (${r.result.value})`);
        await send('Runtime.evaluate', { expression: "location.hash = '#/find'" });
        await wait(400);
        const after = await send('Runtime.evaluate', { expression: 'window.__crutch.player.playing', returnByValue: true });
        if (after.result.value !== false) errors.push(`${route}: still playing after leaving the screen`);
        if (errors.length === before) console.log(`ok  ${route}  row Play starts, and stops on leaving`);
      }

      if (route.includes('id=axis')) {
        const before = errors.length;
        const press = "(() => { const b = document.querySelector('.play'); if (!b) return false; b.click(); return true; })()";
        for (let i = 0; i < 2; i++) {
          const r = await send('Runtime.evaluate', { expression: press, returnByValue: true });
          if (r.result.value !== true) errors.push(`${route}: Play button not found`);
          await wait(150);
        }
        let lit = false;
        for (let i = 0; i < 16 && !lit; i++) {
          await wait(250);
          const r = await send('Runtime.evaluate', { expression: "!!document.querySelector('.chord.current')", returnByValue: true });
          lit = r.result.value === true;
        }
        if (!lit) errors.push(`${route}: no .chord.current after pressing Play twice`);
        else console.log(`ok  ${route}  playback highlights a chord`);
        const playShot = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(join(outDir, `${fileFor(route)}-playing.png`), Buffer.from(playShot.data, 'base64'));
        await send('Runtime.evaluate', { expression: "document.querySelector('.stop')?.click()" });
        if (errors.length === before) console.log(`ok  ${route}  no exceptions while playing`);
      }
    }

    // Offline: after the service worker has cached everything, cut the network and play a progression.
    {
      currentRoute = '(offline check)';
      const before = errors.length;
      const swSource = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
      const listed = [...new Set([...swSource.matchAll(/'(\.\/[^']*)'/g)].map((m) => m[1]))];
      const expected = listed.length;
      const cacheName = /const CACHE = '([^']+)'/.exec(swSource)[1];
      const onLoad = new Promise((r) => { loaded = r; });
      await send('Page.navigate', { url: base });
      await Promise.race([onLoad, wait(8000)]);
      loaded = null;
      // Wait for the service worker to finish precaching: every listed file must be in the cache.
      const cached = await send('Runtime.evaluate', {
        expression: `navigator.serviceWorker.ready.then(async () => {
          const list = ${JSON.stringify(listed)};
          const cache = await caches.open(${JSON.stringify(cacheName)});
          let missing = list;
          for (let i = 0; i < 80 && missing.length; i++) {
            const have = new Set((await cache.keys()).map((r) => r.url));
            missing = list.filter((f) => !have.has(new URL(f, location.href).href));
            if (missing.length) await new Promise((r) => setTimeout(r, 250));
          }
          return missing;
        })`,
        awaitPromise: true, returnByValue: true,
      });
      if (!Array.isArray(cached.result.value) || cached.result.value.length) errors.push(`offline: not cached: ${JSON.stringify(cached.result.value)}`);
      await send('Network.enable');
      await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
      const onReload = new Promise((r) => { loaded = r; });
      await send('Page.reload');
      await Promise.race([onReload, wait(8000)]);
      loaded = null;
      await send('Runtime.evaluate', { expression: "location.hash = '#/prog?t=C&m=ionian&r=I,V,vi,IV'" });
      await wait(600);
      const ready = await send('Runtime.evaluate', { expression: "!!document.querySelector('.play')", returnByValue: true });
      if (ready.result.value !== true) errors.push('offline: progression screen did not render');
      await send('Runtime.evaluate', { expression: "document.querySelector('.play')?.click()" });
      let ok = false;
      for (let i = 0; i < 12 && !ok; i++) {
        await wait(250);
        ok = (await send('Runtime.evaluate', { expression: 'window.__crutch.engine.loaded === true', returnByValue: true })).result.value === true;
      }
      if (!ok) errors.push('offline: sounds did not load from the cache');
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(join(outDir, 'offline-prog.png'), Buffer.from(shot.data, 'base64'));
      await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      if (errors.length === before) console.log(`ok  offline  ${expected} files cached; reload, open a progression, Play: sounds loaded`);
    }

    // Close Chrome politely through the browser endpoint, then make sure.
    try {
      const browser = connect(version.webSocketDebuggerUrl);
      await browser.open;
      browser.send('Browser.close').catch(() => {});
    } catch { /* fall through to kill */ }
  } catch (err) {
    errors.push(`${currentRoute}: smoke failed: ${err.message}`);
  } finally {
    page?.ws.close();
    await Promise.race([exited, wait(4000)]);
    if (chrome.exitCode === null) chrome.kill();
    await Promise.race([exited, wait(2000)]);
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* leave it */ }
  }

  if (errors.length) {
    console.error(`\n${errors.length} error(s):`);
    for (const e of errors) console.error(`  ${e}`);
    process.exit(1);
  }
  console.log(`\nAll ${ROUTES.length} routes passed with no errors.`);
  process.exit(0);
}

// Only run when called directly, so other scripts can import ROUTES.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
