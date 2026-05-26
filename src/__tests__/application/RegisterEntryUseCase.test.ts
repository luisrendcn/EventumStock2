import { RegisterEntryUseCase } from '@app/inventory/RegisterEntryUseCase';
import { IProductRepository } from '@domain/ports/IProductRepository';
import { IReservationRepository } from '@domain/ports/IReservationRepository';
import { IEventBus } from '@domain/ports/IEventBus';
import { ProductLot } from '@domain/entities/ProductLot';
import { ProductMovement } from '@domain/entities/ProductMovement';
import { Barcode } from '@domain/value-objects/Barcode';
import { StockUpdatedEvent } from '@domain/events/StockUpdatedEvent';
import { Product } from '@domain/entities/Product';

const PRODUCT_ID = 'prod-1';
const BARCODE    = '5901234123457';
const NOW        = new Date('2026-05-26T00:00:00Z');
const EXPIRY     = new Date('2027-05-26T00:00:00Z');

function makeProduct(): Product {
  return new Product(PRODUCT_ID, Barcode.create(BARCODE), 'Test Product', 10);
}

function makeLot(id: string, lotNumber: string, quantity: number): ProductLot {
  return new ProductLot(id, PRODUCT_ID, lotNumber, quantity, EXPIRY, quantity > 0, NOW);
}

