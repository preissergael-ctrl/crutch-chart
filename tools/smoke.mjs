// Headless Chrome smoke test: visits every route, records errors, saves a screenshot per route.
// Run: node tools/smoke.mjs http://localhost:5173/ <outDir>
// Exits 1 if any route threw, logged a console error, failed to load a file, or scrolls sideways.
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
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
  '#/method/nope',
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
  const profile = join(outDir, `chrome-profile-${Date.now()}`);

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

    for (const route of ROUTES) {
      currentRoute = route;
      const sep = base.includes('?') ? '&' : '?';
      const url = `${base}${sep}smoke=${Date.now()}${route}`;
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

      if (route === '#/method/family') {
        const r = await send('Runtime.evaluate', { expression: 'document.body.innerText', returnByValue: true });
        if (!r.result.value.includes('You already know 5 of the 7 chords in C major')) errors.push(`${route}: family headline is wrong`);
      }

      // Playback check: press Play twice (the second press must restart cleanly), then a chord should light up.
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
