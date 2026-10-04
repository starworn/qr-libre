import { describe, it, expect } from 'vitest';
import jsQR from 'jsqr';
import {
  encode, normalizeText, isEyeModule, eyeOrigins, EmptyInputError, TooLongError, type QrMatrix,
} from '../src/encode';

// Minimal matrix → RGBA rasteriser (4 px per module, 4-module white margin) so encode can be
// tested without depending on render.ts.
function matrixToRgba(m: QrMatrix) {
  const scale = 4, margin = 4, n = (m.size + margin * 2) * scale;
  const px = new Uint8ClampedArray(n * n * 4).fill(255);
  for (let r = 0; r < m.size; r++)
    for (let c = 0; c < m.size; c++)
      if (m.modules[r][c])
        for (let y = 0; y < scale; y++)
          for (let x = 0; x < scale; x++) {
            const i = (((r + margin) * scale + y) * n + (c + margin) * scale + x) * 4;
            px[i] = px[i + 1] = px[i + 2] = 0;
          }
  return { px, n };
}
const decode = (m: QrMatrix) => {
  const { px, n } = matrixToRgba(m);
  const res = jsQR(px, n, n);
  return res ? new TextDecoder().decode(new Uint8Array(res.binaryData)) : null;
};

describe('normalizeText', () => {
  it('trims spaces and newlines from pastes', () => {
    expect(normalizeText('  https://carriecatt.carrd.co\n')).toBe('https://carriecatt.carrd.co');
  });
});

describe('encode', () => {
  it('produces a square matrix of a valid QR size', () => {
    const m = encode('https://carriecatt.carrd.co', 'Q');
    expect(m.modules.length).toBe(m.size);
    expect(m.modules.every((row) => row.length === m.size)).toBe(true);
    expect((m.size - 17) % 4).toBe(0);
  });

  it('round-trips ASCII', () => {
    expect(decode(encode('https://carriecatt.carrd.co', 'M'))).toBe('https://carriecatt.carrd.co');
  });

  it('round-trips non-ASCII as UTF-8', () => {
    const text = 'https://ejemplo.mx/café-ñandú ✓';
    expect(decode(encode(text, 'Q'))).toBe(text);
  });

  it('encodes the trimmed text', () => {
    expect(decode(encode('  https://a.b \n', 'L'))).toBe('https://a.b');
  });

  it('throws EmptyInputError on empty or whitespace input', () => {
    expect(() => encode('', 'Q')).toThrow(EmptyInputError);
    expect(() => encode('   \n', 'Q')).toThrow(EmptyInputError);
  });

  it('throws TooLongError when the text exceeds QR capacity', () => {
    expect(() => encode('x'.repeat(3000), 'H')).toThrow(TooLongError);
  });

  it('higher ECC never yields a smaller symbol', () => {
    const url = 'https://carriecatt.carrd.co';
    expect(encode(url, 'H').size).toBeGreaterThanOrEqual(encode(url, 'L').size);
  });
});

describe('eyes', () => {
  it('locates the three finder patterns', () => {
    expect(eyeOrigins(25)).toEqual([[0, 0], [0, 18], [18, 0]]);
    expect(isEyeModule(25, 0, 0)).toBe(true);
    expect(isEyeModule(25, 6, 24)).toBe(true);
    expect(isEyeModule(25, 24, 6)).toBe(true);
    expect(isEyeModule(25, 7, 7)).toBe(false);
    expect(isEyeModule(25, 24, 24)).toBe(false);
  });

  it('eye regions are dark on their outer ring in a real code', () => {
    const m = encode('https://carriecatt.carrd.co', 'Q');
    for (const [r0, c0] of eyeOrigins(m.size)) {
      expect(m.modules[r0][c0]).toBe(true);
      expect(m.modules[r0 + 1][c0 + 1]).toBe(false);
      expect(m.modules[r0 + 3][c0 + 3]).toBe(true);
    }
  });
});
