import { v4 as uuidv4 } from 'uuid';
import { IProductRepository } from '@domain/ports/IProductRepository';
import { IReservationRepository } from '@domain/ports/IReservationRepository';
import { IEventBus } from '@domain/ports/IEventBus';
import { ProductMovement } from '@domain/entities/ProductMovement';
import { StockLevel } from '@domain/value-objects/StockLevel';
import { StockUpdatedEvent } from '@domain/events/StockUpdatedEvent';

export interface RegisterExitInput {
  productId: string;
  barcode: string;
  quantity: number;
}

export interface RegisterExitOutput {
  stockAfter: number;
  event: StockUpdatedEvent;
}

export class InsufficientStockError extends Error {
  constructor(available: number, requested: number) {
    super(`Insufficient stock. Available: ${available}, Requested: ${requested}`);
    this.name = 'InsufficientStockError';
  }
}

export class RegisterExitUseCase {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly reservationRepo: IReservationRepository,
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: RegisterExitInput): Promise<RegisterExitOutput> {
    const { productId, barcode, quantity } = input;

    const product = await this.productRepo.findById(productId);
    if (!product) throw new Error(`Product not found: ${productId}`);

    // RN-02: FEFO — lotes ordenados por fecha de vencimiento más próxima
    const lots = await this.productRepo.findActiveLotsFEFO(productId);
    const totalStock = lots.reduce((sum, l) => sum + l.quantity, 0);
    const reserved = await this.reservationRepo.getTotalReservedQuantity(productId);

    // RN-01: disponible = total - reservado, nunca negativo
    const stockLevel = StockLevel.create(totalStock, reserved);
    if (!stockLevel.canFulfill(quantity)) {
      throw new InsufficientStockError(stockLevel.available, quantity);
    }

    // Deducir de lotes FEFO
    let remaining = quantity;

    for (const lot of lots) {
      if (remaining <= 0) break;

      const deduct = Math.min(lot.quantity, remaining);
      const newQty = lot.quantity - deduct;
      await this.productRepo.updateLotQuantity(lot.id, newQty);

      const movement = new ProductMovement(
        uuidv4(),
        productId,
        lot.id,
        'OUT',
        deduct,
        barcode,
        new Date(),
      );
      await this.productRepo.saveMovement(movement);
      remaining -= deduct;
    }

    const updatedLots = await this.productRepo.findActiveLotsFEFO(productId);
    const stockAfterTotal = updatedLots.reduce((sum, l) => sum + l.quantity, 0);
    const stockAfter = stockAfterTotal - reserved;

    const event = new StockUpdatedEvent(
      productId,
      product.name,
      stockLevel.available,
      Math.max(0, stockAfter),
      product.minStockThreshold,
    );

    await this.eventBus.publish(event);

    return { stockAfter: Math.max(0, stockAfter), event };
  }
}
