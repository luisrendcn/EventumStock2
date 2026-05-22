export class ReservationExpiredEvent {
  public readonly occurredAt: Date;

  constructor(
    public readonly reservationId: string,
    public readonly productId: string,
    public readonly quantity: number,
  ) {
    this.occurredAt = new Date();
  }
}
