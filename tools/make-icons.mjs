// Draws the app icon as PNG files (phones need PNG, not SVG).
// Run: node tools/make-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Same shapes as icons/icon.svg, on a 512 grid: pine background, white chord box.
const LINES = [
  [136, 156, 376, 156], [168, 156, 168, 356], [232, 156, 232, 356], [296, 156, 296, 356], [360, 156, 360, 356],
  [136, 232, 376, 232], [136, 308, 376, 308],
];
const DOTS = [[200, 270], [264, 194], [328, 346]];
const LINE_HALF = 6, DOT_R = 26;
const PINE = [0x1f, 0x3a, 0x30];

function makeIcon(size) {
  const k = 512 / size;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const px = (x + 0.5) * k, py = (y + 0.5) * k;
      let d = Infinity; // signed-ish distance to the glyph edge, in 512-grid units (negative = inside)
      for (const [ax, ay, bx, by] of LINES) d = Math.min(d, distToSegment(px, py, ax, ay, bx, by) - LINE_HALF);
      for (const [cx, cy] of DOTS) d = Math.min(d, Math.hypot(px - cx, py - cy) - DOT_R);
      const a = Math.max(0, Math.min(1, 0.5 - d / k)); // anti-aliased edge
      for (let i = 0; i < 3; i++) raw[o++] = Math.round(PINE[i] + (255 - PINE[i]) * a);
      raw[o++] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = new URL('../icons/', import.meta.url);
mkdirSync(outDir, { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(new URL(`icon-${size}.png`, outDir), makeIcon(size));
  console.log(`icons/icon-${size}.png`);
}
