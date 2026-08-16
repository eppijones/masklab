import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Every path is pinned deliberately. Left to its defaults, a Vite server rooted
// here resolves cacheDir and outDir against the nearest package.json — and if
// this folder ever loses its own, that is the PARENT's node_modules/.vite and
// the parent's dist/. Both are writes outside invent_v1/.
//
// Note on --host: WebSerial requires a secure context. http://localhost:5473
// qualifies; a LAN IP does not, and navigator.serial silently disappears. Do
// not add --host and then wonder why the Connect button does nothing.
export default defineConfig({
  root: import.meta.dirname,
  base: './',
  cacheDir: '.vite',
  plugins: [react()],
  server: { port: 5473, strictPort: false },
  build: { outDir: 'dist', emptyOutDir: true },
});
