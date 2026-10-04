import { describe, it, expect } from 'vitest';
import { DICT, setLang, t } from '../src/i18n';

describe('i18n', () => {
  it('es and en define exactly the same keys, none empty', () => {
    expect(Object.keys(DICT.en).sort()).toEqual(Object.keys(DICT.es).sort());
    for (const lang of ['es', 'en'] as const)
      for (const v of Object.values(DICT[lang])) expect(v.trim()).not.toBe('');
  });

  it('interpolates params', () => {
    setLang('es');
    expect(t('physical', { px: 2048, cm: '17.3', dpi: 300 })).toBe('2048 px = 17.3 cm a 300 DPI');
    setLang('en');
    expect(t('physical', { px: 2048, cm: '17.3', dpi: 300 })).toBe('2048 px = 17.3 cm at 300 DPI');
    setLang('es');
  });
});

describe('accessibility labels', () => {
  it('describes the preview with the encoded link in both languages', () => {
    setLang('es');
    expect(t('previewLabel', { text: 'https://a.b' })).toBe('Código QR para https://a.b');
    setLang('en');
    expect(t('previewLabel', { text: 'https://a.b' })).toBe('QR code for https://a.b');
    setLang('es');
  });
});
