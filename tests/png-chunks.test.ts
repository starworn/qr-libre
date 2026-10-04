import { describe, it, expect } from 'vitest';
import { PNG } from 'pngjs';
import { applyColorMetadata, crc32, readChunks, writeChunks } from '../src/png-chunks';
import { encode } from '../src/encode';
import { renderSvg } from '../src/render';
import { DEFAULT_STYLE } from '../src/settings';
import { rasterPng } from './helpers/raster-node';

const sample = () => rasterPng(renderSvg(encode('https://carriecatt.carrd.co', 'Q'), DEFAULT_STYLE), 256);
const u32 = (d: Uint8Array, i = 0) => new DataView(d.buffer, d.byteOffset).getUint32(i);

describe('png-chunks', () => {
  it('crc32 matches the IEND reference', () => {
    expect(crc32(new TextEncoder().encode('IEND'))).toBe(0xae426082);
  });

  it('read → write is lossless', () => {
    const png = sample();
    expect(writeChunks(readChunks(png))).toEqual(png);
  });

  it('rejects non-PNG data', () => {
    expect(() => readChunks(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow('not a PNG');
  });

  it('screen mode: sRGB, gAMA, cHRM right after IHDR, no pHYs', () => {
    const types = readChunks(applyColorMetadata(sample())).map((c) => c.type);
    expect(types.slice(0, 4)).toEqual(['IHDR', 'sRGB', 'gAMA', 'cHRM']);
    expect(types).not.toContain('pHYs');
    expect(types.at(-1)).toBe('IEND');
  });

  it('print mode: pHYs = 300 DPI (11811 px/m, unit metre)', () => {
    const phys = readChunks(applyColorMetadata(sample(), 300)).find((c) => c.type === 'pHYs')!;
    expect(u32(phys.data, 0)).toBe(11811);
    expect(u32(phys.data, 4)).toBe(11811);
    expect(phys.data[8]).toBe(1);
  });

  it('values are the sRGB-standard ones', () => {
    const chunks = readChunks(applyColorMetadata(sample()));
    expect(chunks.find((c) => c.type === 'sRGB')!.data).toEqual(new Uint8Array([0]));
    expect(u32(chunks.find((c) => c.type === 'gAMA')!.data)).toBe(45455);
  });

  it('is idempotent (no duplicate colour chunks)', () => {
    const twice = applyColorMetadata(applyColorMetadata(sample(), 300), 300);
    const types = readChunks(twice).map((c) => c.type);
    for (const t of ['sRGB', 'gAMA', 'cHRM', 'pHYs']) expect(types.filter((x) => x === t)).toHaveLength(1);
  });

  it('output is a valid PNG with identical pixels (pngjs checks CRCs)', () => {
    const before = PNG.sync.read(Buffer.from(sample()));
    const after = PNG.sync.read(Buffer.from(applyColorMetadata(sample(), 300)));
    expect(after.width).toBe(before.width);
    expect(Buffer.compare(after.data, before.data)).toBe(0);
  });
});
