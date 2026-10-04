const SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
const COLOR_TYPES = new Set(['sRGB', 'gAMA', 'cHRM', 'iCCP', 'pHYs']);

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export interface Chunk {
  type: string;
  data: Uint8Array;
}

export function readChunks(png: Uint8Array): Chunk[] {
  if (png.length < 8 || SIGNATURE.some((b, i) => png[i] !== b)) throw new Error('not a PNG');
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const out: Chunk[] = [];
  let p = 8;
  while (p + 12 <= png.length) {
    const len = view.getUint32(p);
    const type = String.fromCharCode(...png.subarray(p + 4, p + 8));
    out.push({ type, data: png.slice(p + 8, p + 8 + len) });
    p += 12 + len;
  }
  return out;
}

function encodeChunk({ type, data }: Chunk): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

export function writeChunks(chunks: Chunk[]): Uint8Array {
  const parts = [SIGNATURE, ...chunks.map(encodeChunk)];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function u32s(...ns: number[]): Uint8Array {
  const b = new Uint8Array(ns.length * 4);
  const v = new DataView(b.buffer);
  ns.forEach((n, i) => v.setUint32(i * 4, n));
  return b;
}

/** Tag the image as sRGB (plus gAMA/cHRM for readers that ignore sRGB); optionally set print DPI. */
export function applyColorMetadata(png: Uint8Array, dpi?: number): Uint8Array {
  const chunks = readChunks(png).filter((c) => !COLOR_TYPES.has(c.type));
  const meta: Chunk[] = [
    { type: 'sRGB', data: new Uint8Array([0]) }, // perceptual intent
    { type: 'gAMA', data: u32s(45455) },
    { type: 'cHRM', data: u32s(31270, 32900, 64000, 33000, 30000, 60000, 15000, 6000) },
  ];
  if (dpi) {
    const ppm = Math.round(dpi / 0.0254);
    const d = new Uint8Array(9);
    const v = new DataView(d.buffer);
    v.setUint32(0, ppm);
    v.setUint32(4, ppm);
    d[8] = 1; // unit: metre
    meta.push({ type: 'pHYs', data: d });
  }
  const ihdr = chunks.findIndex((c) => c.type === 'IHDR');
  chunks.splice(ihdr + 1, 0, ...meta);
  return writeChunks(chunks);
}
