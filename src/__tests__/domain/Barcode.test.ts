import { Barcode, BarcodeError } from '@domain/value-objects/Barcode';

describe('Barcode', () => {

  describe('regla principal: solo dígitos, longitud libre', () => {
    it('acepta 1 dígito', () => {
      expect(Barcode.create('0').value).toBe('0');
    });

    it('acepta EAN-8 (8 dígitos)', () => {
      expect(Barcode.create('12345678').value).toBe('12345678');
    });

    it('acepta EAN-13 (13 dígitos)', () => {
      expect(Barcode.create('5901234123457').value).toBe('5901234123457');
    });

    it('acepta EAN-13 con check digit no estándar', () => {
      expect(Barcode.create('5901234123450').value).toBe('5901234123450');
    });

    it('acepta cadenas numéricas largas (> 13 dígitos)', () => {
      expect(Barcode.create('12345678901234567890').value).toBe('12345678901234567890');
    });

    it('acepta cadenas numéricas cortas (< 8 dígitos)', () => {
      expect(Barcode.create('123').value).toBe('123');
    });
  });

  describe('rechazo de entradas inválidas', () => {
    it('rechaza string vacío', () => {
      expect(() => Barcode.create('')).toThrow(BarcodeError);
    });

    it('rechaza string con letras', () => {
      expect(() => Barcode.create('LOT-2024-ABC')).toThrow(BarcodeError);
    });

    it('rechaza string alfanumérico', () => {
      expect(() => Barcode.create('ABC123')).toThrow(BarcodeError);
    });

    it('rechaza string con guiones', () => {
      expect(() => Barcode.create('123-456')).toThrow(BarcodeError);
    });

    it('rechaza string con espacios internos', () => {
      expect(() => Barcode.create('123 456')).toThrow(BarcodeError);
    });

    it('rechaza string solo de letras', () => {
      expect(() => Barcode.create('ABCDEF')).toThrow(BarcodeError);
    });
  });

  describe('sanitización de entrada (escáner real)', () => {
    it('hace trim de espacios en extremos', () => {
      expect(Barcode.create('  5901234123457  ').value).toBe('5901234123457');
    });

    it('elimina caracteres de control (< 0x20) antes de validar', () => {
      // QuaggaJS puede añadir FNC1 (0x1D) al decodificar Code128 GS1
      expect(Barcode.create('\x1D5901234123457').value).toBe('5901234123457');
    });

    it('elimina múltiples caracteres de control', () => {
      expect(Barcode.create('\x00\x0B12345678\x1D').value).toBe('12345678');
    });
  });

  describe('isValidEANCheckDigit() — utilidad independiente', () => {
    it('EAN-13 con check digit correcto → true', () => {
      expect(Barcode.isValidEANCheckDigit('5901234123457')).toBe(true);
    });

    it('EAN-13 con check digit incorrecto → false', () => {
      expect(Barcode.isValidEANCheckDigit('5901234123450')).toBe(false);
    });

    it('EAN-8 con check digit correcto → true', () => {
      expect(Barcode.isValidEANCheckDigit('40170725')).toBe(true);
    });

    it('string no EAN-8/13 → false', () => {
      expect(Barcode.isValidEANCheckDigit('123')).toBe(false);
    });
  });

  describe('equals()', () => {
    it('mismo valor → true', () => {
      const a = Barcode.create('5901234123457');
      const b = Barcode.create('5901234123457');
      expect(a.equals(b)).toBe(true);
    });

    it('distinto valor → false', () => {
      const a = Barcode.create('5901234123457');
      const b = Barcode.create('12345678');
      expect(a.equals(b)).toBe(false);
    });
  });
});
