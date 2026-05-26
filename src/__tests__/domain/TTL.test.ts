import { TTL, TTLError } from '@domain/value-objects/TTL';

describe('TTL', () => {
  it('creates with default value (900s)', () => {
    const ttl = TTL.create();
    expect(ttl.seconds).toBe(900);
  });

  it('accepts min boundary (120s)', () => {
    expect(TTL.create(120).seconds).toBe(120);
  });

  it('accepts max boundary (86400s)', () => {
    expect(TTL.create(86400).seconds).toBe(86400);
  });

  it('rejects below minimum', () => {
    expect(() => TTL.create(119)).toThrow(TTLError);
    expect(() => TTL.create(0)).toThrow(TTLError);
  });

  it('rejects non integer values', () => {
    expect(() => TTL.create(120.5)).toThrow(TTLError);
    expect(() => TTL.create(Number.NaN)).toThrow(TTLError);
    expect(() => TTL.create(Number.POSITIVE_INFINITY)).toThrow(TTLError);
  });

  it('rejects above maximum', () => {
    expect(() => TTL.create(86401)).toThrow(TTLError);
  });

  it('expiresAt adds seconds to date', () => {
    const ttl = TTL.create(600);
    const from = new Date('2026-01-01T00:00:00Z');
    const expires = ttl.expiresAt(from);
    expect(expires.toISOString()).toBe('2026-01-01T00:10:00.000Z');
  });
});
