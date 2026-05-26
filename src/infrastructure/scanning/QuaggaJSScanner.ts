/**
 * QuaggaJSScanner — adaptador de producción para IBarcodeScanner.
 *
 * En la arquitectura del sistema la captura óptica del código ocurre
 * íntegramente en el cliente (PWA) a través de QuaggaJS corriendo
 * en el navegador con acceso a la cámara del dispositivo.
 *
 * El backend recibe únicamente la cadena ya decodificada.  Este adaptador
 * añade validación de formato EAN-13 / EAN-8 / Code128 antes de delegar
 * la resolución al repositorio, garantizando que nunca se persisten
 * movimientos con códigos malformados.
 *
 * Reemplaza a MockBarcodeScanner y DatabaseBarcodeScanner en el
 * contenedor de dependencias de producción.
 */
import { IBarcodeScanner, ScanResult } from '@domain/ports/IBarcodeScanner';
import { IProductRepository } from '@domain/ports/IProductRepository';

export class BarcodeFormatError extends Error {
  constructor(barcode: string) {
    super(`Formato de código de barras no reconocido: "${barcode}"`);
    this.name = 'BarcodeFormatError';
  }
}

export class BarcodeNotFoundError extends Error {
  constructor(barcode: string) {
    super(`Producto no encontrado para el código: "${barcode}"`);
    this.name = 'BarcodeNotFoundError';
  }
}

export class QuaggaJSScanner implements IBarcodeScanner {
  constructor(private readonly productRepo: IProductRepository) {}

  async scan(barcode: string): Promise<ScanResult> {
    // 1. Validar formato antes de consultar la BD
    if (!this.isValidBarcode(barcode)) {
      throw new BarcodeFormatError(barcode);
    }

    // 2. Buscar producto en el repositorio
    const product = await this.productRepo.findByBarcode(barcode);
    if (!product) throw new BarcodeNotFoundError(barcode);

    return { productId: product.id, name: product.name };
  }

  // ─── Validación de formatos compatibles con QuaggaJS ──────────────────────

  private isValidBarcode(barcode: string): boolean {
    if (!barcode || barcode.trim().length === 0) return false;

    // EAN-13: 13 dígitos numéricos con dígito verificador
    if (/^\d{13}$/.test(barcode)) return this.checkEANDigit(barcode);

    // EAN-8: 8 dígitos numéricos con dígito verificador
    if (/^\d{8}$/.test(barcode)) return this.checkEANDigit(barcode);

    // Code128: caracteres ASCII imprimibles (0x20–0x7E), mínimo 1 carácter
    if (/^[\x20-\x7E]{1,48}$/.test(barcode)) return true;

    return false;
  }

  /**
   * Verifica el dígito de control EAN (aplica a EAN-8 y EAN-13).
   * Algoritmo: suma ponderada (×1 / ×3 alternados) módulo 10.
   */
  private checkEANDigit(barcode: string): boolean {
    const digits = barcode.split('').map(Number);
    const checkDigit = digits.pop()!;
    const isEAN13 = digits.length === 12;

    const sum = digits.reduce((acc, d, i) => {
      // EAN-13: posiciones pares ×1, impares ×3
      // EAN-8:  posiciones pares ×3, impares ×1
      const weight = isEAN13
        ? (i % 2 === 0 ? 1 : 3)
        : (i % 2 === 0 ? 3 : 1);
      return acc + d * weight;
    }, 0);

    const calculated = (10 - (sum % 10)) % 10;
    return calculated === checkDigit;
  }
}
