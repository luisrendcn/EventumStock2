export class ProductLot {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly lotNumber: string,
    public readonly quantity: number,
    public readonly expiryDate: Date,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
  ) {}

  withQuantity(newQuantity: number): ProductLot {
    return new ProductLot(
      this.id,
      this.productId,
      this.lotNumber,
      newQuantity,
      this.expiryDate,
      newQuantity > 0 ? this.isActive : false,
      this.createdAt,
    );
  }

  get isExpired(): boolean {
    return this.expiryDate < new Date();
  }
}
