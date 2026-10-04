import type { SvgSize } from './render';
import type { Style } from './settings';

export const PRINT_DPI = 300;

export function physicalSize(px: number, dpi = PRINT_DPI) {
  const inches = px / dpi;
  return { cm: inches * 2.54, mm: inches * 25.4 };
}

export function svgSizeAttrs(s: Style): SvgSize {
  if (s.target === 'print') {
    const mm = `${physicalSize(s.exportSize).mm.toFixed(1)}mm`;
    return { width: mm, height: mm };
  }
  return { width: String(s.exportSize), height: String(s.exportSize) };
}

export function defaultFileName(text: string, kind: 'png' | 'svg'): string {
  try {
    const host = new URL(text).hostname;
    if (host) return `qr-${host}.${kind}`;
  } catch {
    // not a URL
  }
  return `qr.${kind}`;
}

export interface ExportDeps {
  saveDialog(o: { defaultPath: string; filters: { name: string; extensions: string[] }[] }): Promise<string | null>;
  writeBytes(path: string, data: Uint8Array): Promise<void>;
  writeText(path: string, data: string): Promise<void>;
}

export async function exportFile(
  deps: ExportDeps,
  kind: 'png' | 'svg',
  defaultPath: string,
  make: () => Promise<Uint8Array | string>,
): Promise<'saved' | 'cancelled'> {
  const path = await deps.saveDialog({
    defaultPath,
    filters: [{ name: kind.toUpperCase(), extensions: [kind] }],
  });
  if (!path) return 'cancelled';
  const content = await make();
  if (typeof content === 'string') await deps.writeText(path, content);
  else await deps.writeBytes(path, content);
  return 'saved';
}
