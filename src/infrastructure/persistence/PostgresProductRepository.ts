import { Pool } from 'pg';
import { IProductRepository } from '@domain/ports/IProductRepository';
import { Product } from '@domain/entities/Product';
import { ProductLot } from '@domain/entities/ProductLot';
import { ProductMovement } from '@domain/entities/ProductMovement';
import { Barcode } from '@domain/value-objects/Barcode';

export class PostgresProductRepository implements IProductRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Product | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM products WHERE id = $1',
      [id],
    );
    if (!rows[0]) return null;
    return this.mapProduct(rows[0]);
  }

  async findByBarcode(barcode: string): Promise<Product | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM products WHERE barcode = $1',
      [barcode],
    );
    if (!rows[0]) return null;
    return this.mapProduct(rows[0]);
  }

  async findAll(): Promise<Product[]> {
    const { rows } = await this.pool.query('SELECT * FROM products ORDER BY name');
    return Promise.all(rows.map(r => this.mapProduct(r)));
  }

  async save(product: Product): Promise<void> {
    await this.pool.query(
      `INSERT INTO products (id, barcode, name, min_stock_threshold, sku, category, cost_price, sale_price, unit_of_measure)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (barcode) DO UPDATE
         SET name = $3, min_stock_threshold = $4, sku = $5,
             category = $6, cost_price = $7, sale_price = $8, unit_of_measure = $9`,
      [
        product.id, product.barcode.value, product.name, product.minStockThreshold,
        product.sku ?? null, product.category ?? null,
        product.costPrice ?? null, product.salePrice ?? null,
        product.unitOfMeasure ?? null,
      ],
    );
  }

  async saveLot(lot: ProductLot): Promise<ProductLot> {
    await this.pool.query(
      `INSERT INTO product_lots (id, product_id, lot_number, quantity, expiry_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (product_id, lot_number) DO UPDATE SET quantity = $4`,
      [lot.id, lot.productId, lot.lotNumber, lot.quantity, lot.expiryDate, lot.isActive],
    );
    return lot;
  }

  async updateLotQuantity(lotId: string, newQuantity: number): Promise<void> {
    await this.pool.query(
      'UPDATE product_lots SET quantity = $1, is_active = $2 WHERE id = $3',
      [newQuantity, newQuantity > 0, lotId],
    );
  }

  async saveMovement(movement: ProductMovement): Promise<void> {
    await this.pool.query(
      `INSERT INTO product_movements (id, product_id, lot_id, type, quantity, barcode, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        movement.id,
        movement.productId,
        movement.lotId,
        movement.type,
        movement.quantity,
        movement.barcode,
        movement.createdAt,
      ],
    );
  }

  async findActiveLotsFEFO(productId: string): Promise<ProductLot[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM product_lots
       WHERE product_id = $1 AND is_active = true AND quantity > 0
       ORDER BY expiry_date ASC`,
      [productId],
    );
    return rows.map(this.mapLot);
  }

  private mapProduct(row: Record<string, unknown>): Product {
    return new Product(
      row.id as string,
      Barcode.fromStorage(row.barcode as string),
      row.name as string,
      row.min_stock_threshold as number,
      [],
      row.sku as string | undefined,
      row.category as string | undefined,
      row.cost_price != null ? Number(row.cost_price) : undefined,
      row.sale_price != null ? Number(row.sale_price) : undefined,
      row.unit_of_measure as string | undefined,
    );
  }

  private mapLot(row: Record<string, unknown>): ProductLot {
    return new ProductLot(
      row.id as string,
      row.product_id as string,
      row.lot_number as string,
      row.quantity as number,
      new Date(row.expiry_date as string),
      row.is_active as boolean,
      new Date(row.created_at as string),
    );
  }
}
