import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Round-trip tests rasterise and decode; on busy or slow CI machines 5 s per test is too tight.
  test: { environment: 'node', include: ['tests/**/*.test.ts'], testTimeout: 20_000 },
});
