import { RegisterEntryUseCase } from '@app/inventory/RegisterEntryUseCase';
import { IProductRepository } from '@domain/ports/IProductRepository';
import { IReservationRepository } from '@domain/ports/IReservationRepository';
import { IEventBus } from '@domain/ports/IEventBus';
import { Product } from '@domain/entities/Product';
import { ProductLot } from '@domain/entities/ProductLot';
import { Barcode } from '@domain/value-objects/Barcode';
import { StockUpdatedEvent } from '@domain/events/StockUpdatedEvent';

function makeProduct(): Product {
  return new Product('prod-1', Barcode.create('5901234123457'), 'Test Product', 10);
}

function makeLot(id: string, quantity: number): ProductLot {
  return new ProductLot(id, 'prod-1', `LOT-${id}`, quantity, new Date('2026-12-31'), true, new Date());
}

describe('RegisterEntryUseCase', () => {
  let productRepo: jest.Mocked<IProductRepository>;
  let reservationRepo: jest.Mocked<IReservationRepository>;
  let eventBus: jest.Mocked<IEventBus>;
  let useCase: RegisterEntryUseCase;

  beforeEach(() => {
    productRepo = {
      findById: jest.fn(),
      findByBarcode: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      saveLot: jest.fn(),
      updateLotQuantity: jest.fn().mockResolvedValue(undefined),
      saveMovement: jest.fn().mockResolvedValue(undefined),
      findActiveLotsFEFO: jest.fn(),
    };

    reservationRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findActiveByProductId: jest.fn(),
      findAllActive: jest.fn(),
      findExpired: jest.fn(),
      confirm: jest.fn(),
      markExpired: jest.fn(),
      getTotalReservedQuantity: jest.fn().mockResolvedValue(0),
    };

    eventBus = {
      subscribe: jest.fn(),
      publish: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new RegisterEntryUseCase(productRepo, reservationRepo, eventBus);
  });

  it('publishes a stock updated event when an entry leaves stock below threshold', async () => {
    const savedLot = makeLot('lot-A', 1);

    productRepo.findById.mockResolvedValue(makeProduct());
    productRepo.findActiveLotsFEFO
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([savedLot]);
    productRepo.saveLot.mockResolvedValue(savedLot);

    const { event } = await useCase.execute({
      productId: 'prod-1',
      barcode: '5901234123457',
      quantity: 1,
      lotNumber: 'LOT-lot-A',
      expiryDate: new Date('2026-12-31'),
    });

    expect(event).toBeInstanceOf(StockUpdatedEvent);
    expect(event.isLowStock).toBe(true);
    expect(eventBus.publish).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: 'prod-1',
        productName: 'Test Product',
        previousStock: 0,
        currentStock: 1,
        minThreshold: 10,
      }),
    );
  });
});
