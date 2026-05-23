import { StockUpdatedEvent } from '@domain/events/StockUpdatedEvent';
import { IDomainEventObserver } from '@domain/ports/IDomainEventObserver';
import { INotificationService } from '@domain/ports/INotificationService';

export class LowStockNotificationObserver implements IDomainEventObserver<StockUpdatedEvent> {
  constructor(private readonly notificationService: INotificationService) {}

  async handle(event: StockUpdatedEvent): Promise<void> {
    if (!event.isLowStock) return;

    try {
      await this.notificationService.sendLowStockAlert(
        event.productId,
        event.productName,
        event.currentStock,
        event.minThreshold,
      );
    } catch (error) {
      console.error('[Notifications] Low stock alert failed:', error);
    }
  }
}
