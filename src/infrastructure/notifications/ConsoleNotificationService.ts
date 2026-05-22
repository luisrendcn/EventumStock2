import { INotificationService } from '@domain/ports/INotificationService';

export class ConsoleNotificationService implements INotificationService {
  async sendLowStockAlert(
    productId: string,
    productName: string,
    currentStock: number,
    threshold: number,
  ): Promise<void> {
    console.warn(
      `[LOW STOCK ALERT] ${new Date().toISOString()} | ` +
      `Product: "${productName}" (${productId}) | ` +
      `Stock: ${currentStock} units < threshold: ${threshold}`,
    );
  }
}
