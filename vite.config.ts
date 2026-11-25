import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/jevlab/',
  build: {
    rollupOptions: {
      input: {
        home: resolve(process.cwd(), 'index.html'),
        playground: resolve(process.cwd(), 'playground/index.html'),
        learning: resolve(process.cwd(), 'learning-path/index.html'),
        notfound: resolve(process.cwd(), '404.html'),
      },
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
