import { Resvg } from '@resvg/resvg-js';

/** RGBA pixels rendered over opaque white, so alpha handling is unambiguous. */
export function rasterRgba(svg: string, px: number) {
  const img = new Resvg(svg, { fitTo: { mode: 'width', value: px }, background: '#ffffff' }).render();
  return { rgba: new Uint8Array(img.pixels), width: img.width, height: img.height };
}

/** PNG bytes with transparency preserved. */
export function rasterPng(svg: string, px: number): Uint8Array {
  return new Uint8Array(new Resvg(svg, { fitTo: { mode: 'width', value: px } }).render().asPng());
}
