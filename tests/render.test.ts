import { describe, it, expect } from 'vitest';
import { roundableCorners, renderSvg } from '../src/render';
import { encode, type QrMatrix } from '../src/encode';
import { DEFAULT_STYLE, type Style } from '../src/settings';

// 21x21 toy matrix (not a real QR) for corner logic; shapes sit around (10,10), outside all three eye regions.
function toy(dark: Array<[number, number]>): QrMatrix {
  const size = 21;
  const modules = Array.from({ length: size }, () => Array(size).fill(false));
  for (const [r, c] of dark) modules[r][c] = true;
  return { size, modules };
}
const st = (p: Partial<Style> = {}): Style => ({ ...DEFAULT_STYLE, ...p });

describe('roundableCorners', () => {
  it('isolated module: all four corners exterior', () => {
    expect(roundableCorners(toy([[10, 10]]), 10, 10)).toEqual({ tl: true, tr: true, br: true, bl: true });
  });
  it('horizontal pair: shared side stays square', () => {
    const m = toy([[10, 10], [10, 11]]);
    expect(roundableCorners(m, 10, 10)).toEqual({ tl: true, tr: false, br: false, bl: true });
    expect(roundableCorners(m, 10, 11)).toEqual({ tl: false, tr: true, br: true, bl: false });
  });
  it('L shape: elbow keeps only its truly exterior corner', () => {
    const m = toy([[10, 10], [10, 11], [11, 10]]);
    expect(roundableCorners(m, 10, 10)).toEqual({ tl: true, tr: false, br: false, bl: false });
  });
});

describe('renderSvg', () => {
  const m = encode('https://carriecatt.carrd.co', 'Q');

  it('uses a module-unit viewBox including the margin', () => {
    const svg = renderSvg(m, st({ margin: 4 }));
    const total = m.size + 8;
    expect(svg).toContain(`viewBox="0 0 ${total} ${total}"`);
    expect(svg).toContain('width="512"');
  });

  it('honours custom width/height attributes', () => {
    const svg = renderSvg(m, st(), { width: '86.7mm', height: '86.7mm' });
    expect(svg).toContain('width="86.7mm"');
  });

  it('draws a background rect only when opaque', () => {
    expect(renderSvg(m, st())).toMatch(/<rect [^>]*fill="#ffffff"/);
    expect(renderSvg(m, st({ bgTransparent: true }))).not.toContain('<rect');
  });

  it('background radius never exceeds what the margin allows', () => {
    const svg = renderSvg(m, st({ margin: 0, bgRadius: 1 }));
    expect(svg).toMatch(/rx="0"/);
  });

  it('solid fill uses colour directly, no gradient defs', () => {
    const svg = renderSvg(m, st({ color1: '#123456' }));
    expect(svg).toContain('fill="#123456"');
    expect(svg).not.toContain('Gradient');
  });

  it('linear and radial gradients are defined and referenced', () => {
    expect(renderSvg(m, st({ fillMode: 'linear' }))).toMatch(/<linearGradient id="fg"[\s\S]*url\(#fg\)/);
    expect(renderSvg(m, st({ fillMode: 'radial' }))).toMatch(/<radialGradient id="fg"[\s\S]*url\(#fg\)/);
  });

  it('eye colour overrides the fill only for eyes', () => {
    const svg = renderSvg(m, st({ fillMode: 'linear', eyeColorEnabled: true, eyeColor: '#aa0077' }));
    expect(svg).toMatch(/<path fill="url\(#fg\)" d=/);
    expect(svg).toMatch(/<path fill="#aa0077" fill-rule="evenodd"/);
  });

  it('square style emits no arcs; rounded style does', () => {
    expect(renderSvg(m, st({ moduleRadius: 0, eyeRadius: 0 }))).not.toMatch(/A[\d.]/);
    expect(renderSvg(m, st({ moduleRadius: 1 }))).toMatch(/A0\.5 0\.5/);
  });

  it('is deterministic', () => {
    expect(renderSvg(m, st({ moduleRadius: 0.4 }))).toBe(renderSvg(m, st({ moduleRadius: 0.4 })));
  });
});
