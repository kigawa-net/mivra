import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@mivra/domain': path.resolve(__dirname, 'packages/domain/src/index.ts'),
      '@mivra/database': path.resolve(__dirname, 'packages/database/src/index.ts'),
      '@mivra/auth': path.resolve(__dirname, 'packages/auth/src/index.ts'),
      '@mivra/storage': path.resolve(__dirname, 'packages/storage/src/index.ts'),
      '@mivra/api': path.resolve(__dirname, 'packages/api/src/index.ts'),
      '@mivra/mail': path.resolve(__dirname, 'packages/mail/src/index.ts'),
      '@mivra/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'apps/*/src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '.wrangler/'],
    },
  },
});
