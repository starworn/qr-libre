import type { Lang } from './settings';

const es = {
  content: 'Contenido',
  urlLabel: 'Enlace o texto',
  urlPlaceholder: 'https://tu-sitio.carrd.co',
  ecc: 'Corrección de errores',
  eccL: 'Baja (7 %)',
  eccM: 'Media (15 %)',
  eccQ: 'Alta (25 %) — recomendada',
  eccH: 'Máxima (30 %)',
  shape: 'Forma',
  moduleRadius: 'Redondeo de cuadritos',
  eyeRadius: 'Redondeo de las esquinas grandes',
  color: 'Color',
  fillMode: 'Relleno',
  solid: 'Sólido',
  linear: 'Degradado lineal',
  radial: 'Degradado radial',
  color1: 'Color',
  color2: 'Segundo color',
  angle: 'Ángulo del degradado',
  eyeColor: 'Color propio para las esquinas grandes',
  contrast: 'Contraste',
  contrastGood: 'bueno',
  contrastOk: 'aceptable',
  contrastLow: 'bajo',
  background: 'Fondo',
  transparent: 'Fondo transparente',
  margin: 'Margen',
  bgRadius: 'Redondeo del fondo',
  export: 'Exportar',
  target: 'Destino',
  targetScreen: 'Pantalla / redes',
  targetPrint: 'Impresión',
  targetScreenDesc: 'Colores sRGB, se ven igual en cualquier navegador, celular o editor.',
  targetPrintDesc: 'Colores sRGB (las imprentas los convierten a CMYK) y resolución de 300 DPI guardada en el archivo.',
  size: 'Tamaño',
  physical: '{px} px = {cm} cm a {dpi} DPI',
  savePng: 'Guardar PNG',
  saveSvg: 'Guardar SVG',
  saved: 'Guardado ✓',
  exportError: 'No se pudo guardar: {msg}',
  statusOk: '✓ Se lee correctamente',
  statusFail: '⚠ No se pudo leer — reduce el redondeo o sube el contraste',
  statusChecking: 'Comprobando…',
  statusEmpty: 'Pega un enlace para empezar',
  statusTooLong: 'El texto es demasiado largo para un QR — acórtalo o baja la corrección de errores',
  statusError: '⚠ No se pudo comprobar la lectura',
  warnInverted: 'Los cuadritos son más claros que el fondo: muchos lectores no lo leen.',
  warnLowContrast: 'Contraste bajo: oscurece los cuadritos o aclara el fondo.',
  warnMargin: 'Margen menor a 2: puede fallar si lo pegas sobre algo con dibujo o color.',
  warnTransparent: 'Fondo transparente: pégalo sobre fondos claros.',
  warnVivid: 'Hay colores muy saturados: en papel se verán más apagados.',
  confirmExportTitle: 'Este QR podría no leerse',
  confirmExportMsg: 'La comprobación no logró leer este QR. ¿Guardarlo de todos modos?',
  langToggle: 'English',
} as const;

type Dict = Record<keyof typeof es, string>;

const en: Dict = {
  content: 'Content',
  urlLabel: 'Link or text',
  urlPlaceholder: 'https://your-site.carrd.co',
  ecc: 'Error correction',
  eccL: 'Low (7%)',
  eccM: 'Medium (15%)',
  eccQ: 'High (25%) — recommended',
  eccH: 'Max (30%)',
  shape: 'Shape',
  moduleRadius: 'Module rounding',
  eyeRadius: 'Corner-eye rounding',
  color: 'Colour',
  fillMode: 'Fill',
  solid: 'Solid',
  linear: 'Linear gradient',
  radial: 'Radial gradient',
  color1: 'Colour',
  color2: 'Second colour',
  angle: 'Gradient angle',
  eyeColor: 'Separate colour for the corner eyes',
  contrast: 'Contrast',
  contrastGood: 'good',
  contrastOk: 'acceptable',
  contrastLow: 'low',
  background: 'Background',
  transparent: 'Transparent background',
  margin: 'Margin',
  bgRadius: 'Background rounding',
  export: 'Export',
  target: 'Destination',
  targetScreen: 'Screen / social',
  targetPrint: 'Print',
  targetScreenDesc: 'sRGB colours, look the same in any browser, phone or editor.',
  targetPrintDesc: 'sRGB colours (print shops convert them to CMYK) and 300 DPI stored in the file.',
  size: 'Size',
  physical: '{px} px = {cm} cm at {dpi} DPI',
  savePng: 'Save PNG',
  saveSvg: 'Save SVG',
  saved: 'Saved ✓',
  exportError: 'Could not save: {msg}',
  statusOk: '✓ Scans correctly',
  statusFail: '⚠ Could not be read — reduce rounding or raise contrast',
  statusChecking: 'Checking…',
  statusEmpty: 'Paste a link to start',
  statusTooLong: 'Text is too long for a QR — shorten it or lower error correction',
  statusError: '⚠ Could not check readability',
  warnInverted: 'Modules are lighter than the background: many readers will fail.',
  warnLowContrast: 'Low contrast: darken the modules or lighten the background.',
  warnMargin: 'Margin below 2: may fail on busy or coloured surfaces.',
  warnTransparent: 'Transparent background: place it on light surfaces.',
  warnVivid: 'Some colours are very saturated: they will look duller on paper.',
  confirmExportTitle: 'This QR may not scan',
  confirmExportMsg: 'The check could not read this QR. Save it anyway?',
  langToggle: 'Español',
};

export const DICT: Record<Lang, Dict> = { es, en };
export type Key = keyof Dict;

let lang: Lang = 'es';
export const setLang = (l: Lang) => { lang = l; };
export const getLang = () => lang;

export function t(key: Key, params: Record<string, string | number> = {}): string {
  return DICT[lang][key].replace(/\{(\w+)\}/g, (m, p: string) => (p in params ? String(params[p]) : m));
}

export function applyI18n(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as Key);
  });
  root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder as Key);
  });
  document.documentElement.lang = lang;
}
