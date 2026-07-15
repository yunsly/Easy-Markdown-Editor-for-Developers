import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL('../dist/webview', import.meta.url)),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: fileURLToPath(new URL('./src/main.ts', import.meta.url)),
      output: {
        entryFileNames: 'main.js',
      },
    },
  },
});
