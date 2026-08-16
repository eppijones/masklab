import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Every path below is pinned on purpose. Left to its defaults, a Vite server rooted in
// invent/ resolves `cacheDir` and `outDir` against the nearest package.json — and if this
// folder ever loses its own, that is the PARENT's node_modules/.vite and the parent's
// dist/. Both would be writes outside invent/, which this sub-project is not allowed to do.
export default defineConfig({
  root: import.meta.dirname,
  base: './', // so invent/dist/index.html opens from file:// or any static subpath
  cacheDir: '.vite',
  plugins: [react()],
  server: { port: 5273, strictPort: false },
  build: { outDir: 'dist', emptyOutDir: true },
});
