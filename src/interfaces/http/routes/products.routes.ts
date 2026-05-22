import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { IProductRepository } from '@domain/ports/IProductRepository';
import { IReservationRepository } from '@domain/ports/IReservationRepository';
import { ScanAndUpdateInventoryUseCase } from '@app/scanning/ScanAndUpdateInventoryUseCase';
import { Product } from '@domain/entities/Product';
import { Barcode } from '@domain/value-objects/Barcode';

function translateError(message: string): string {
  if (/Barcode not found in catalog/i.test(message)) {
    const code = message.split(':')[1]?.trim() ?? '';
    return `Código no encontrado en catálogo${code ? ': ' + code : ''}`;
  }
  if (/Insufficient stock\. Available: (\d+), Requested: (\d+)/i.test(message)) {
    return message.replace(
      /Insufficient stock\. Available: (\d+), Requested: (\d+)/i,
      (_m, a, r) => `Stock insuficiente. Disponible: ${a}, Solicitado: ${r}`,
    );
  }
  if (/Product not found/i.test(message)) {
    return 'Producto no encontrado';
  }
  if (/Invalid barcode/i.test(message)) {
    return message.replace(
      /Invalid barcode: "(.+?)"\. Must be EAN-13.+/i,
      (_m, code) => `Código de barras inválido: "${code}". Debe ser EAN-13 (13 dígitos), EAN-8 (8 dígitos) o Code128 (1-48 caracteres ASCII imprimibles).`,
    );
  }
  if (/lotNumber is required for IN movements/i.test(message)) {
    return 'El número de lote es obligatorio para movimientos de entrada';
  }
  if (/expiryDate is required for IN movements/i.test(message)) {
    return 'La fecha de vencimiento es obligatoria para movimientos de entrada';
  }
  return message;
}

const scanSchema = z.object({
  barcode: z.string().min(1),
  quantity: z.number().int().positive(),
  type: z.enum(['IN', 'OUT']),
  lotNumber: z.string().optional(),
  expiryDate: z.string().optional(),
});

const createProductSchema = z.object({
  barcode: z.string().min(1),
  name: z.string().min(1),
  minStockThreshold: z.number().int().nonnegative(),
  sku: z.string().optional(),
  category: z.string().optional(),
  costPrice: z.number().nonnegative().optional(),
  salePrice: z.number().nonnegative().optional(),
  unitOfMeasure: z.string().optional(),
});

export function createProductsRouter(
  productRepo: IProductRepository,
  reservationRepo: IReservationRepository,
  scanUseCase: ScanAndUpdateInventoryUseCase,
): Router {
  const router = Router();

  // GET /api/products
  router.get('/products', async (_req: Request, res: Response) => {
    try {
      const products = await productRepo.findAll();
      const result = await Promise.all(
        products.map(async p => {
          const lots = await productRepo.findActiveLotsFEFO(p.id);
          const totalStock = lots.reduce((sum, l) => sum + l.quantity, 0);
          const reserved = await reservationRepo.getTotalReservedQuantity(p.id);
          const available = Math.max(0, totalStock - reserved);
          return {
            id: p.id,
            barcode: p.barcode.value,
            name: p.name,
            totalStock,
            reserved,
            available,
            minStockThreshold: p.minStockThreshold,
            isLowStock: available < p.minStockThreshold,
            sku: p.sku,
            category: p.category,
            costPrice: p.costPrice,
            salePrice: p.salePrice,
            unitOfMeasure: p.unitOfMeasure,
            lots: lots.map(l => ({
              id: l.id,
              lotNumber: l.lotNumber,
              quantity: l.quantity,
              expiryDate: l.expiryDate,
            })),
          };
        }),
      );
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: translateError(String(err)) });
    }
  });

  // POST /api/products
  router.post('/products', async (req: Request, res: Response) => {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const { barcode, name, minStockThreshold, sku, category, costPrice, salePrice, unitOfMeasure } = parsed.data;
      Barcode.create(barcode);

      const existing = await productRepo.findByBarcode(barcode);
      if (existing) {
        res.status(409).json({ error: `Ya existe un producto con el código ${barcode}` });
        return;
      }

      const product = new Product(
        uuidv4(),
        Barcode.create(barcode),
        name,
        minStockThreshold,
        [],
        sku,
        category,
        costPrice,
        salePrice,
        unitOfMeasure,
      );

      await productRepo.save(product);

      res.status(201).json({
        id: product.id,
        barcode: product.barcode.value,
        name: product.name,
        minStockThreshold: product.minStockThreshold,
        sku: product.sku,
        category: product.category,
        costPrice: product.costPrice,
        salePrice: product.salePrice,
        unitOfMeasure: product.unitOfMeasure,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = /Invalid barcode/i.test(message) ? 400 : 500;
      res.status(status).json({ error: translateError(message) });
    }
  });

  // POST /api/scan
  router.post('/scan', async (req: Request, res: Response) => {
    const parsed = scanSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      Barcode.create(parsed.data.barcode);
      const output = await scanUseCase.execute(parsed.data);
      res.json(output);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const status = /not found/i.test(message) ? 404
        : /Insufficient/i.test(message) ? 422
        : /Invalid barcode/i.test(message) ? 400
        : 500;
      res.status(status).json({ error: translateError(message) });
    }
  });

  return router;
}
