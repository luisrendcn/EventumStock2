import { IBarcodeScanner, ScanResult } from '@domain/ports/IBarcodeScanner';
import { IProductRepository } from '@domain/ports/IProductRepository';

export class BarcodeNotFoundError extends Error {
  constructor(barcode: string) {
    super(`Barcode not found in catalog: ${barcode}`);
    this.name = 'BarcodeNotFoundError';
  }
}

export class DatabaseBarcodeScanner implements IBarcodeScanner {
  constructor(private readonly productRepo: IProductRepository) {}

  async scan(barcode: string): Promise<ScanResult> {
    const product = await this.productRepo.findByBarcode(barcode);
    if (!product) throw new BarcodeNotFoundError(barcode);
    return { productId: product.id, name: product.name };
  }
}
