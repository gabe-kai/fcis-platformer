import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/** Logs build start, completion, and failure in a format consistent with app logger. */
function buildLogPlugin(): import('vite').Plugin {
  let startTime = 0;
  const ctx = { component: 'Build', operation: '' };
  const format = (level: string, message: string, data?: object) => {
    const ts = new Date().toISOString();
    const extra = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${ts}] [${level}] [${ctx.component}] ${message}${extra}`;
  };
  return {
    name: 'build-log',
    buildStart() {
      startTime = Date.now();
      console.info(format('INFO', 'Build started'));
    },
    buildEnd(err) {
      const durationMs = Date.now() - startTime;
      if (err) {
        console.error(format('ERROR', 'Build failed', { error: err.message, durationMs }));
      } else {
        console.info(format('INFO', 'Build finished', { durationMs }));
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [buildLogPlugin(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
