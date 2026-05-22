import { RegisterExitUseCase } from '@app/inventory/RegisterExitUseCase';
import { IProductRepository } from '@domain/ports/IProductRepository';
import { IReservationRepository } from '@domain/ports/IReservationRepository';
import { INotificationService } from '@domain/ports/INotificationService';
import { Product } from '@domain/entities/Product';
import { ProductLot } from '@domain/entities/ProductLot';
import { Barcode } from '@domain/value-objects/Barcode';

function makeLot(id: string, quantity: number, expiryDaysFromNow: number): ProductLot {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + expiryDaysFromNow);
  return new ProductLot(id, 'prod-1', `LOT-${id}`, quantity, expiry, true, new Date());
}

function makeProduct(lots: ProductLot[]): Product {
  return new Product('prod-1', Barcode.create('5901234123457'), 'Test Product', 10, lots);
}

describe('RegisterExitUseCase', () => {
  let productRepo: jest.Mocked<IProductRepository>;
  let reservationRepo: jest.Mocked<IReservationRepository>;
  let notificationService: jest.Mocked<INotificationService>;
  let useCase: RegisterExitUseCase;

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

    notificationService = {
      sendLowStockAlert: jest.fn().mockResolvedValue(undefined),
    };

    useCase = new RegisterExitUseCase(productRepo, reservationRepo, notificationService);
  });

  it('deducts from FEFO lot first (earliest expiry)', async () => {
    const lotA = makeLot('lot-A', 20, 10);  // expires in 10 days (first FEFO)
    const lotB = makeLot('lot-B', 50, 100); // expires in 100 days

    productRepo.findById.mockResolvedValue(makeProduct([lotA, lotB]));
    productRepo.findActiveLotsFEFO
      .mockResolvedValueOnce([lotA, lotB])  // initial call
      .mockResolvedValueOnce([lotA, lotB]); // after update

    await useCase.execute({ productId: 'prod-1', barcode: '5901234123457', quantity: 15 });

    // lotA should be deducted first
    expect(productRepo.updateLotQuantity).toHaveBeenCalledWith('lot-A', 5);
    expect(productRepo.updateLotQuantity).not.toHaveBeenCalledWith('lot-B', expect.anything());
  });

  it('spans multiple lots when first lot has insufficient quantity', async () => {
    const lotA = makeLot('lot-A', 10, 10);
    const lotB = makeLot('lot-B', 50, 100);

    productRepo.findById.mockResolvedValue(makeProduct([lotA, lotB]));
    productRepo.findActiveLotsFEFO
      .mockResolvedValueOnce([lotA, lotB])
      .mockResolvedValueOnce([lotA, lotB]);

    await useCase.execute({ productId: 'prod-1', barcode: '5901234123457', quantity: 25 });

    expect(productRepo.updateLotQuantity).toHaveBeenCalledWith('lot-A', 0);
    expect(productRepo.updateLotQuantity).toHaveBeenCalledWith('lot-B', 35);
  });

  it('emits low stock alert when stock falls below threshold', async () => {
    const lot = makeLot('lot-A', 12, 10);
    const product = makeProduct([lot]); // minStockThreshold = 10

    productRepo.findById.mockResolvedValue(product);
    productRepo.findActiveLotsFEFO
      .mockResolvedValueOnce([lot])
      .mockResolvedValueOnce([makeLot('lot-A', 5, 10)]); // after exit: 5 units

    const { event } = await useCase.execute({
      productId: 'prod-1',
      barcode: '5901234123457',
      quantity: 7,
    });

    expect(event.isLowStock).toBe(true);
    expect(notificationService.sendLowStockAlert).toHaveBeenCalledWith(
      'prod-1',
      'Test Product',
      expect.any(Number),
      10,
    );
  });

  it('throws InsufficientStockError when not enough available', async () => {
    const lot = makeLot('lot-A', 5, 10);
    productRepo.findById.mockResolvedValue(makeProduct([lot]));
    productRepo.findActiveLotsFEFO.mockResolvedValue([lot]);
    reservationRepo.getTotalReservedQuantity.mockResolvedValue(0);

    await expect(
      useCase.execute({ productId: 'prod-1', barcode: '5901234123457', quantity: 10 })
    ).rejects.toThrow('Insufficient stock');
  });
});
