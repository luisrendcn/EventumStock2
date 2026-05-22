-- Seed: 3 productos con lotes y barcodes EAN-13
-- Los UUIDs son fijos para que MockBarcodeScanner pueda referenciarlos

INSERT INTO products (id, barcode, name, min_stock_threshold) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', '5901234123457', 'Ibuprofeno 400mg x20', 10),
  ('a1b2c3d4-0002-0002-0002-000000000002', '4006381333931', 'Paracetamol 500mg x30', 15),
  ('a1b2c3d4-0003-0003-0003-000000000003', '8410032800018', 'Vitamina C 1000mg x60', 5)
ON CONFLICT (barcode) DO NOTHING;

-- Lotes para Ibuprofeno (dos lotes activos, FEFO: L001 vence antes)
INSERT INTO product_lots (id, product_id, lot_number, quantity, expiry_date) VALUES
  ('b1000001-0001-0001-0001-000000000001', 'a1b2c3d4-0001-0001-0001-000000000001', 'L001', 50, '2026-03-15'),
  ('b1000001-0001-0001-0001-000000000002', 'a1b2c3d4-0001-0001-0001-000000000001', 'L002', 100, '2026-12-31')
ON CONFLICT (product_id, lot_number) DO NOTHING;

-- Lotes para Paracetamol
INSERT INTO product_lots (id, product_id, lot_number, quantity, expiry_date) VALUES
  ('b2000002-0002-0002-0002-000000000001', 'a1b2c3d4-0002-0002-0002-000000000002', 'L010', 80, '2026-06-30')
ON CONFLICT (product_id, lot_number) DO NOTHING;

-- Lotes para Vitamina C
INSERT INTO product_lots (id, product_id, lot_number, quantity, expiry_date) VALUES
  ('b3000003-0003-0003-0003-000000000001', 'a1b2c3d4-0003-0003-0003-000000000003', 'L020', 20, '2026-09-01')
ON CONFLICT (product_id, lot_number) DO NOTHING;
