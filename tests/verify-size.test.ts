import { describe, it, expect } from 'vitest';
import { verifyPixelSize, verifyRgba } from '../src/verify';
import { encode } from '../src/encode';
import { renderSvg } from '../src/render';
import { DEFAULT_STYLE } from '../src/settings';
import { rasterRgba } from './helpers/raster-node';

describe('verifyPixelSize', () => {
  it('stays at 512 px for ordinary links', () => {
    expect(verifyPixelSize(33, 4, 1024)).toBe(512);
  });

  it('grows with dense codes but never beyond the export size', () => {
    expect(verifyPixelSize(177, 4, 4096)).toBeGreaterThanOrEqual((177 + 8) * 5);
    expect(verifyPixelSize(177, 4, 512)).toBe(512);
  });

  it('a near-capacity code at default style verifies at the chosen size', () => {
    const text = 'https://example.com/?' + 'a1b2c3d4e5'.repeat(150); // ~1.5 KB, very dense at ECC Q
    const m = encode(text, 'Q');
    expect(m.size).toBeGreaterThan(140);
    const px = verifyPixelSize(m.size, DEFAULT_STYLE.margin, DEFAULT_STYLE.exportSize);
    const { rgba, width, height } = rasterRgba(renderSvg(m, DEFAULT_STYLE), px);
    expect(verifyRgba(rgba, width, height, text).ok).toBe(true);
  });
});
