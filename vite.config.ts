
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

const backendPort = 3003;
const frontendPort = 5174;

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build',
  },
  server: {
    port: frontendPort,
    open: true,
    proxy: {
      '/api': {
        target: `http://localhost:3003`,
        changeOrigin: true,
        secure: false, // In development, the certificate might be self-signed
      },
    },
  },
});
