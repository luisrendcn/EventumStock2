import { Barcode, BarcodeError } from '@domain/value-objects/Barcode';

describe('Barcode', () => {
  describe('EAN-13', () => {
    it('accepts valid EAN-13', () => {
      // 5901234123457 has valid check digit
      const b = Barcode.create('5901234123457');
      expect(b.value).toBe('5901234123457');
    });

    it('rejects EAN-13 with wrong check digit', () => {
      expect(() => Barcode.create('5901234123450')).toThrow(BarcodeError);
    });
  });

  describe('EAN-8', () => {
    it('accepts any 8-digit string', () => {
      const b = Barcode.create('12345678');
      expect(b.value).toBe('12345678');
    });
  });

  describe('Code128', () => {
    it('accepts alphanumeric printable ASCII', () => {
      const b = Barcode.create('LOT-2024-ABC');
      expect(b.value).toBe('LOT-2024-ABC');
    });

    it('rejects empty string', () => {
      expect(() => Barcode.create('')).toThrow(BarcodeError);
    });

    it('rejects string longer than 48 chars', () => {
      expect(() => Barcode.create('A'.repeat(49))).toThrow(BarcodeError);
    });
  });

  it('trims whitespace before validation', () => {
    const b = Barcode.create('  5901234123457  ');
    expect(b.value).toBe('5901234123457');
  });

  it('equals() compares by value', () => {
    const a = Barcode.create('5901234123457');
    const b = Barcode.create('5901234123457');
    expect(a.equals(b)).toBe(true);
  });
});
