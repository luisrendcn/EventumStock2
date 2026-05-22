export class StockLevelError extends Error {
  constructor(total: number, reserved: number) {
    super(`Stock cannot be negative. Total: ${total}, Reserved: ${reserved}, Available: ${total - reserved}`);
    this.name = 'StockLevelError';
  }
}

export class StockLevel {
  private readonly _available: number;

  private constructor(available: number) {
    this._available = available;
  }

  static create(total: number, reserved: number): StockLevel {
    const available = total - reserved;
    if (available < 0) throw new StockLevelError(total, reserved);
    return new StockLevel(available);
  }

  static zero(): StockLevel {
    return new StockLevel(0);
  }

  get available(): number {
    return this._available;
  }

  canReserve(quantity: number): boolean {
    return this._available >= quantity;
  }

  canFulfill(quantity: number): boolean {
    return this._available >= quantity;
  }
}
