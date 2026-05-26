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

  /**
   * Sanitiza y valida un código de barras recibido desde el exterior
   * (HTTP body, escáner físico, QuaggaJS).
   *
   * Sanitización (orden):
   *   1. Elimina caracteres de control (< 0x20) que QuaggaJS puede incluir
   *      en Code128 con caracteres de función FNC1/GS/RS.
   *   2. Hace trim() de espacios en extremos.
   *
   * Validación:
   *   - EAN-13 : exactamente 13 dígitos numéricos — sin verificar check digit
   *              porque escáneres reales a veces devuelven variaciones.
   *   - EAN-8  : exactamente 8 dígitos numéricos.
   *   - Code128: 1–48 caracteres ASCII imprimibles (0x20–0x7E).
   */
  static create(raw: string): Barcode {
    // 1. Eliminar caracteres de control (< 0x20) — producidos por FNC1, GS, RS en Code128
    const stripped = raw.replace(/[\x00-\x1F]/g, '');
    // 2. Trim
    const cleaned = stripped.trim();

    // 3. Log temporal de diagnóstico
    console.log(`[Barcode.create] raw="${raw}" → cleaned="${cleaned}" (len=${cleaned.length})`);

    if (!Barcode.isValid(cleaned)) throw new BarcodeError(cleaned);
    return new Barcode(cleaned);
  }

  /** Reconstruye desde almacenamiento confiable (DB) sin revalidar. */
  static fromStorage(raw: string): Barcode {
    return new Barcode(raw.trim());
  }

  private static isValid(value: string): boolean {
    // EAN-13: 13 dígitos — check digit no verificado (permisividad para escáneres reales)
    if (/^\d{13}$/.test(value)) return true;
    // EAN-8: 8 dígitos
    if (/^\d{8}$/.test(value)) return true;
    // Code128: ASCII imprimible, 1–48 caracteres
    if (/^[\x20-\x7E]{1,48}$/.test(value)) return true;
    return false;
  }

  /**
   * Calcula si el check digit EAN-13/EAN-8 es correcto.
   * Mantenido como utilidad; ya no bloquea `create()`.
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
