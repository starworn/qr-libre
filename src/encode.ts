import qrcode from 'qrcode-generator';
import type { Ecc } from './settings';

// qrcode-generator converts strings to Latin-1 bytes by default; use UTF-8 so ñ, é, emoji survive.
qrcode.stringToBytes = (s: string) => Array.from(new TextEncoder().encode(s));

export class EmptyInputError extends Error {}
export class TooLongError extends Error {}

export interface QrMatrix {
  size: number;
  /** modules[row][col], true = dark */
  modules: boolean[][];
}

export function normalizeText(text: string): string {
  return text.trim();
}

export function encode(text: string, ecc: Ecc): QrMatrix {
  const t = normalizeText(text);
  if (!t) throw new EmptyInputError('empty input');
  const qr = qrcode(0, ecc);
  try {
    qr.addData(t, 'Byte');
    qr.make();
  } catch (e) {
    throw new TooLongError(e instanceof Error ? e.message : String(e));
  }
  const size = qr.getModuleCount();
  const modules = Array.from({ length: size }, (_, r) =>
    Array.from({ length: size }, (_, c) => qr.isDark(r, c)),
  );
  return { size, modules };
}

export function eyeOrigins(size: number): Array<[number, number]> {
  return [[0, 0], [0, size - 7], [size - 7, 0]];
}

export function isEyeModule(size: number, row: number, col: number): boolean {
  return eyeOrigins(size).some(([r0, c0]) => row >= r0 && row < r0 + 7 && col >= c0 && col < c0 + 7);
}
