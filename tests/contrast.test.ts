import { describe, it, expect } from 'vitest';
import { analyzeColors, contrastRatio, isVivid, luminance } from '../src/contrast';
import { DEFAULT_STYLE, type Style } from '../src/settings';

const st = (p: Partial<Style>): Style => ({ ...DEFAULT_STYLE, ...p });

describe('contrast math', () => {
  it('matches WCAG reference values', () => {
    expect(luminance('#000000')).toBe(0);
    expect(luminance('#ffffff')).toBe(1);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });

  it('flags vivid colours only', () => {
    expect(isVivid('#00ff00')).toBe(true);
    expect(isVivid('#ff00ff')).toBe(true);
    expect(isVivid('#3a1f4d')).toBe(false);
    expect(isVivid('#f6effb')).toBe(false);
  });
});

describe('analyzeColors', () => {
  it('black on white is good, not inverted', () => {
    expect(analyzeColors(st({}))).toMatchObject({ level: 'good', inverted: false });
  });

  it('uses the worst dark colour (gradient end, eye colour)', () => {
    const r = analyzeColors(st({ fillMode: 'linear', color1: '#000000', color2: '#999999' }));
    expect(r.minContrast).toBeCloseTo(contrastRatio('#999999', '#ffffff'), 5);
    expect(r.level).toBe('low');
    expect(analyzeColors(st({ eyeColorEnabled: true, eyeColor: '#bbbbbb' })).level).toBe('low');
  });

  it('ignores color2 when the fill is solid and eye colour when disabled', () => {
    const r = analyzeColors(st({ color2: '#ffffff', eyeColor: '#ffffff' }));
    expect(r.level).toBe('good');
  });

  it('detects light-on-dark (inverted)', () => {
    expect(analyzeColors(st({ color1: '#ffffff', bgColor: '#000000' })).inverted).toBe(true);
  });

  it('judges transparent backgrounds against white', () => {
    const r = analyzeColors(st({ bgTransparent: true, bgColor: '#000000' }));
    expect(r.inverted).toBe(false);
    expect(r.level).toBe('good');
  });

  it('flags vivid colours for print, including an opaque background', () => {
    expect(analyzeColors(st({ bgColor: '#00ffff' })).printVivid).toBe(true);
    expect(analyzeColors(st({ bgTransparent: true, bgColor: '#00ffff' })).printVivid).toBe(false);
  });
});
