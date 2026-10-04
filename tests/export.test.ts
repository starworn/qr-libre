import { describe, it, expect, vi } from 'vitest';
import { defaultFileName, exportFile, physicalSize, svgSizeAttrs, type ExportDeps } from '../src/export';
import { DEFAULT_STYLE } from '../src/settings';

const fakeDeps = (path: string | null) => ({
  saveDialog: vi.fn(async () => path),
  writeBytes: vi.fn(async () => {}),
  writeText: vi.fn(async () => {}),
}) satisfies ExportDeps;

describe('physicalSize', () => {
  it('2048 px at 300 DPI ≈ 17.3 cm', () => {
    expect(physicalSize(2048).cm).toBeCloseTo(17.34, 2);
    expect(physicalSize(300).mm).toBeCloseTo(25.4, 5);
  });
});

describe('svgSizeAttrs', () => {
  it('screen → pixels, print → millimetres', () => {
    expect(svgSizeAttrs({ ...DEFAULT_STYLE, exportSize: 1024 })).toEqual({ width: '1024', height: '1024' });
    expect(svgSizeAttrs({ ...DEFAULT_STYLE, exportSize: 1024, target: 'print' })).toEqual({ width: '86.7mm', height: '86.7mm' });
  });
});

describe('defaultFileName', () => {
  it('uses the hostname of URLs', () => {
    expect(defaultFileName('https://carriecatt.carrd.co/#links', 'png')).toBe('qr-carriecatt.carrd.co.png');
  });
  it('falls back to qr.<ext> for plain text', () => {
    expect(defaultFileName('hola mundo', 'svg')).toBe('qr.svg');
  });
});

describe('exportFile', () => {
  it('cancelled dialog: no content generated, nothing written', async () => {
    const deps = fakeDeps(null);
    const make = vi.fn(async () => new Uint8Array([1]));
    expect(await exportFile(deps, 'png', 'qr.png', make)).toBe('cancelled');
    expect(make).not.toHaveBeenCalled();
    expect(deps.writeBytes).not.toHaveBeenCalled();
  });

  it('writes bytes for PNG and text for SVG at the chosen path', async () => {
    const deps = fakeDeps('C:\\Users\\c\\qr.png');
    expect(await exportFile(deps, 'png', 'qr.png', async () => new Uint8Array([7]))).toBe('saved');
    expect(deps.writeBytes).toHaveBeenCalledWith('C:\\Users\\c\\qr.png', new Uint8Array([7]));

    const deps2 = fakeDeps('/tmp/qr.svg');
    await exportFile(deps2, 'svg', 'qr.svg', async () => '<svg/>');
    expect(deps2.writeText).toHaveBeenCalledWith('/tmp/qr.svg', '<svg/>');
  });

  it('passes the default name and a filter for the format', async () => {
    const deps = fakeDeps(null);
    await exportFile(deps, 'svg', 'qr-x.svg', async () => '');
    expect(deps.saveDialog).toHaveBeenCalledWith({
      defaultPath: 'qr-x.svg', filters: [{ name: 'SVG', extensions: ['svg'] }],
    });
  });

  it('propagates write errors to the caller', async () => {
    const deps = fakeDeps('/x.png');
    deps.writeBytes.mockRejectedValueOnce(new Error('disk full'));
    await expect(exportFile(deps, 'png', 'x.png', async () => new Uint8Array())).rejects.toThrow('disk full');
  });
});
