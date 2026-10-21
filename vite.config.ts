import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  build: { rollupOptions: { input: { main: 'index.html', cubePreview: 'dev/cube-preview.html', cubeEditor: 'dev/cube-editor.html',hollowCube:'dev/hollow-cube.html' } } },
});
