import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const conf = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));

describe('tauri.conf.json', () => {
  it('CSP lets the frontend reach Tauri IPC (save dialog, file writes)', () => {
    const csp: string = conf.app.security.csp;
    expect(csp).toMatch(/connect-src[^;]*\bipc:/);
    expect(csp).toMatch(/connect-src[^;]*http:\/\/ipc\.localhost/);
  });
});
