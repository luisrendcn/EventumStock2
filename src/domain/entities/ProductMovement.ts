export type MovementType = 'IN' | 'OUT';

// RN-08: inmutable — solo INSERT, nunca UPDATE. Sin setters.
export class ProductMovement {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly lotId: string,
    public readonly type: MovementType,
    public readonly quantity: number,
    public readonly barcode: string,
    public readonly createdAt: Date,
  ) {
    Object.freeze(this);
  }
}
