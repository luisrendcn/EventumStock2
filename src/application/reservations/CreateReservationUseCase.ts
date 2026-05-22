import { v4 as uuidv4 } from 'uuid';
import { IProductRepository } from '@domain/ports/IProductRepository';
import { IReservationRepository } from '@domain/ports/IReservationRepository';
import { Reservation } from '@domain/entities/Reservation';
import { TTL } from '@domain/value-objects/TTL';
import { StockLevel } from '@domain/value-objects/StockLevel';

export interface CreateReservationInput {
  productId: string;
  quantity: number;
  orderId: string;
  ttlSeconds?: number;
}

export class ReservationNotPossibleError extends Error {
  constructor(available: number, requested: number) {
    super(`Cannot reserve ${requested} units. Only ${available} available.`);
    this.name = 'ReservationNotPossibleError';
  }
}

export class CreateReservationUseCase {
  constructor(
    private readonly productRepo: IProductRepository,
    private readonly reservationRepo: IReservationRepository,
  ) {}

  async execute(input: CreateReservationInput): Promise<Reservation> {
    const { productId, quantity, orderId, ttlSeconds } = input;

    const product = await this.productRepo.findById(productId);
    if (!product) throw new Error(`Product not found: ${productId}`);

    const lots = await this.productRepo.findActiveLotsFEFO(productId);
    const totalStock = lots.reduce((sum, l) => sum + l.quantity, 0);
    const reserved = await this.reservationRepo.getTotalReservedQuantity(productId);

    // RN-03: solo crear si disponible >= cantidad solicitada
    const stockLevel = StockLevel.create(totalStock, reserved);
    if (!stockLevel.canReserve(quantity)) {
      throw new ReservationNotPossibleError(stockLevel.available, quantity);
    }

    // RN-04: TTL inmutable una vez creado
    const ttl = TTL.create(ttlSeconds);
    const now = new Date();
    const expiresAt = ttl.expiresAt(now);

    const reservation = new Reservation(
      uuidv4(),
      productId,
      quantity,
      orderId,
      ttl,
      expiresAt,
      'ACTIVE',
      now,
    );

    await this.reservationRepo.save(reservation);
    return reservation;
  }
}
