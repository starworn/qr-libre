import { describe, it, expect } from 'vitest';
import { PRESETS } from '../src/presets';
import { analyzeColors } from '../src/contrast';
import { encode } from '../src/encode';
import { renderSvg } from '../src/render';
import { verifyRgba } from '../src/verify';
import { DEFAULT_STYLE, sanitizeStyle } from '../src/settings';
import { rasterRgba } from './helpers/raster-node';

const URL = 'https://carriecatt.carrd.co';

describe('presets', () => {
  for (const [name, patch] of Object.entries(PRESETS)) {
    const style = { ...DEFAULT_STYLE, ...patch };
    it(`${name}: valid, legible, no warnings`, () => {
      expect(sanitizeStyle(style)).toEqual(style);
      const r = analyzeColors(style);
      expect(r.inverted).toBe(false);
      expect(r.level).not.toBe('low');
      expect(style.margin).toBeGreaterThanOrEqual(2);
      const { rgba, width, height } = rasterRgba(renderSvg(encode(URL, style.ecc), style), 400);
      expect(verifyRgba(rgba, width, height, URL).ok).toBe(true);
    });
  }
});
