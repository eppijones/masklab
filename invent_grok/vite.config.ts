import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: import.meta.dirname,
  base: './',
  cacheDir: '.vite',
  plugins: [react()],
  server: { port: 5373, strictPort: false },
  build: { outDir: 'dist', emptyOutDir: true },
});