describe('RegisterEntryUseCase', () => {
  let productRepo: jest.Mocked<IProductRepository>;
  let reservationRepo: jest.Mocked<IReservationRepository>;
  let eventBus: jest.Mocked<IEventBus>;
  let useCase: RegisterEntryUseCase;

  beforeEach(() => {
    productRepo = {
      findById:              jest.fn(),
      findByBarcode:         jest.fn(),
      findAll:               jest.fn(),
      save:                  jest.fn(),
      saveLot:               jest.fn(),
      updateLotQuantity:     jest.fn().mockResolvedValue(undefined),
      saveMovement:          jest.fn().mockResolvedValue(undefined),
      findActiveLotsFEFO:    jest.fn(),
    };

    reservationRepo = {
      save:                      jest.fn(),
      findById:                  jest.fn(),
      findActiveByProductId:     jest.fn(),
      findAllActive:             jest.fn(),
      findExpired:               jest.fn(),
      confirm:                   jest.fn(),
      markExpired:               jest.fn(),
      getTotalReservedQuantity:  jest.fn().mockResolvedValue(0),
    };

    eventBus = {
      subscribe: jest.fn(),
      publish:   jest.fn().mockResolvedValue(undefined),
    };

    useCase = new RegisterEntryUseCase(productRepo, reservationRepo, eventBus);
  });

  // ── Caso 1: producto sin lotes previos ──────────────────────────────────────
  it('creates a new lot and saves movement with the persisted lot id (no previous lots)', async () => {
    productRepo.findById.mockResolvedValue(makeProduct());

    // saveLot simula RETURNING *: devuelve el mismo lote (mismo id)
    productRepo.saveLot.mockImplementation(async (lot) => lot);

    const savedLot = makeLot('lot-uuid-real', 'LOT-NEW', 10);
    productRepo.findActiveLotsFEFO
      .mockResolvedValueOnce([])            // sin lotes previos
      .mockResolvedValueOnce([savedLot]);   // después de crear el lote

    const result = await useCase.execute({
      productId:  PRODUCT_ID,
      barcode:    BARCODE,
      quantity:   10,
      lotNumber:  'LOT-NEW',
      expiryDate: EXPIRY,
    });

    // El lote se creó
    expect(productRepo.saveLot).toHaveBeenCalledTimes(1);
    const createdLot: ProductLot = productRepo.saveLot.mock.calls[0][0];
    expect(createdLot.lotNumber).toBe('LOT-NEW');
    expect(createdLot.quantity).toBe(10);

    // El movimiento usa el id del lote DEVUELTO por saveLot (id real de BD)
    expect(productRepo.saveMovement).toHaveBeenCalledTimes(1);
    const movement: ProductMovement = productRepo.saveMovement.mock.calls[0][0];
    expect(movement.lotId).toBe(createdLot.id);
    expect(movement.type).toBe('IN');
    expect(movement.quantity).toBe(10);

    expect(result.stockAfter).toBe(10);
  });

  // ── Caso 2: lote existente con el mismo lotNumber — acumula cantidad ────────
  it('accumulates quantity on existing active lot with same lotNumber', async () => {
    productRepo.findById.mockResolvedValue(makeProduct());

    const existingLot = makeLot('lot-existing-id', 'L001', 20);
    productRepo.findActiveLotsFEFO
      .mockResolvedValueOnce([existingLot])
      .mockResolvedValueOnce([makeLot('lot-existing-id', 'L001', 25)]);

    const result = await useCase.execute({
      productId:  PRODUCT_ID,
      barcode:    BARCODE,
      quantity:   5,
      lotNumber:  'L001',
      expiryDate: EXPIRY,
    });

    // No crea nuevo lote, actualiza el existente
    expect(productRepo.saveLot).not.toHaveBeenCalled();
    expect(productRepo.updateLotQuantity).toHaveBeenCalledWith('lot-existing-id', 25);

    // El movimiento usa el id del lote existente
    const movement: ProductMovement = productRepo.saveMovement.mock.calls[0][0];
    expect(movement.lotId).toBe('lot-existing-id');
    expect(result.stockAfter).toBe(25);
  });

  // ── Caso 3 (el bug real): lote INACTIVO con mismo lotNumber ya en BD ────────
  //
  // saveLot recibe un UUID nuevo pero la BD devuelve el id original del lote
  // inactivo (ON CONFLICT DO UPDATE mantiene el id de la fila existente).
  // El movimiento DEBE usar el id real devuelto por saveLot, no el UUID nuevo.
  it('uses the id returned by saveLot (not the generated UUID) when a conflict occurs in BD', async () => {
    productRepo.findById.mockResolvedValue(makeProduct());

    const dbRealId = 'lot-original-id-in-db';

    // saveLot simula ON CONFLICT: descarta el UUID nuevo y devuelve el id real de BD
    productRepo.saveLot.mockImplementation(async (_lot) =>
      makeLot(dbRealId, 'L001', _lot.quantity),
    );

    productRepo.findActiveLotsFEFO
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([makeLot(dbRealId, 'L001', 8)]);

    const result = await useCase.execute({
      productId:  PRODUCT_ID,
      barcode:    BARCODE,
      quantity:   8,
      lotNumber:  'L001',
      expiryDate: EXPIRY,
    });

    expect(productRepo.saveLot).toHaveBeenCalledTimes(1);

    const movement: ProductMovement = productRepo.saveMovement.mock.calls[0][0];
    // El movimiento debe usar el id REAL de BD, no el UUID generado en aplicación
    expect(movement.lotId).toBe(dbRealId);
    expect(result.stockAfter).toBe(8);
  });

  // ── Caso 4: publica evento StockUpdated tras cada entrada ───────────────────
  it('publishes a StockUpdatedEvent after a successful entry', async () => {
    const savedLot = makeLot('lot-A', 'LOT-A', 1);

    productRepo.findById.mockResolvedValue(makeProduct());
    productRepo.findActiveLotsFEFO
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([savedLot]);
    productRepo.saveLot.mockResolvedValue(savedLot);

    const { event } = await useCase.execute({
      productId:  PRODUCT_ID,
      barcode:    BARCODE,
      quantity:   1,
      lotNumber:  'LOT-A',
      expiryDate: EXPIRY,
    });

    expect(event).toBeInstanceOf(StockUpdatedEvent);
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        productId:    PRODUCT_ID,
        productName:  'Test Product',
        currentStock: 1,
        minThreshold: 10,
      }),
    );
  });
});
