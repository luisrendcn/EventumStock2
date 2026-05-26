import { Pool } from 'pg';
import Redis from 'ioredis';

// Infrastructure
import { PostgresProductRepository } from '@infra/persistence/PostgresProductRepository';
import { RedisReservationRepository } from '@infra/persistence/RedisReservationRepository';
import { QuaggaJSScanner } from '@infra/scanning/QuaggaJSScanner';
import { createNotificationService } from '@infra/notifications/NotificationServiceFactory';
import { TTLExpirationScheduler } from '@infra/scheduler/TTLExpirationScheduler';
import { InMemoryEventBus } from '@infra/events/InMemoryEventBus';

// Application
import { RegisterEntryUseCase } from '@app/inventory/RegisterEntryUseCase';
import { RegisterExitUseCase } from '@app/inventory/RegisterExitUseCase';
import { LowStockNotificationObserver } from '@app/inventory/LowStockNotificationObserver';
import { CreateReservationUseCase } from '@app/reservations/CreateReservationUseCase';
import { ConfirmReservationUseCase } from '@app/reservations/ConfirmReservationUseCase';
import { ExpireReservationsUseCase } from '@app/reservations/ExpireReservationsUseCase';
import { ScanAndUpdateInventoryUseCase } from '@app/scanning/ScanAndUpdateInventoryUseCase';

// Interfaces
import { createProductsRouter } from '@interfaces/http/routes/products.routes';
import { createReservationsRouter } from '@interfaces/http/routes/reservations.routes';
import { createServer } from '@interfaces/http/server';
import { Application } from 'express';

export interface AppContainer {
  app: Application;
  scheduler: TTLExpirationScheduler;
}

export function buildContainer(pgPool: Pool, redisClient: Redis): AppContainer {
  // Repositories
  const productRepo = new PostgresProductRepository(pgPool);
  const reservationRepo = new RedisReservationRepository(redisClient);

  // Services
  const barcodeScanner = new QuaggaJSScanner(productRepo);
  const notificationService = createNotificationService();
  const eventBus = new InMemoryEventBus();
  eventBus.subscribe('stock.updated', new LowStockNotificationObserver(notificationService));

  // Use Cases — inventory
  const registerEntry = new RegisterEntryUseCase(productRepo, reservationRepo, eventBus);
  const registerExit = new RegisterExitUseCase(productRepo, reservationRepo, eventBus);

  // Use Cases — reservations
  const createReservation = new CreateReservationUseCase(productRepo, reservationRepo);
  const confirmReservation = new ConfirmReservationUseCase(reservationRepo, registerExit);
  const expireReservations = new ExpireReservationsUseCase(reservationRepo);

  // Use Cases — scanning
  const scanAndUpdate = new ScanAndUpdateInventoryUseCase(barcodeScanner, registerEntry, registerExit);

  // Scheduler
  const scheduler = new TTLExpirationScheduler(expireReservations);

  // Routers
  const productsRouter = createProductsRouter(productRepo, reservationRepo, scanAndUpdate);
  const reservationsRouter = createReservationsRouter(reservationRepo, productRepo, createReservation, confirmReservation);

  const app = createServer(productsRouter, reservationsRouter);

  return { app, scheduler };
}
