import { Barcode, BarcodeError } from '@domain/value-objects/Barcode';

describe('Barcode', () => {
  describe('EAN-13', () => {
    it('accepts valid EAN-13', () => {
      const b = Barcode.create('5901234123457');
      expect(b.value).toBe('5901234123457');
    });

    it('accepts EAN-13 with non-standard check digit (permissive scanner mode)', () => {
      // Check digit 0 es incorrecto para este código, pero create() ya no lo verifica
      // para garantizar compatibilidad con escáneres reales que devuelven variaciones.
      const b = Barcode.create('5901234123450');
      expect(b.value).toBe('5901234123450');
    });

    it('isValidEANCheckDigit() distingue correcto de incorrecto', () => {
      expect(Barcode.isValidEANCheckDigit('5901234123457')).toBe(true);
      expect(Barcode.isValidEANCheckDigit('5901234123450')).toBe(false);
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

  describe('sanitización de entrada (escáner real)', () => {
    it('trims whitespace before validation', () => {
      const b = Barcode.create('  5901234123457  ');
      expect(b.value).toBe('5901234123457');
    });

    it('strips control characters (< 0x20) before validation', () => {
      // QuaggaJS puede añadir FNC1 (0x1D), GS (0x1D) u otros caracteres de función
      // al decodificar Code128 GS1. Se eliminan antes de validar.
      const b = Barcode.create('\x1D5901234123457');
      expect(b.value).toBe('5901234123457');
    });

    it('strips multiple control characters and still validates as Code128', () => {
      const b = Barcode.create('\x0BLOT-2024\x1D');
      expect(b.value).toBe('LOT-2024');
    });
  });

  it('equals() compares by value', () => {
    const a = Barcode.create('5901234123457');
    const b = Barcode.create('5901234123457');
    expect(a.equals(b)).toBe(true);
  });
});
