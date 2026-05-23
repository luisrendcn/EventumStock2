import { LowStockNotificationObserver } from '@app/inventory/LowStockNotificationObserver';
import { StockUpdatedEvent } from '@domain/events/StockUpdatedEvent';
import { INotificationService } from '@domain/ports/INotificationService';

describe('LowStockNotificationObserver', () => {
  let notificationService: jest.Mocked<INotificationService>;
  let observer: LowStockNotificationObserver;

  beforeEach(() => {
    notificationService = {
      sendLowStockAlert: jest.fn().mockResolvedValue(undefined),
    };
    observer = new LowStockNotificationObserver(notificationService);
  });

  it('sends a notification when the stock updated event is low stock', async () => {
    const event = new StockUpdatedEvent('prod-1', 'Test Product', 12, 5, 10);

    await observer.handle(event);

    expect(notificationService.sendLowStockAlert).toHaveBeenCalledWith(
      'prod-1',
      'Test Product',
      5,
      10,
    );
  });

  it('ignores stock updated events that are not low stock', async () => {
    const event = new StockUpdatedEvent('prod-1', 'Test Product', 12, 11, 10);

    await observer.handle(event);

    expect(notificationService.sendLowStockAlert).not.toHaveBeenCalled();
  });

  it('does not fail the event flow when notification delivery fails', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    const event = new StockUpdatedEvent('prod-1', 'Test Product', 12, 5, 10);
    notificationService.sendLowStockAlert.mockRejectedValue(new Error('SMTP unavailable'));

    await expect(observer.handle(event)).resolves.toBeUndefined();

    expect(consoleError).toHaveBeenCalledWith(
      '[Notifications] Low stock alert failed:',
      expect.any(Error),
    );

    consoleError.mockRestore();
  });
});
