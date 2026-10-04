import { describe, it, expect } from 'vitest';
import { verifyRgba } from '../src/verify';
import { encode } from '../src/encode';
import { renderSvg } from '../src/render';
import { DEFAULT_STYLE } from '../src/settings';
import { rasterRgba } from './helpers/raster-node';

const URL = 'https://carriecatt.carrd.co';

describe('verifyRgba', () => {
  it('accepts a default render', () => {
    const { rgba, width, height } = rasterRgba(renderSvg(encode(URL, 'Q'), DEFAULT_STYLE), 400);
    expect(verifyRgba(rgba, width, height, URL)).toEqual({ ok: true, decoded: URL });
  });

  it('reports a mismatch when the expected text differs', () => {
    const { rgba, width, height } = rasterRgba(renderSvg(encode(URL, 'Q'), DEFAULT_STYLE), 400);
    expect(verifyRgba(rgba, width, height, 'https://other.example').ok).toBe(false);
  });

  it('rejects a blank image', () => {
    const blank = new Uint8Array(100 * 100 * 4).fill(255);
    expect(verifyRgba(blank, 100, 100, URL)).toEqual({ ok: false, decoded: null });
  });

  it('composites transparent pixels over white', () => {
    // Fully transparent black must read as white (=blank), not black.
    const clear = new Uint8Array(100 * 100 * 4); // all zeros: rgba(0,0,0,0)
    expect(verifyRgba(clear, 100, 100, URL).decoded).toBeNull();
  });

  it('fails an inverted (light-on-dark) code', () => {
    const s = { ...DEFAULT_STYLE, color1: '#ffffff', bgColor: '#000000' };
    const { rgba, width, height } = rasterRgba(renderSvg(encode(URL, 'Q'), s), 400);
    expect(verifyRgba(rgba, width, height, URL).ok).toBe(false);
  });
});
