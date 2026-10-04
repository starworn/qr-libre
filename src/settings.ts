export type Ecc = 'L' | 'M' | 'Q' | 'H';
export type FillMode = 'solid' | 'linear' | 'radial';
export type Target = 'screen' | 'print';
export type ExportSize = 512 | 1024 | 2048 | 4096;
export type Lang = 'es' | 'en';

export interface Style {
  ecc: Ecc;
  /** 0..1 — share of a module's half-side used as corner radius */
  moduleRadius: number;
  /** 0..1 — 1 turns the eyes into circles */
  eyeRadius: number;
  fillMode: FillMode;
  color1: string;
  color2: string;
  /** degrees, 0 = left→right, 90 = top→bottom */
  gradientAngle: number;
  eyeColorEnabled: boolean;
  eyeColor: string;
  bgTransparent: boolean;
  bgColor: string;
  /** quiet zone, in modules */
  margin: number;
  /** 0..1 — share of the largest radius that never cuts into the code */
  bgRadius: number;
  exportSize: ExportSize;
  target: Target;
}

export interface Settings {
  text: string;
  style: Style;
  lang: Lang;
}

export const LIMITS = {
  moduleRadius: { min: 0, max: 1 },
  eyeRadius: { min: 0, max: 1 },
  margin: { min: 0, max: 8 },
  bgRadius: { min: 0, max: 1 },
  gradientAngle: { min: 0, max: 360 },
} as const;

export const EXPORT_SIZES: readonly ExportSize[] = [512, 1024, 2048, 4096];
const ECCS: readonly Ecc[] = ['L', 'M', 'Q', 'H'];
const FILLS: readonly FillMode[] = ['solid', 'linear', 'radial'];
const TARGETS: readonly Target[] = ['screen', 'print'];
const LANGS: readonly Lang[] = ['es', 'en'];

export const DEFAULT_STYLE: Style = {
  ecc: 'Q',
  moduleRadius: 0,
  eyeRadius: 0,
  fillMode: 'solid',
  color1: '#000000',
  color2: '#5b2a86',
  gradientAngle: 45,
  eyeColorEnabled: false,
  eyeColor: '#000000',
  bgTransparent: false,
  bgColor: '#ffffff',
  margin: 4,
  bgRadius: 0,
  exportSize: 1024,
  target: 'screen',
};

export const DEFAULT_SETTINGS: Settings = { text: '', style: DEFAULT_STYLE, lang: 'es' };

const KEY = 'qr-libre.settings.v1';
const HEX = /^#[0-9a-fA-F]{6}$/;

function num(v: unknown, lim: { min: number; max: number }, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(lim.max, Math.max(lim.min, v)) : fallback;
}
function oneOf<T>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}
function hex(v: unknown, fallback: string): string {
  return typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback;
}
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

export function sanitizeStyle(raw: unknown): Style {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_STYLE;
  return {
    ecc: oneOf(r.ecc, ECCS, d.ecc),
    moduleRadius: num(r.moduleRadius, LIMITS.moduleRadius, d.moduleRadius),
    eyeRadius: num(r.eyeRadius, LIMITS.eyeRadius, d.eyeRadius),
    fillMode: oneOf(r.fillMode, FILLS, d.fillMode),
    color1: hex(r.color1, d.color1),
    color2: hex(r.color2, d.color2),
    gradientAngle: num(r.gradientAngle, LIMITS.gradientAngle, d.gradientAngle),
    eyeColorEnabled: bool(r.eyeColorEnabled, d.eyeColorEnabled),
    eyeColor: hex(r.eyeColor, d.eyeColor),
    bgTransparent: bool(r.bgTransparent, d.bgTransparent),
    bgColor: hex(r.bgColor, d.bgColor),
    margin: Math.round(num(r.margin, LIMITS.margin, d.margin)),
    bgRadius: num(r.bgRadius, LIMITS.bgRadius, d.bgRadius),
    exportSize: oneOf(r.exportSize, EXPORT_SIZES, d.exportSize),
    target: oneOf(r.target, TARGETS, d.target),
  };
}

export function detectLang(locale: string | undefined): Lang {
  return locale?.toLowerCase().startsWith('es') ? 'es' : 'en';
}

/** `firstRunLang` applies only when nothing (valid) is saved yet; a saved language always wins. */
export function loadSettings(
  storage: Pick<Storage, 'getItem'> | null,
  firstRunLang: Lang = DEFAULT_SETTINGS.lang,
): Settings {
  const fresh = (): Settings => ({ ...structuredClone(DEFAULT_SETTINGS), lang: firstRunLang });
  try {
    const raw = storage?.getItem(KEY);
    if (!raw) return fresh();
    const p = JSON.parse(raw) as Record<string, unknown> | null;
    return {
      text: typeof p?.text === 'string' ? p.text : '',
      style: sanitizeStyle(p?.style),
      lang: oneOf(p?.lang, LANGS, firstRunLang),
    };
  } catch {
    return fresh();
  }
}

export function saveSettings(storage: Pick<Storage, 'setItem'> | null, s: Settings): void {
  try {
    storage?.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage blocked or full: settings just won't persist.
  }
}

/** Back to black-on-white; the link and language are the user's, not part of the look. */
export function resetStyle(s: Settings): Settings {
  return { ...s, style: structuredClone(DEFAULT_STYLE) };
}
