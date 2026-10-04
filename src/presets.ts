import type { Style } from './settings';

/** Named starting points. Every preset must pass tests/presets.test.ts (legible, no warnings). */
export const PRESETS: Record<string, Partial<Style>> = {
  classic: {},
  carriecatt: {
    ecc: 'Q',
    moduleRadius: 0.6,
    eyeRadius: 0.7,
    fillMode: 'linear',
    color1: '#3a1f4d',
    color2: '#6a2c9e',
    gradientAngle: 45,
    eyeColorEnabled: true,
    eyeColor: '#a3238f',
    bgTransparent: false,
    bgColor: '#f6effb',
    margin: 4,
    bgRadius: 0.6,
    exportSize: 2048,
  },
};
