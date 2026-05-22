import { StockLevel, StockLevelError } from '@domain/value-objects/StockLevel';

describe('StockLevel', () => {
  it('calculates available = total - reserved', () => {
    const stock = StockLevel.create(100, 30);
    expect(stock.available).toBe(70);
  });

  it('allows zero available (total === reserved)', () => {
    const stock = StockLevel.create(50, 50);
    expect(stock.available).toBe(0);
  });

  it('throws when available would be negative', () => {
    expect(() => StockLevel.create(10, 20)).toThrow(StockLevelError);
  });

  describe('canReserve()', () => {
    it('returns true when quantity <= available', () => {
      const stock = StockLevel.create(100, 20);
      expect(stock.canReserve(80)).toBe(true);
    });

    it('returns false when quantity > available', () => {
      const stock = StockLevel.create(100, 20);
      expect(stock.canReserve(81)).toBe(false);
    });

    it('returns true for exact match (RN-03 boundary)', () => {
      const stock = StockLevel.create(50, 30);
      expect(stock.canReserve(20)).toBe(true);
    });
  });

  it('zero() creates empty stock', () => {
    expect(StockLevel.zero().available).toBe(0);
  });
});
