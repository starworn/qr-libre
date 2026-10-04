import jsQR from 'jsqr';

export interface VerifyResult {
  ok: boolean;
  decoded: string | null;
}

/** rgba: non-premultiplied RGBA (canvas getImageData layout). */
export function verifyRgba(
  rgba: Uint8Array | Uint8ClampedArray, width: number, height: number, expected: string,
): VerifyResult {
  // Transparent exports are meant for light surfaces, so judge them on white.
  const px = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    const a = rgba[i + 3] / 255;
    px[i] = rgba[i] * a + 255 * (1 - a);
    px[i + 1] = rgba[i + 1] * a + 255 * (1 - a);
    px[i + 2] = rgba[i + 2] * a + 255 * (1 - a);
    px[i + 3] = 255;
  }
  // Not every phone reader handles inverted codes, so don't let the check be more lenient than them.
  const res = jsQR(px, width, height, { inversionAttempts: 'dontInvert' });
  const decoded = res ? new TextDecoder().decode(new Uint8Array(res.binaryData)) : null;
  return { ok: decoded === expected, decoded };
}

/**
 * Raster size for the in-app check: 512 px is plenty for normal links, but dense codes (long text)
 * need ~5 px per module to decode. Never exceed the export size — if it doesn't read there, the
 * exported file won't either.
 */
export function verifyPixelSize(modules: number, margin: number, exportSize: number): number {
  return Math.min(exportSize, Math.max(512, (modules + 2 * margin) * 5));
}
