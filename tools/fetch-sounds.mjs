// Downloads the 40 guitar samples (MIDI 40-79, E2-G5) once into sounds/.
import { mkdir, writeFile, access, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BASE = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_guitar_steel-mp3/';
const NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const nameOf = (m) => `${NAMES[m % 12]}${Math.floor(m / 12) - 1}`;
const dir = fileURLToPath(new URL('../sounds/', import.meta.url));

await mkdir(dir, { recursive: true });
let got = 0, skipped = 0, failed = 0, bytes = 0;
for (let m = 40; m <= 79; m++) {
  const name = nameOf(m);
  const file = dir + name + '.mp3';
  try {
    await access(file);
    skipped++;
    bytes += (await stat(file)).size;
    continue;
  } catch {}
  try {
    const res = await fetch(`${BASE}${name}.mp3`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(file, buf);
    got++;
    bytes += buf.length;
  } catch (err) {
    failed++;
    console.error(`failed ${name}: ${err.message}`);
  }
}
console.log(`sounds: ${got} downloaded, ${skipped} skipped, ${failed} failed, ${(bytes / 1024).toFixed(0)} KB total`);
process.exit(failed ? 1 : 0);
