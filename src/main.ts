import 'dotenv/config';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { buildContainer } from './container';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://sgi_user:sgi_pass@localhost:5432/sgi_db';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

async function main() {
  const pgPool = new Pool({ connectionString: DATABASE_URL });
  const redisClient = new Redis(REDIS_URL);

  redisClient.on('error', (err) => console.error('[Redis] Error:', err));

  // Verify connections
  await pgPool.query('SELECT 1');
  console.log('[PostgreSQL] Connected');
  await redisClient.ping();
  console.log('[Redis] Connected');

  const { httpServer, scheduler } = buildContainer(pgPool, redisClient);

  scheduler.start();

  // httpServer (http.Server con Socket.IO adjunto) en lugar de app.listen
  httpServer.listen(PORT, () => {
    console.log(`[EventumStock] Server running on http://localhost:${PORT}`);
    console.log(`[EventumStock] Health: http://localhost:${PORT}/health`);
    console.log(`[EventumStock] WebSocket: ws://localhost:${PORT}`);
  });

  const shutdown = async () => {
    scheduler.stop();
    httpServer.close();
    await pgPool.end();
    redisClient.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch(err => {
  console.error('[EventumStock] Fatal error:', err);
  process.exit(1);
});
