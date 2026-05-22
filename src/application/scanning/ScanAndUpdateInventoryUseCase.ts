import { IBarcodeScanner } from '@domain/ports/IBarcodeScanner';
import { RegisterEntryUseCase } from '../inventory/RegisterEntryUseCase';
import { RegisterExitUseCase } from '../inventory/RegisterExitUseCase';

export interface ScanInput {
  barcode: string;
  quantity: number;
  type: 'IN' | 'OUT';
  lotNumber?: string;
  expiryDate?: string;
}

export interface ScanOutput {
  productId: string;
  productName: string;
  type: 'IN' | 'OUT';
  quantity: number;
  stockAfter: number;
}

export class ScanAndUpdateInventoryUseCase {
  constructor(
    private readonly barcodeScanner: IBarcodeScanner,
    private readonly registerEntry: RegisterEntryUseCase,
    private readonly registerExit: RegisterExitUseCase,
  ) {}

  async execute(input: ScanInput): Promise<ScanOutput> {
    const { barcode, quantity, type, lotNumber, expiryDate } = input;

    const scanResult = await this.barcodeScanner.scan(barcode);
    const { productId, name } = scanResult;

    let stockAfter: number;

    if (type === 'IN') {
      if (!lotNumber) throw new Error('lotNumber is required for IN movements');
      if (!expiryDate) throw new Error('expiryDate is required for IN movements');

      const result = await this.registerEntry.execute({
        productId,
        barcode,
        quantity,
        lotNumber,
        expiryDate: new Date(expiryDate),
      });
      stockAfter = result.stockAfter;
    } else {
      const result = await this.registerExit.execute({ productId, barcode, quantity });
      stockAfter = result.stockAfter;
    }

    return { productId, productName: name, type, quantity, stockAfter };
  }
}
