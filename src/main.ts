import './style.css';
import { ask, save } from '@tauri-apps/plugin-dialog';
import { writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { encode, normalizeText, TooLongError, type QrMatrix } from './encode';
import { renderSvg } from './render';
import { verifyRgba, type VerifyResult } from './verify';
import { analyzeColors } from './contrast';
import { applyColorMetadata } from './png-chunks';
import { canvasRgba, canvasToPngBytes, svgToCanvas } from './raster';
import { defaultFileName, exportFile, physicalSize, PRINT_DPI, svgSizeAttrs, type ExportDeps } from './export';
import { LIMITS, loadSettings, resetStyle, saveSettings, type ExportSize, type Style } from './settings';
import { applyI18n, setLang, t } from './i18n';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const storage = (() => { try { return window.localStorage; } catch { return null; } })();
const settings = loadSettings(storage);

const deps: ExportDeps = {
  saveDialog: (o) => save(o),
  writeBytes: (p, d) => writeFile(p, d),
  writeText: (p, d) => writeTextFile(p, d),
};

const VERIFY_PX = 512;
let matrix: QrMatrix | null = null;
let lastVerify: VerifyResult | null = null;
let verifyToken = 0;
let verifyTimer: number | undefined;

function setStatus(kind: 'ok' | 'fail' | 'pending' | 'idle', msg: string) {
  const el = $('status');
  el.dataset.kind = kind;
  el.textContent = msg;
}

function setExportEnabled(on: boolean) {
  $<HTMLButtonElement>('savePng').disabled = !on;
  $<HTMLButtonElement>('saveSvg').disabled = !on;
}

function renderWarnings(list: string[]) {
  const ul = $('warnings');
  ul.replaceChildren(...list.map((w) => Object.assign(document.createElement('li'), { textContent: w })));
}

function scheduleVerify(m: QrMatrix, s: Style, text: string) {
  clearTimeout(verifyTimer);
  const token = ++verifyToken;
  verifyTimer = window.setTimeout(async () => {
    let result: VerifyResult;
    try {
      const canvas = await svgToCanvas(renderSvg(m, s, { width: String(VERIFY_PX), height: String(VERIFY_PX) }), VERIFY_PX);
      const { rgba, width, height } = canvasRgba(canvas);
      result = verifyRgba(rgba, width, height, text);
    } catch (err) {
      console.error(err);
      if (token === verifyToken) { lastVerify = { ok: false, decoded: null }; setStatus('fail', t('statusError')); }
      return;
    }
    if (token !== verifyToken) return; // a newer edit superseded this check
    lastVerify = result;
    setStatus(result.ok ? 'ok' : 'fail', t(result.ok ? 'statusOk' : 'statusFail'));
  }, 150);
}

function update() {
  saveSettings(storage, settings);
  const s = settings.style;
  document.body.dataset.fill = s.fillMode;
  $<HTMLInputElement>('eyeColor').disabled = !s.eyeColorEnabled;
  $<HTMLInputElement>('bgColor').disabled = s.bgTransparent;
  $('marginValue').textContent = String(s.margin);
  for (const k of ['moduleRadius', 'eyeRadius', 'bgRadius'] as const) $(`${k}Value`).textContent = `${Math.round(s[k] * 100)} %`;
  $('gradientAngleValue').textContent = `${s.gradientAngle}°`;
  $('targetDesc').textContent = t(s.target === 'print' ? 'targetPrintDesc' : 'targetScreenDesc');
  $('physical').textContent = s.target === 'print'
    ? t('physical', { px: s.exportSize, cm: physicalSize(s.exportSize).cm.toFixed(1), dpi: PRINT_DPI })
    : '';
  $('exportMsg').textContent = '';

  const text = normalizeText(settings.text);
  matrix = null;
  lastVerify = null;
  try {
    matrix = encode(text, s.ecc);
  } catch (e) {
    clearTimeout(verifyTimer);
    verifyToken++;
    $('preview').replaceChildren();
    setStatus(e instanceof TooLongError ? 'fail' : 'idle', t(e instanceof TooLongError ? 'statusTooLong' : 'statusEmpty'));
    setExportEnabled(false);
    renderWarnings([]);
    return;
  }

  $('preview').innerHTML = renderSvg(matrix, s, { width: '100%', height: '100%' });
  setExportEnabled(true);

  const report = analyzeColors(s);
  $<HTMLMeterElement>('contrastMeter').value = report.minContrast;
  const levelKey = report.level === 'good' ? 'contrastGood' : report.level === 'ok' ? 'contrastOk' : 'contrastLow';
  $('contrastValue').textContent = `${report.minContrast.toFixed(1)}:1 · ${t(levelKey)}`;

  const warnings: string[] = [];
  if (report.inverted) warnings.push(t('warnInverted'));
  else if (report.level === 'low') warnings.push(t('warnLowContrast'));
  if (s.margin < 2) warnings.push(t('warnMargin'));
  if (s.bgTransparent) warnings.push(t('warnTransparent'));
  if (s.target === 'print' && report.printVivid) warnings.push(t('warnVivid'));
  renderWarnings(warnings);

  setStatus('pending', t('statusChecking'));
  scheduleVerify(matrix, structuredClone(s), text);
}

async function doExport(kind: 'png' | 'svg') {
  if (!matrix) return;
  const m = matrix;
  const s = structuredClone(settings.style);
  const text = normalizeText(settings.text);
  if (lastVerify?.ok !== true) {
    const go = await ask(t('confirmExportMsg'), { title: t('confirmExportTitle'), kind: 'warning' });
    if (!go) return;
  }
  const make = kind === 'png'
    ? async () => {
        const px = s.exportSize;
        const canvas = await svgToCanvas(renderSvg(m, s, { width: String(px), height: String(px) }), px);
        return applyColorMetadata(await canvasToPngBytes(canvas), s.target === 'print' ? PRINT_DPI : undefined);
      }
    : async () => `<?xml version="1.0" encoding="UTF-8"?>\n${renderSvg(m, s, svgSizeAttrs(s))}\n`;
  try {
    const outcome = await exportFile(deps, kind, defaultFileName(text, kind), make);
    $('exportMsg').textContent = outcome === 'saved' ? t('saved') : '';
  } catch (err) {
    $('exportMsg').textContent = t('exportError', { msg: err instanceof Error ? err.message : String(err) });
  }
}

function bindRangePct(key: 'moduleRadius' | 'eyeRadius' | 'bgRadius') {
  const el = $<HTMLInputElement>(key);
  el.max = String(Math.round(LIMITS[key].max * 100));
  el.value = String(Math.round(settings.style[key] * 100));
  el.addEventListener('input', () => { settings.style[key] = Number(el.value) / 100; update(); });
}
function bindNumber(key: 'gradientAngle' | 'margin') {
  const el = $<HTMLInputElement>(key);
  el.value = String(settings.style[key]);
  el.addEventListener('input', () => { settings.style[key] = Number(el.value); update(); });
}
function bindColor(key: 'color1' | 'color2' | 'eyeColor' | 'bgColor') {
  const el = $<HTMLInputElement>(key);
  el.value = settings.style[key];
  el.addEventListener('input', () => { settings.style[key] = el.value.toLowerCase(); update(); });
}
function bindCheck(key: 'eyeColorEnabled' | 'bgTransparent') {
  const el = $<HTMLInputElement>(key);
  el.checked = settings.style[key];
  el.addEventListener('change', () => { settings.style[key] = el.checked; update(); });
}
function bindSelect<K extends 'ecc' | 'fillMode' | 'target'>(key: K) {
  const el = $<HTMLSelectElement>(key);
  el.value = settings.style[key];
  el.addEventListener('change', () => { settings.style[key] = el.value as Style[K]; update(); });
}

function init() {
  setLang(settings.lang);
  applyI18n();

  const text = $<HTMLInputElement>('text');
  text.value = settings.text;
  text.addEventListener('input', () => { settings.text = text.value; update(); });

  bindSelect('ecc');
  bindRangePct('moduleRadius');
  bindRangePct('eyeRadius');
  bindRangePct('bgRadius');
  bindSelect('fillMode');
  bindColor('color1');
  bindColor('color2');
  bindNumber('gradientAngle');
  bindCheck('eyeColorEnabled');
  bindColor('eyeColor');
  bindCheck('bgTransparent');
  bindColor('bgColor');
  bindNumber('margin');
  bindSelect('target');

  const size = $<HTMLSelectElement>('exportSize');
  size.value = String(settings.style.exportSize);
  size.addEventListener('change', () => { settings.style.exportSize = Number(size.value) as ExportSize; update(); });

  $('lang').addEventListener('click', () => {
    settings.lang = settings.lang === 'es' ? 'en' : 'es';
    setLang(settings.lang);
    applyI18n();
    update();
  });
  $('reset').addEventListener('click', async () => {
    const go = await ask(t('confirmResetMsg'), { title: t('confirmResetTitle'), kind: 'warning' });
    if (!go) return;
    saveSettings(storage, resetStyle(settings));
    location.reload(); // controls initialise from storage, so a reload re-syncs every input
  });
  $('savePng').addEventListener('click', () => void doExport('png'));
  $('saveSvg').addEventListener('click', () => void doExport('svg'));

  update();
  text.focus();
}

init();
