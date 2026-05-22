import { IReservationRepository } from '@domain/ports/IReservationRepository';
import { ReservationExpiredEvent } from '@domain/events/ReservationExpiredEvent';

export interface ExpireReservationsOutput {
  expiredCount: number;
  events: ReservationExpiredEvent[];
}

export class ExpireReservationsUseCase {
  constructor(private readonly reservationRepo: IReservationRepository) {}

  async execute(): Promise<ExpireReservationsOutput> {
    const expired = await this.reservationRepo.findExpired();

    const events: ReservationExpiredEvent[] = [];

    for (const reservation of expired) {
      await this.reservationRepo.markExpired(reservation.id);
      events.push(
        new ReservationExpiredEvent(reservation.id, reservation.productId, reservation.quantity),
      );
    }

    if (expired.length > 0) {
      console.log(`[Scheduler] Expired ${expired.length} reservation(s).`);
    }

    return { expiredCount: expired.length, events };
  }
}
