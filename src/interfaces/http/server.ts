import express from 'express';
import cors from 'cors';
import { Router } from 'express';
import { createServer as createHttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// ─── Origins permitidos (Express CORS + Socket.IO CORS) ──────────────────────
const CORS_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://172.20.10.2:5173',   // PWA — iPhone vía HTTPS
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:5175',         // PWA Docker nginx
];

export interface AppServer {
  app: express.Application;
  io: SocketIOServer;
  httpServer: ReturnType<typeof createHttpServer>;
}

export function createServer(
  productsRouter: Router,
  reservationsRouter: Router,
): AppServer {
  const app = express();

  // ── Express middleware ────────────────────────────────────────────────────
  app.use(cors({
    origin: CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json());

  // ── Rutas ─────────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));
  app.use('/api', productsRouter);
  app.use('/api/reservations', reservationsRouter);

  // ── HTTP server + Socket.IO ───────────────────────────────────────────────
  const httpServer = createHttpServer(app);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: CORS_ORIGINS,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    const ua = socket.handshake.headers['user-agent'] ?? '';
    const isMobile = /iPhone|iPad|Android/i.test(ua);
    console.log(`[WS] + ${socket.id} (${isMobile ? '📱 móvil' : '🖥️  desktop'})`);

    socket.on('disconnect', () => {
      console.log(`[WS] - ${socket.id}`);
    });

    // Alternativa directa: el cliente puede emitir 'barcode:scanned' sin HTTP
    socket.on('barcode:scanned', (data: { barcode: string; deviceId?: string }) => {
      const payload = { barcode: String(data.barcode).trim(), deviceId: data.deviceId ?? socket.id };
      console.log(`[WS] barcode:scanned de ${socket.id} → broadcast: "${payload.barcode}"`);
      socket.broadcast.emit('barcode:scanned', payload);
    });
  });

  // ── POST /api/scan/broadcast ──────────────────────────────────────────────
  // El móvil escanea → llama este endpoint → el backend emite WS a todos los
  // clientes conectados (desktop, otros dispositivos) con el código escaneado.
  app.post('/api/scan/broadcast', (req, res) => {
    const { barcode, deviceId } = req.body as { barcode?: string; deviceId?: string };

    if (!barcode?.trim()) {
      res.status(400).json({ error: 'barcode es requerido' });
      return;
    }

    const payload = {
      barcode: barcode.trim(),
      deviceId: deviceId ?? 'mobile',
    };

    io.emit('barcode:scanned', payload);
    console.log(`[WS] broadcast "${payload.barcode}" → ${io.engine.clientsCount} cliente(s)`);

    res.json({ ok: true, barcode: payload.barcode, recipients: io.engine.clientsCount });
  });

  return { app, io, httpServer };
}
