import { IReservationRepository } from '@domain/ports/IReservationRepository';
import { RegisterExitUseCase } from '../inventory/RegisterExitUseCase';

export interface ConfirmReservationInput {
  reservationId: string;
}

export interface ConfirmReservationOutput {
  stockAfter: number;
  productId: string;
  quantity: number;
}

export class ConfirmReservationUseCase {
  constructor(
    private readonly reservationRepo: IReservationRepository,
    private readonly registerExit: RegisterExitUseCase,
  ) {}

  async execute(input: ConfirmReservationInput): Promise<ConfirmReservationOutput> {
    const { reservationId } = input;

    const reservation = await this.reservationRepo.findById(reservationId);
    if (!reservation) throw new Error(`Reservation not found: ${reservationId}`);
    if (reservation.status !== 'ACTIVE') {
      throw new Error(`Reservation ${reservationId} is not active (status: ${reservation.status})`);
    }
    if (reservation.isExpired) {
      throw new Error(`Reservation ${reservationId} has expired`);
    }

    await this.reservationRepo.confirm(reservationId);

    const { stockAfter } = await this.registerExit.execute({
      productId: reservation.productId,
      barcode: '',
      quantity: reservation.quantity,
    });

    return { stockAfter, productId: reservation.productId, quantity: reservation.quantity };
  }
}
