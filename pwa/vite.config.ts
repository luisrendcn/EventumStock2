import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    https: {
      key: fs.readFileSync('./192.168.20.10+2-key.pem'),
      cert: fs.readFileSync('./192.168.20.10+2.pem'),
    },
    proxy: {
      '/api': {
        target: 'http://192.168.20.10:3001',
        changeOrigin: true,
      },
    },
  },
});
