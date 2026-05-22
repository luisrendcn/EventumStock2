import { Reservation } from '@domain/entities/Reservation';
import { TTL } from '@domain/value-objects/TTL';

function makeReservation() {
  const ttl = TTL.create(300);
  const now = new Date();
  const expiresAt = ttl.expiresAt(now);
  return new Reservation('res-1', 'prod-1', 10, 'ORD-001', ttl, expiresAt, 'ACTIVE', now);
}

describe('Reservation', () => {
  it('remainingSeconds returns positive value for future expiry', () => {
    const r = makeReservation();
    expect(r.remainingSeconds).toBeGreaterThan(0);
    expect(r.remainingSeconds).toBeLessThanOrEqual(300);
  });

  it('isExpired returns false for fresh reservation', () => {
    const r = makeReservation();
    expect(r.isExpired).toBe(false);
  });

  it('isExpired returns true for past expiry', () => {
    const pastExpiry = new Date(Date.now() - 1000);
    const ttl = TTL.create(300);
    const r = new Reservation('res-2', 'prod-1', 5, 'ORD-002', ttl, pastExpiry, 'ACTIVE', new Date());
    expect(r.isExpired).toBe(true);
    expect(r.remainingSeconds).toBe(0);
  });

  it('withStatus returns new instance with updated status', () => {
    const r = makeReservation();
    const confirmed = r.withStatus('CONFIRMED');
    expect(confirmed.status).toBe('CONFIRMED');
    expect(r.status).toBe('ACTIVE'); // original unchanged
    expect(confirmed.id).toBe(r.id);
  });
});
