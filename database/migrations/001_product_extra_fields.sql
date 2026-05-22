-- Migration 001: extra product metadata fields
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS sku             VARCHAR(100),
  ADD COLUMN IF NOT EXISTS category        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS cost_price      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS sale_price      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50);
