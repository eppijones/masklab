import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ root: import.meta.dirname, base: './', plugins: [react()],
  cacheDir: '.vite', server: { host: '127.0.0.1', port: 5573, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true } });
