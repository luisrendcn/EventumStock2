import { INotificationService } from '@domain/ports/INotificationService';
import { ConsoleNotificationService } from '@infra/notifications/ConsoleNotificationService';
import { EmailNotificationService } from '@infra/notifications/EmailNotificationService';

const DEFAULT_NOTIFICATION_EMAIL_TO = 'luisrendon1522@gmail.com';

export function createNotificationService(env: NodeJS.ProcessEnv = process.env): INotificationService {
  const host = env.SMTP_HOST;
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;

  if (!host || !user || !pass) {
    return new ConsoleNotificationService();
  }

  return EmailNotificationService.fromConfig({
    host,
    port: parsePort(env.SMTP_PORT),
    secure: parseBoolean(env.SMTP_SECURE),
    user,
    pass,
    from: env.SMTP_FROM ?? user,
    to: env.NOTIFICATION_EMAIL_TO ?? DEFAULT_NOTIFICATION_EMAIL_TO,
  });
}

function parsePort(value?: string): number {
  if (!value) return 587;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 587;
}

function parseBoolean(value?: string): boolean {
  return value?.toLowerCase() === 'true';
}
