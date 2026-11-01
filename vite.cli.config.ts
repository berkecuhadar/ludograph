import { defineConfig } from 'vite';

// Bundles the command line tool into one file: npm run build:cli
export default defineConfig({
  build: {
    ssr: 'cli/main.ts',
    outDir: 'dist-cli',
    emptyOutDir: true,
    rollupOptions: { output: { entryFileNames: 'ludograph.mjs', banner: '#!/usr/bin/env node' } },
  },
});
