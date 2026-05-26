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
      // Generar defaults si no se envían en el body (escaneo desde cámara móvil)
      const resolvedLot = lotNumber?.trim() || `LOT-${Date.now()}`;
      const resolvedExpiry = expiryDate
        ? new Date(expiryDate)
        : new Date(new Date().setFullYear(new Date().getFullYear() + 1));

      const result = await this.registerEntry.execute({
        productId,
        barcode,
        quantity,
        lotNumber: resolvedLot,
        expiryDate: resolvedExpiry,
      });
      stockAfter = result.stockAfter;
    } else {
      const result = await this.registerExit.execute({ productId, barcode, quantity });
      stockAfter = result.stockAfter;
    }

    return { productId, productName: name, type, quantity, stockAfter };
  }
}
