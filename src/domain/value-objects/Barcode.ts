export class BarcodeError extends Error {
  constructor(value: string) {
    super(`Invalid barcode: "${value}". Must be EAN-13 (13 digits), EAN-8 (8 digits), or Code128 (printable ASCII 1-48 chars).`);
    this.name = 'BarcodeError';
  }
}

export class Barcode {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /** Valida formato y check digit EAN-13. Usar en boundaries de entrada (HTTP, scanner). */
  static create(raw: string): Barcode {
    const trimmed = raw.trim();
    if (!Barcode.isValid(trimmed)) throw new BarcodeError(trimmed);
    return new Barcode(trimmed);
  }

  /** Reconstruye desde almacenamiento confiable (DB) sin revalidar check digit. */
  static fromStorage(raw: string): Barcode {
    return new Barcode(raw.trim());
  }

  private static isValid(value: string): boolean {
    if (/^\d{13}$/.test(value)) return Barcode.validateEAN13(value);
    if (/^\d{8}$/.test(value)) return true;
    if (/^[\x20-\x7E]{1,48}$/.test(value)) return true;
    return false;
  }

  private static validateEAN13(value: string): boolean {
    const digits = value.split('').map(Number);
    const checkDigit = digits[12];
    const sum = digits.slice(0, 12).reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
    const calculated = (10 - (sum % 10)) % 10;
    return calculated === checkDigit;
  }

  get value(): string {
    return this._value;
  }

  equals(other: Barcode): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return this._value;
  }
}
