import { Product } from '../entities/Product';
import { ProductLot } from '../entities/ProductLot';
import { ProductMovement } from '../entities/ProductMovement';

export interface IProductRepository {
  findById(id: string): Promise<Product | null>;
  findByBarcode(barcode: string): Promise<Product | null>;
  findAll(): Promise<Product[]>;
  save(product: Product): Promise<void>;
  saveLot(lot: ProductLot): Promise<ProductLot>;
  updateLotQuantity(lotId: string, newQuantity: number): Promise<void>;
  saveMovement(movement: ProductMovement): Promise<void>;
  /** Returns active lots ordered by expiry_date ASC (FEFO) */
  findActiveLotsFEFO(productId: string): Promise<ProductLot[]>;
}
