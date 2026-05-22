import { IBarcodeScanner, ScanResult } from '@domain/ports/IBarcodeScanner';

export class BarcodeNotFoundError extends Error {
  constructor(barcode: string) {
    super(`Barcode not found in catalog: ${barcode}`);
    this.name = 'BarcodeNotFoundError';
  }
}

// Mapa sincronizado con database/seed.sql
const BARCODE_CATALOG: Record<string, ScanResult> = {
  '5901234123457': { productId: 'a1b2c3d4-0001-0001-0001-000000000001', name: 'Ibuprofeno 400mg x20' },
  '4006381333931': { productId: 'a1b2c3d4-0002-0002-0002-000000000002', name: 'Paracetamol 500mg x30' },
  '8410032800018': { productId: 'a1b2c3d4-0003-0003-0003-000000000003', name: 'Vitamina C 1000mg x60' },
};

export class MockBarcodeScanner implements IBarcodeScanner {
  async scan(barcode: string): Promise<ScanResult> {
    const result = BARCODE_CATALOG[barcode];
    if (!result) throw new BarcodeNotFoundError(barcode);
    return result;
  }
}
