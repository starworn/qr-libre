import type { Style } from './settings';

export type ContrastLevel = 'good' | 'ok' | 'low';
export interface ColorReport {
  minContrast: number;
  level: ContrastLevel;
  inverted: boolean;
  printVivid: boolean;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function linear(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Rough "neon" detector: very saturated + very bright colours fall outside typical CMYK gamut. */
export function isVivid(hex: string): boolean {
  const [r, g, b] = rgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const s = max === 0 ? 0 : (max - min) / max;
  return s > 0.85 && max > 0.85;
}

export function analyzeColors(s: Style): ColorReport {
  const darks = [s.color1];
  if (s.fillMode !== 'solid') darks.push(s.color2);
  if (s.eyeColorEnabled) darks.push(s.eyeColor);
  const bg = s.bgTransparent ? '#ffffff' : s.bgColor;

  const minContrast = Math.min(...darks.map((d) => contrastRatio(d, bg)));
  const level: ContrastLevel = minContrast >= 7 ? 'good' : minContrast >= 4 ? 'ok' : 'low';
  const inverted = darks.some((d) => luminance(d) > luminance(bg));
  const printed = s.bgTransparent ? darks : [...darks, bg];
  return { minContrast, level, inverted, printVivid: printed.some(isVivid) };
}
