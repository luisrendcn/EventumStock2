export class BarcodeError extends Error {
  constructor(value: string) {
    super(`Invalid barcode: "${value}". Must contain only numeric digits (0-9), non-empty.`);
    this.name = 'BarcodeError';
  }
}

export class Barcode {
  private readonly _value: string;

  private constructor(value: string) {
    this._value = value;
  }

  /**
   * Sanitiza y valida un código de barras recibido desde el exterior
   * (HTTP body, escáner físico, QuaggaJS).
   *
   * Sanitización:
   *   1. Elimina caracteres de control (< 0x20) que QuaggaJS puede emitir
   *      en Code128 con caracteres de función FNC1/GS/RS.
   *   2. Trim de espacios en extremos.
   *
   * Validación:
   *   - Solo dígitos 0-9, sin longitud mínima ni máxima.
   *   - Rechaza vacíos y cualquier carácter no numérico.
   */
  static create(raw: string): Barcode {
    // 1. Eliminar caracteres de control (< 0x20)
    const stripped = raw.replace(/[\x00-\x1F]/g, '');
    // 2. Trim
    const cleaned = stripped.trim();

    if (!Barcode.isValid(cleaned)) throw new BarcodeError(cleaned);
    return new Barcode(cleaned);
  }

  /** Reconstruye desde almacenamiento confiable (DB) sin revalidar. */
  static fromStorage(raw: string): Barcode {
    return new Barcode(raw.trim());
  }

  /** Solo dígitos, al menos uno. */
  private static isValid(value: string): boolean {
    return /^\d+$/.test(value);
  }

  /**
   * Calcula si el check digit EAN-13/EAN-8 es correcto.
   * Mantenido como utilidad; no bloquea `create()`.
   */
  static isValidEANCheckDigit(barcode: string): boolean {
    if (!/^\d{8}$/.test(barcode) && !/^\d{13}$/.test(barcode)) return false;
    const digits = barcode.split('').map(Number);
    const check = digits.pop()!;
    const isEAN13 = digits.length === 12;
    const sum = digits.reduce(
      (acc, d, i) => acc + d * (isEAN13 ? (i % 2 === 0 ? 1 : 3) : (i % 2 === 0 ? 3 : 1)),
      0,
    );
    return (10 - (sum % 10)) % 10 === check;
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
