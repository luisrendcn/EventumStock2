import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CreateReservationUseCase } from '@app/reservations/CreateReservationUseCase';
import { ConfirmReservationUseCase } from '@app/reservations/ConfirmReservationUseCase';
import { IReservationRepository } from '@domain/ports/IReservationRepository';
import { IProductRepository } from '@domain/ports/IProductRepository';

function translateError(message: string): string {
  if (/Cannot reserve (\d+) units\. Only (\d+) available/i.test(message)) {
    return message.replace(
      /Cannot reserve (\d+) units\. Only (\d+) available\./i,
      (_m, req, avail) => `No es posible reservar ${req} unidad${Number(req) !== 1 ? 'es' : ''}. Solo ${avail} disponible${Number(avail) !== 1 ? 's' : ''}.`,
    );
  }
  if (/Product not found/i.test(message)) {
    return 'Producto no encontrado';
  }
  if (/Reservation (.+) is not active \(status: (.+)\)/i.test(message)) {
    return message.replace(
      /Reservation (.+) is not active \(status: (.+)\)/i,
      (_m, _id, status) => `La reserva no está activa (estado: ${status})`,
    );
  }
  if (/Reservation (.+) has expired/i.test(message)) {
    return 'La reserva ha vencido';
  }
  if (/Reservation not found/i.test(message)) {
    return 'Reserva no encontrada';
  }
  if (/TTL must be at least (\d+)s/i.test(message)) {
    return message.replace(
      /TTL must be at least (\d+)s \(2 min\)\. Got: (\d+)s/i,
      (_m, min, got) => `El tiempo de reserva debe ser al menos ${min}s (2 min). Recibido: ${got}s`,
    );
  }
  if (/TTL must be at most (\d+)s/i.test(message)) {
    return message.replace(
      /TTL must be at most (\d+)s \(24 h\)\. Got: (\d+)s/i,
      (_m, max, got) => `El tiempo de reserva no puede superar ${max}s (24 h). Recibido: ${got}s`,
    );
  }
  return message;
}

const createSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  orderId: z.string().min(1),
  ttlSeconds: z.number().int().optional(),
});

export function createReservationsRouter(
  reservationRepo: IReservationRepository,
  productRepo: IProductRepository,
  createReservation: CreateReservationUseCase,
  confirmReservation: ConfirmReservationUseCase,
): Router {
  const router = Router();

  router.post('/', async (req: Request, res: Response) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const reservation = await createReservation.execute(parsed.data);
      res.status(201).json({
        id: reservation.id,
        productId: reservation.productId,
        quantity: reservation.quantity,
        orderId: reservation.orderId,
        ttlSeconds: reservation.ttl.seconds,
        expiresAt: reservation.expiresAt,
        remainingSeconds: reservation.remainingSeconds,
        status: reservation.status,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = /Cannot reserve/i.test(message) ? 422
        : /not found/i.test(message) ? 404
        : /TTL/i.test(message) ? 400
        : 500;
      res.status(status).json({ error: translateError(message) });
    }
  });

  router.get('/active', async (_req: Request, res: Response) => {
    try {
      const active = await reservationRepo.findAllActive();
      res.json(
        active.map(r => ({
          id: r.id,
          productId: r.productId,
          quantity: r.quantity,
          orderId: r.orderId,
          ttlSeconds: r.ttl.seconds,
          expiresAt: r.expiresAt,
          remainingSeconds: r.remainingSeconds,
          status: r.status,
        })),
      );
    } catch (err) {
      res.status(500).json({ error: translateError(String(err)) });
    }
  });

  router.post('/:id/cancel', async (req: Request, res: Response) => {
    try {
      const reservation = await reservationRepo.findById(req.params.id);
      if (!reservation) {
        res.status(404).json({ error: 'Reserva no encontrada' });
        return;
      }
      if (reservation.status !== 'ACTIVE') {
        res.status(422).json({ error: `La reserva no está activa (estado: ${reservation.status})` });
        return;
      }
      await reservationRepo.markExpired(req.params.id);
      res.json({ message: 'Reserva cancelada' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: translateError(message) });
    }
  });

  router.patch('/:id/confirm', async (req: Request, res: Response) => {
    try {
      const { stockAfter, productId, quantity } = await confirmReservation.execute({ reservationId: req.params.id });
      const product = await productRepo.findById(productId);
      res.json({
        message: 'Reserva confirmada',
        productName: product?.name ?? productId,
        quantity,
        stockAfter,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = /not found/i.test(message) ? 404
        : /not active/i.test(message) || /expired/i.test(message) ? 422
        : 500;
      res.status(status).json({ error: translateError(message) });
    }
  });

  return router;
}
