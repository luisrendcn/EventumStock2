import nodemailer from 'nodemailer';

import { INotificationService } from '@domain/ports/INotificationService';

export interface EmailNotificationConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
  to: string;
}

export interface Mailer {
  sendMail(options: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }): Promise<unknown>;
}

export class EmailNotificationService implements INotificationService {
  constructor(
    private readonly mailer: Mailer,
    private readonly from: string,
    private readonly to: string,
  ) {}

  static fromConfig(config: EmailNotificationConfig): EmailNotificationService {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    return new EmailNotificationService(transporter, config.from, config.to);
  }

  async sendLowStockAlert(
    productId: string,
    productName: string,
    currentStock: number,
    threshold: number,
  ): Promise<void> {
    const subject = `Alerta de bajo stock: ${productName}`;
    const text = [
      'EventumStock detecto un producto con bajo stock.',
      '',
      `Producto: ${productName}`,
      `ID: ${productId}`,
      `Stock actual: ${currentStock}`,
      `Umbral minimo: ${threshold}`,
      `Fecha: ${new Date().toISOString()}`,
    ].join('\n');

    const html = `
      <h2>Alerta de bajo stock</h2>
      <p>EventumStock detecto un producto con bajo stock.</p>
      <ul>
        <li><strong>Producto:</strong> ${escapeHtml(productName)}</li>
        <li><strong>ID:</strong> ${escapeHtml(productId)}</li>
        <li><strong>Stock actual:</strong> ${currentStock}</li>
        <li><strong>Umbral minimo:</strong> ${threshold}</li>
        <li><strong>Fecha:</strong> ${new Date().toISOString()}</li>
      </ul>
    `;

    await this.mailer.sendMail({
      from: this.from,
      to: this.to,
      subject,
      text,
      html,
    });
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
