import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SETTINGS, DEFAULT_STYLE, LIMITS, loadSettings, resetStyle, saveSettings, sanitizeStyle,
} from '../src/settings';

const mem = (init: Record<string, string> = {}) => {
  const data = { ...init };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
  };
};

describe('settings', () => {
  it('defaults: ECC Q, margin 4, opaque white bg, screen target, Spanish', () => {
    expect(DEFAULT_STYLE.ecc).toBe('Q');
    expect(DEFAULT_STYLE.margin).toBe(4);
    expect(DEFAULT_STYLE.bgTransparent).toBe(false);
    expect(DEFAULT_STYLE.target).toBe('screen');
    expect(DEFAULT_SETTINGS.lang).toBe('es');
  });

  it('round-trips through storage', () => {
    const s = mem();
    const custom = { ...DEFAULT_SETTINGS, text: 'https://x.y', style: { ...DEFAULT_STYLE, moduleRadius: 0.5 } };
    saveSettings(s, custom);
    expect(loadSettings(s)).toEqual(custom);
  });

  it('falls back to defaults on missing, corrupt or null storage', () => {
    expect(loadSettings(mem())).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(mem({ 'qr-libre.settings.v1': '{not json' }))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('survives storage that throws', () => {
    const throwing = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
    expect(loadSettings(throwing)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(throwing, DEFAULT_SETTINGS)).not.toThrow();
  });

  it('clamps out-of-range numbers and rejects bad enums/colours', () => {
    const s = sanitizeStyle({
      moduleRadius: 5, eyeRadius: -1, margin: 99, bgRadius: 'x', gradientAngle: 720,
      ecc: 'Z', fillMode: 'plaid', target: 'moon', exportSize: 999,
      color1: 'red', color2: '#ABCDEF', bgTransparent: 'yes',
    });
    expect(s.moduleRadius).toBe(LIMITS.moduleRadius.max);
    expect(s.eyeRadius).toBe(LIMITS.eyeRadius.min);
    expect(s.margin).toBe(LIMITS.margin.max);
    expect(s.bgRadius).toBe(DEFAULT_STYLE.bgRadius);
    expect(s.gradientAngle).toBe(LIMITS.gradientAngle.max);
    expect(s.ecc).toBe('Q');
    expect(s.fillMode).toBe('solid');
    expect(s.target).toBe('screen');
    expect(s.exportSize).toBe(1024);
    expect(s.color1).toBe(DEFAULT_STYLE.color1);
    expect(s.color2).toBe('#abcdef');
    expect(s.bgTransparent).toBe(false);
  });

  it('rounds margin to whole modules', () => {
    expect(sanitizeStyle({ margin: 2.6 }).margin).toBe(3);
  });

  it('fills in fields missing from older saved versions', () => {
    const s = mem({ 'qr-libre.settings.v1': JSON.stringify({ text: 'a', style: { margin: 2 } }) });
    const loaded = loadSettings(s);
    expect(loaded.style).toEqual({ ...DEFAULT_STYLE, margin: 2 });
    expect(loaded.lang).toBe('es');
  });
});

describe('resetStyle', () => {
  it('restores the default style but keeps the text and language', () => {
    const custom = {
      text: 'https://carriecatt.carrd.co',
      lang: 'en' as const,
      style: { ...DEFAULT_STYLE, moduleRadius: 0.6, fillMode: 'linear' as const, bgColor: '#f6effb' },
    };
    const r = resetStyle(custom);
    expect(r).toEqual({ text: 'https://carriecatt.carrd.co', lang: 'en', style: DEFAULT_STYLE });
    expect(r.style).not.toBe(DEFAULT_STYLE); // a copy, so later edits never mutate the defaults
  });
});
