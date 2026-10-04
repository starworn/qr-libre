import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encode } from '../src/encode';
import { renderSvg } from '../src/render';
import { verifyRgba } from '../src/verify';
import { applyColorMetadata } from '../src/png-chunks';
import { analyzeColors } from '../src/contrast';
import { PRINT_DPI, svgSizeAttrs } from '../src/export';
import { PRESETS } from '../src/presets';
import { DEFAULT_STYLE, LIMITS, type Style } from '../src/settings';
import { rasterPng, rasterRgba } from '../tests/helpers/raster-node';

const URL = 'https://carriecatt.carrd.co';
const OUT = 'gallery';
const MAX_R = LIMITS.moduleRadius.max;

const CASES: Array<[string, Partial<Style>]> = [
  ...Object.entries(PRESETS).map(([k, v]) => [`preset-${k}`, v] as [string, Partial<Style>]),
  ['round-50', { moduleRadius: 0.5 }],
  ['round-max', { moduleRadius: MAX_R, eyeRadius: LIMITS.eyeRadius.max }],
  ['eyes-only-round', { eyeRadius: 1 }],
  ['linear-0deg', { fillMode: 'linear', color1: '#1a1a2e', color2: '#7b2cbf', gradientAngle: 0 }],
  ['linear-135deg', { fillMode: 'linear', color1: '#0b3d2e', color2: '#1d3557', gradientAngle: 135 }],
  ['radial', { fillMode: 'radial', color1: '#3a1c71', color2: '#0b0b0b', moduleRadius: 0.4 }],
  ['eye-accent', { eyeColorEnabled: true, eyeColor: '#c2185b', moduleRadius: 0.5 }],
  ['soft-pink-bg', { bgColor: '#fde2e4', color1: '#3b1f2b', bgRadius: 1, moduleRadius: 0.5 }],
  ['cyan-bg', { bgColor: '#4aaedb', color1: '#1a0f24' }],
  ['transparent', { bgTransparent: true, moduleRadius: 0.5 }],
  ['margin-0', { margin: 0 }],
  ['margin-2-bgradius', { margin: 2, bgRadius: 1 }],
  ['margin-8', { margin: 8, bgRadius: 1 }],
  ['ecc-L-round-max', { ecc: 'L', moduleRadius: MAX_R, eyeRadius: 1 }],
  ['ecc-H', { ecc: 'H', moduleRadius: 0.5 }],
  ['print-4096', { target: 'print', exportSize: 4096, moduleRadius: 0.5 }],
  ['EXPECT-FAIL-inverted', { color1: '#ffffff', bgColor: '#1a1a2e' }],
  ['EXPECT-FAIL-low-contrast', { color1: '#b8b8b8' }],
  ['neon-print-warning', { target: 'print', bgColor: '#00ffff', color1: '#000000' }],
];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const rows: string[] = [];
for (const [name, patch] of CASES) {
  const s: Style = { ...DEFAULT_STYLE, ...patch };
  const m = encode(URL, s.ecc);
  const px = s.exportSize;
  const png = applyColorMetadata(rasterPng(renderSvg(m, s, { width: String(px), height: String(px) }), px),
    s.target === 'print' ? PRINT_DPI : undefined);
  writeFileSync(join(OUT, `${name}.png`), png);
  writeFileSync(join(OUT, `${name}.svg`), `<?xml version="1.0" encoding="UTF-8"?>\n${renderSvg(m, s, svgSizeAttrs(s))}\n`);
  const { rgba, width, height } = rasterRgba(renderSvg(m, s), 400);
  const v = verifyRgba(rgba, width, height, URL);
  const c = analyzeColors(s);
  rows.push(`<figure class="${v.ok ? 'ok' : 'fail'}"><img src="${name}.png"><figcaption><b>${name}</b><br>${v.ok ? '✓ scans' : '⚠ does not scan'} · contrast ${c.minContrast.toFixed(1)}:1<pre>${JSON.stringify(patch, null, 1)}</pre></figcaption></figure>`);
  console.log(`${v.ok ? 'OK  ' : 'FAIL'} ${name}`);
}

writeFileSync(join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>QR Libre — gallery</title>
<style>body{font-family:system-ui;background:#888;margin:20px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
figure{margin:0;background:#fff;padding:10px;border-radius:10px;border:4px solid #2a7}figure.fail{border-color:#c33}
img{width:100%;background:repeating-conic-gradient(#ddd 0% 25%,#fff 0% 50%) 50%/20px 20px}pre{font-size:11px;white-space:pre-wrap}</style>
<h1>Gallery — ${URL}</h1><main>${rows.join('\n')}</main>`);
console.log(`\n${CASES.length} cases → ${OUT}/index.html`);
const DELIV = join('deliverables', 'carriecatt');
rmSync(DELIV, { recursive: true, force: true });
mkdirSync(DELIV, { recursive: true });
const VERSIONS: Array<[string, Partial<Style>]> = [
  ['qr-carriecatt', {}],
  ['qr-carriecatt-sin-fondo', { bgTransparent: true }],
];
for (const [file, extra] of VERSIONS) {
  const s: Style = { ...DEFAULT_STYLE, ...PRESETS.carriecatt, ...extra };
  const m = encode(URL, s.ecc);
  const px = s.exportSize;
  const { rgba, width, height } = rasterRgba(renderSvg(m, s), 400);
  if (!verifyRgba(rgba, width, height, URL).ok) throw new Error(`${file} does not scan`);
  writeFileSync(join(DELIV, `${file}.png`),
    applyColorMetadata(rasterPng(renderSvg(m, s, { width: String(px), height: String(px) }), px)));
  writeFileSync(join(DELIV, `${file}.svg`),
    `<?xml version="1.0" encoding="UTF-8"?>\n${renderSvg(m, s, svgSizeAttrs(s))}\n`);
}
console.log(`deliverables → ${DELIV}/`);
