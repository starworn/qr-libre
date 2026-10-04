import { eyeOrigins, isEyeModule, type QrMatrix } from './encode';
import type { Style } from './settings';

export interface Corners { tl: boolean; tr: boolean; br: boolean; bl: boolean }
export interface SvgSize { width: string; height: string }
interface Radii { tl: number; tr: number; br: number; bl: number }

const f = (n: number) => String(Math.round(n * 1e4) / 1e4);
const all = (r: number): Radii => ({ tl: r, tr: r, br: r, bl: r });

/** A corner is exterior when both orthogonal neighbours touching it are light (eyes count as light). */
export function roundableCorners(m: QrMatrix, row: number, col: number): Corners {
  const light = (r: number, c: number) =>
    r < 0 || c < 0 || r >= m.size || c >= m.size || !m.modules[r][c] || isEyeModule(m.size, r, c);
  const up = light(row - 1, col);
  const down = light(row + 1, col);
  const left = light(row, col - 1);
  const right = light(row, col + 1);
  return { tl: up && left, tr: up && right, br: down && right, bl: down && left };
}

/** Clockwise rectangle with per-corner radii (0 = square corner). */
function rectPath(x: number, y: number, w: number, h: number, k: Radii): string {
  let d = `M${f(x + k.tl)} ${f(y)}H${f(x + w - k.tr)}`;
  if (k.tr) d += `A${f(k.tr)} ${f(k.tr)} 0 0 1 ${f(x + w)} ${f(y + k.tr)}`;
  d += `V${f(y + h - k.br)}`;
  if (k.br) d += `A${f(k.br)} ${f(k.br)} 0 0 1 ${f(x + w - k.br)} ${f(y + h)}`;
  d += `H${f(x + k.bl)}`;
  if (k.bl) d += `A${f(k.bl)} ${f(k.bl)} 0 0 1 ${f(x)} ${f(y + h - k.bl)}`;
  d += `V${f(y + k.tl)}`;
  if (k.tl) d += `A${f(k.tl)} ${f(k.tl)} 0 0 1 ${f(x + k.tl)} ${f(y)}`;
  return d + 'Z';
}

function gradientDefs(m: QrMatrix, s: Style): string {
  const stops = `<stop offset="0" stop-color="${s.color1}"/><stop offset="1" stop-color="${s.color2}"/>`;
  const c = s.margin + m.size / 2;
  if (s.fillMode === 'linear') {
    const a = (s.gradientAngle * Math.PI) / 180;
    const dx = (Math.cos(a) * m.size) / 2;
    const dy = (Math.sin(a) * m.size) / 2;
    return `<linearGradient id="fg" gradientUnits="userSpaceOnUse" x1="${f(c - dx)}" y1="${f(c - dy)}" x2="${f(c + dx)}" y2="${f(c + dy)}">${stops}</linearGradient>`;
  }
  return `<radialGradient id="fg" gradientUnits="userSpaceOnUse" cx="${f(c)}" cy="${f(c)}" r="${f(m.size * Math.SQRT1_2)}">${stops}</radialGradient>`;
}

export function renderSvg(m: QrMatrix, s: Style, size: SvgSize = { width: '512', height: '512' }): string {
  const total = m.size + 2 * s.margin;
  const off = s.margin;
  const parts: string[] = [];

  if (!s.bgTransparent) {
    const rx = s.bgRadius * Math.min(s.margin * 3.4, total / 2);
    parts.push(`<rect width="${total}" height="${total}" rx="${f(rx)}" fill="${s.bgColor}"/>`);
  }

  const gradient = s.fillMode !== 'solid';
  const fill = gradient ? 'url(#fg)' : s.color1;

  const r = s.moduleRadius * 0.5;
  let d = '';
  for (let row = 0; row < m.size; row++) {
    for (let col = 0; col < m.size; col++) {
      if (!m.modules[row][col] || isEyeModule(m.size, row, col)) continue;
      const k = roundableCorners(m, row, col);
      d += rectPath(off + col, off + row, 1, 1, {
        tl: k.tl ? r : 0, tr: k.tr ? r : 0, br: k.br ? r : 0, bl: k.bl ? r : 0,
      });
    }
  }
  parts.push(`<path fill="${fill}" d="${d}"/>`);

  const e = s.eyeRadius;
  let ed = '';
  for (const [er, ec] of eyeOrigins(m.size)) {
    const x = off + ec;
    const y = off + er;
    ed += rectPath(x, y, 7, 7, all(e * 3.5));
    ed += rectPath(x + 1, y + 1, 5, 5, all(e * 2.5));
    ed += rectPath(x + 2, y + 2, 3, 3, all(e * 1.5));
  }
  const eyeFill = s.eyeColorEnabled ? s.eyeColor : fill;
  parts.push(`<path fill="${eyeFill}" fill-rule="evenodd" d="${ed}"/>`);

  const defs = gradient ? `<defs>${gradientDefs(m, s)}</defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${total} ${total}" color-interpolation="sRGB">${defs}${parts.join('')}</svg>`;
}
