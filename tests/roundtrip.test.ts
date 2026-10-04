import { describe, it, expect } from 'vitest';
import { encode } from '../src/encode';
import { renderSvg } from '../src/render';
import { verifyRgba } from '../src/verify';
import { DEFAULT_STYLE, LIMITS, type Ecc, type Style } from '../src/settings';
import { rasterRgba } from './helpers/raster-node';

const URLS = [
  'https://carriecatt.carrd.co',
  'https://example.com/una/ruta/bastante/larga?con=parametros&y=mas#ancla',
  'https://ejemplo.mx/café-ñandú',
];
const MAX_R = LIMITS.moduleRadius.max;
const MAX_E = LIMITS.eyeRadius.max;

// Every variant here is inside the "green" range the UI allows without warnings
// (margin >= 2, good contrast, dark-on-light). Margin 0/1 and inverted live in the gallery only.
const VARIANTS: Array<[string, Partial<Style>]> = [
  ['default', {}],
  ['modules-50', { moduleRadius: 0.5 }],
  ['modules-max', { moduleRadius: MAX_R }],
  ['eyes-max', { eyeRadius: MAX_E }],
  ['all-round-max', { moduleRadius: MAX_R, eyeRadius: MAX_E }],
  ['linear', { fillMode: 'linear', color1: '#1a1a2e', color2: '#5b2a86', gradientAngle: 30 }],
  ['radial', { fillMode: 'radial', color1: '#0b3d2e', color2: '#3a1c71' }],
  ['eye-color', { eyeColorEnabled: true, eyeColor: '#a3238f' }],
  ['transparent', { bgTransparent: true }],
  ['margin-2', { margin: 2 }],
  ['margin-max', { margin: LIMITS.margin.max }],
  ['bg-radius-max', { bgRadius: 1 }],
  ['soft-bg', { bgColor: '#fde2e4', color1: '#3b1f2b' }],
  ['kitchen-sink', {
    moduleRadius: MAX_R, eyeRadius: MAX_E, fillMode: 'linear', color1: '#2b2d42', color2: '#6a0572',
    eyeColorEnabled: true, eyeColor: '#1b263b', bgColor: '#fff1e6', bgRadius: 1, margin: 2,
  }],
];
const ECCS: Ecc[] = ['L', 'M', 'Q', 'H'];

describe('round-trip: render → raster → decode', () => {
  for (const ecc of ECCS)
    for (const url of URLS)
      for (const [name, patch] of VARIANTS)
        it(`${ecc} · ${name} · ${url}`, () => {
          const style: Style = { ...DEFAULT_STYLE, ...patch, ecc };
          const { rgba, width, height } = rasterRgba(renderSvg(encode(url, ecc), style), 400);
          expect(verifyRgba(rgba, width, height, url)).toEqual({ ok: true, decoded: url });
        });
});
