import express from 'express';
import cors from 'cors';
import { Router } from 'express';

export function createServer(
  productsRouter: Router,
  reservationsRouter: Router,
): express.Application {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));
  // productsRouter handles GET /api/products and POST /api/scan
  app.use('/api', productsRouter);
  app.use('/api/reservations', reservationsRouter);

  return app;
}
