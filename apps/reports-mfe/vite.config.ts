import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { federation } from '@module-federation/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'reports',
      filename: 'remoteEntry.js',
      exposes: {
        './Reports': './src/vite/App.tsx',
      },
      shared: ['react', 'react-dom'],
    }),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },

  server: {
    port: 5002,
    cors: true,
  },

  build: {
    target: 'es2020',
    sourcemap: true,
    minify: 'terser',
  },
});
