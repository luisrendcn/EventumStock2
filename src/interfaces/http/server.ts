import express from 'express';
import cors from 'cors';
import { Router } from 'express';

export function createServer(
  productsRouter: Router,
  reservationsRouter: Router,
): express.Application {
  const app = express();

  app.use(cors({
    origin: [
      'http://localhost:5173',        // PWA — desarrollo local
      'http://127.0.0.1:5173',
      'https://192.168.20.10:5173',   // PWA — acceso desde iPhone (HTTPS)
      'http://localhost:5174',        // Ecommerce — desarrollo local
      'http://127.0.0.1:5174',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));
  // productsRouter handles GET /api/products and POST /api/scan
  app.use('/api', productsRouter);
  app.use('/api/reservations', reservationsRouter);

  return app;
}
