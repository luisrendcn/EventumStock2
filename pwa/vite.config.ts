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
      // API REST
      '/api': {
        target: 'http://192.168.20.10:3001',
        changeOrigin: true,
      },
      // Socket.IO — HTTP polling + WebSocket upgrade
      '/socket.io': {
        target: 'http://192.168.20.10:3001',
        changeOrigin: true,
        ws: true,          // habilita el upgrade a WebSocket
      },
    },
  },
});
