-- EventumStock — Schema hexagonal
-- product_movements es INMUTABLE: solo INSERT, nunca UPDATE (RN-08)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barcode          VARCHAR(50)  UNIQUE NOT NULL,
  name             VARCHAR(255) NOT NULL,
  min_stock_threshold INTEGER NOT NULL DEFAULT 10,
  sku              VARCHAR(100),
  category         VARCHAR(100),
  cost_price       NUMERIC(10,2),
  sale_price       NUMERIC(10,2),
  unit_of_measure  VARCHAR(50),
  created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_lots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lot_number  VARCHAR(100) NOT NULL,
  quantity    INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  expiry_date DATE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, lot_number)
);

CREATE TABLE IF NOT EXISTS product_movements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id),
  lot_id      UUID NOT NULL REFERENCES product_lots(id),
  type        CHAR(3) NOT NULL CHECK (type IN ('IN', 'OUT')),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  barcode     VARCHAR(50) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Regla RN-08: movimientos son inmutables — trigger impide UPDATE/DELETE
CREATE OR REPLACE FUNCTION prevent_movement_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'product_movements is immutable — use adjustment entries instead';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS no_update_movements ON product_movements;
CREATE TRIGGER no_update_movements
  BEFORE UPDATE OR DELETE ON product_movements
  FOR EACH ROW EXECUTE FUNCTION prevent_movement_mutation();

-- Tabla de auditoría para reservas (fuente de verdad activa: Redis)
CREATE TABLE IF NOT EXISTS reservations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id),
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  order_id    VARCHAR(100) NOT NULL,
  ttl_seconds INTEGER NOT NULL,
  expires_at  TIMESTAMP NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE', 'CONFIRMED', 'EXPIRED')),
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_lots_product_expiry
  ON product_lots (product_id, expiry_date ASC) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_reservations_product_status
  ON reservations (product_id, status);
