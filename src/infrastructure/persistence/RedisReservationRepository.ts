import Redis from 'ioredis';
import { IReservationRepository } from '@domain/ports/IReservationRepository';
import { Reservation, ReservationStatus } from '@domain/entities/Reservation';
import { TTL } from '@domain/value-objects/TTL';

const KEY_RESERVATION = (id: string) => `reservation:${id}`;
const KEY_EXPIRY_ZSET = 'reservations:expiry';
const KEY_PRODUCT_SET = (productId: string) => `product:${productId}:reservations`;

interface StoredReservation {
  id: string;
  productId: string;
  quantity: number;
  orderId: string;
  ttlSeconds: number;
  expiresAt: string;
  status: ReservationStatus;
  createdAt: string;
}

export class RedisReservationRepository implements IReservationRepository {
  constructor(private readonly redis: Redis) {}

  async save(reservation: Reservation): Promise<void> {
    const stored: StoredReservation = {
      id: reservation.id,
      productId: reservation.productId,
      quantity: reservation.quantity,
      orderId: reservation.orderId,
      ttlSeconds: reservation.ttl.seconds,
      expiresAt: reservation.expiresAt.toISOString(),
      status: reservation.status,
      createdAt: reservation.createdAt.toISOString(),
    };

    const expiryScore = reservation.expiresAt.getTime();

    await this.redis
      .multi()
      .set(KEY_RESERVATION(reservation.id), JSON.stringify(stored))
      .zadd(KEY_EXPIRY_ZSET, expiryScore, reservation.id)
      .sadd(KEY_PRODUCT_SET(reservation.productId), reservation.id)
      .exec();
  }

  async findById(id: string): Promise<Reservation | null> {
    const raw = await this.redis.get(KEY_RESERVATION(id));
    if (!raw) return null;
    return this.deserialize(JSON.parse(raw) as StoredReservation);
  }

  async findActiveByProductId(productId: string): Promise<Reservation[]> {
    const ids = await this.redis.smembers(KEY_PRODUCT_SET(productId));
    const reservations = await this.getByIds(ids);
    return reservations.filter(r => r.status === 'ACTIVE' && !r.isExpired);
  }

  async findAllActive(): Promise<Reservation[]> {
    const now = Date.now();
    // All with expiry > now
    const ids = await this.redis.zrangebyscore(KEY_EXPIRY_ZSET, now, '+inf');
    const reservations = await this.getByIds(ids);
    return reservations.filter(r => r.status === 'ACTIVE');
  }

  async findExpired(): Promise<Reservation[]> {
    const now = Date.now();
    const ids = await this.redis.zrangebyscore(KEY_EXPIRY_ZSET, 0, now);
    const reservations = await this.getByIds(ids);
    return reservations.filter(r => r.status === 'ACTIVE');
  }

  async confirm(id: string): Promise<void> {
    await this.updateStatus(id, 'CONFIRMED');
    await this.redis.zrem(KEY_EXPIRY_ZSET, id);
  }

  async markExpired(id: string): Promise<void> {
    const reservation = await this.findById(id);
    if (!reservation) return;

    await this.updateStatus(id, 'EXPIRED');
    await this.redis.zrem(KEY_EXPIRY_ZSET, id);
    await this.redis.srem(KEY_PRODUCT_SET(reservation.productId), id);
  }

  async getTotalReservedQuantity(productId: string): Promise<number> {
    const active = await this.findActiveByProductId(productId);
    return active.reduce((sum, r) => sum + r.quantity, 0);
  }

  private async getByIds(ids: string[]): Promise<Reservation[]> {
    if (ids.length === 0) return [];
    const results: Reservation[] = [];
    for (const id of ids) {
      const raw = await this.redis.get(KEY_RESERVATION(id));
      if (raw) results.push(this.deserialize(JSON.parse(raw) as StoredReservation));
    }
    return results;
  }

  private async updateStatus(id: string, status: ReservationStatus): Promise<void> {
    const raw = await this.redis.get(KEY_RESERVATION(id));
    if (!raw) return;
    const stored = JSON.parse(raw) as StoredReservation;
    stored.status = status;
    await this.redis.set(KEY_RESERVATION(id), JSON.stringify(stored));
  }

  private deserialize(stored: StoredReservation): Reservation {
    return new Reservation(
      stored.id,
      stored.productId,
      stored.quantity,
      stored.orderId,
      TTL.create(stored.ttlSeconds),
      new Date(stored.expiresAt),
      stored.status,
      new Date(stored.createdAt),
    );
  }
}
