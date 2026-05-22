export class StockUpdatedEvent {
  public readonly occurredAt: Date;

  constructor(
    public readonly productId: string,
    public readonly productName: string,
    public readonly previousStock: number,
    public readonly currentStock: number,
    public readonly minThreshold: number,
  ) {
    this.occurredAt = new Date();
  }

  get isLowStock(): boolean {
    return this.currentStock < this.minThreshold;
  }
}
