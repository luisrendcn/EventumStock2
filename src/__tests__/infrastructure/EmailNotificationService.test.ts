import { EmailNotificationService, Mailer } from '@infra/notifications/EmailNotificationService';
import { createNotificationService } from '@infra/notifications/NotificationServiceFactory';
import { ConsoleNotificationService } from '@infra/notifications/ConsoleNotificationService';

describe('EmailNotificationService', () => {
  it('sends low stock alerts to the configured recipient', async () => {
    const mailer: jest.Mocked<Mailer> = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'message-1' }),
    };
    const service = new EmailNotificationService(
      mailer,
      'EventumStock <alerts@example.com>',
      'luisrendon1522@gmail.com',
    );

    await service.sendLowStockAlert('prod-1', 'Test Product', 5, 10);

    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'EventumStock <alerts@example.com>',
        to: 'luisrendon1522@gmail.com',
        subject: 'Alerta de bajo stock: Test Product',
      }),
    );
    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('Stock actual: 5'),
        html: expect.stringContaining('<strong>Umbral minimo:</strong> 10'),
      }),
    );
  });

  it('falls back to console notifications when SMTP is not configured', () => {
    const service = createNotificationService({});

    expect(service).toBeInstanceOf(ConsoleNotificationService);
  });
});
