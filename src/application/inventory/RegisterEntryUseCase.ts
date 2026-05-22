import { v4 as uuidv4 } from 'uuid';
import { IProductRepository } from '@domain/ports/IProductRepository';
import { ProductLot } from '@domain/entities/ProductLot';
import { ProductMovement } from '@domain/entities/ProductMovement';

export interface RegisterEntryInput {
  productId: string;
  barcode: string;
  quantity: number;
  lotNumber: string;
  expiryDate: Date;
}

export interface RegisterEntryOutput {
  lotId: string;
  stockAfter: number;
}

export class RegisterEntryUseCase {
  constructor(private readonly productRepo: IProductRepository) {}

  async execute(input: RegisterEntryInput): Promise<RegisterEntryOutput> {
    const { productId, barcode, quantity, lotNumber, expiryDate } = input;

    const lots = await this.productRepo.findActiveLotsFEFO(productId);
    const existingLot = lots.find(l => l.lotNumber === lotNumber);

    let lot: ProductLot;
    if (existingLot) {
      const newQty = existingLot.quantity + quantity;
      await this.productRepo.updateLotQuantity(existingLot.id, newQty);
      lot = existingLot.withQuantity(newQty);
    } else {
      const now = new Date();
      lot = new ProductLot(uuidv4(), productId, lotNumber, quantity, expiryDate, true, now);
      lot = await this.productRepo.saveLot(lot);
    }

    const movement = new ProductMovement(
      uuidv4(),
      productId,
      lot.id,
      'IN',
      quantity,
      barcode,
      new Date(),
    );
    await this.productRepo.saveMovement(movement);

    const updatedLots = await this.productRepo.findActiveLotsFEFO(productId);
    const stockAfter = updatedLots.reduce((sum, l) => sum + l.quantity, 0);

    return { lotId: lot.id, stockAfter };
  }
}
