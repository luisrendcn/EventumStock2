import { Barcode } from '../value-objects/Barcode';
import { ProductLot } from './ProductLot';

export class Product {
  constructor(
    public readonly id: string,
    public readonly barcode: Barcode,
    public readonly name: string,
    public readonly minStockThreshold: number,
    public readonly lots: ProductLot[] = [],
    public readonly sku?: string,
    public readonly category?: string,
    public readonly costPrice?: number,
    public readonly salePrice?: number,
    public readonly unitOfMeasure?: string,
  ) {}

  get totalStock(): number {
    return this.lots
      .filter(l => l.isActive)
      .reduce((sum, l) => sum + l.quantity, 0);
  }

  isBelowThreshold(availableStock: number): boolean {
    return availableStock < this.minStockThreshold;
  }
}
