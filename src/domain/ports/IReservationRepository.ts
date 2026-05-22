import { Reservation } from '../entities/Reservation';

export interface IReservationRepository {
  save(reservation: Reservation): Promise<void>;
  findById(id: string): Promise<Reservation | null>;
  findActiveByProductId(productId: string): Promise<Reservation[]>;
  findAllActive(): Promise<Reservation[]>;
  findExpired(): Promise<Reservation[]>;
  confirm(id: string): Promise<void>;
  markExpired(id: string): Promise<void>;
  getTotalReservedQuantity(productId: string): Promise<number>;
}
