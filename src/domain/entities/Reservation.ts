import { TTL } from '../value-objects/TTL';

export type ReservationStatus = 'ACTIVE' | 'CONFIRMED' | 'EXPIRED';

export class Reservation {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly quantity: number,
    public readonly orderId: string,
    public readonly ttl: TTL,
    public readonly expiresAt: Date,
    public readonly status: ReservationStatus,
    public readonly createdAt: Date,
  ) {}

  get remainingSeconds(): number {
    const remaining = Math.floor((this.expiresAt.getTime() - Date.now()) / 1000);
    return Math.max(0, remaining);
  }

  get isExpired(): boolean {
    return Date.now() >= this.expiresAt.getTime();
  }

  withStatus(status: ReservationStatus): Reservation {
    return new Reservation(
      this.id,
      this.productId,
      this.quantity,
      this.orderId,
      this.ttl,
      this.expiresAt,
      status,
      this.createdAt,
    );
  }
}
