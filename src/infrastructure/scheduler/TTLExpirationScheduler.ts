import cron from 'node-cron';
import { ExpireReservationsUseCase } from '@app/reservations/ExpireReservationsUseCase';

export class TTLExpirationScheduler {
  private task: cron.ScheduledTask | null = null;

  constructor(private readonly expireReservations: ExpireReservationsUseCase) {}

  start(): void {
    // Cada 30 segundos
    this.task = cron.schedule('*/30 * * * * *', async () => {
      try {
        await this.expireReservations.execute();
      } catch (err) {
        console.error('[Scheduler] Error expiring reservations:', err);
      }
    });
    console.log('[Scheduler] TTL expiration scheduler started (every 30s)');
  }

  stop(): void {
    this.task?.stop();
  }
}
