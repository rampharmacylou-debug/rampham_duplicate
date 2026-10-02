-- Fix Product table: add missing columns and convert price from Float to Text
-- Safe to run even if some columns already exist

-- Add missing columns if they don't exist
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "sku"       TEXT NOT NULL DEFAULT '';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "no"        TEXT NOT NULL DEFAULT '';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "packsize"  TEXT NOT NULL DEFAULT '';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "unitPrice" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "barcode"   TEXT NOT NULL DEFAULT '';

-- Rename product column if it doesn't exist (might be called 'name')
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Product' AND column_name = 'product'
  ) THEN
    ALTER TABLE "Product" ADD COLUMN "product" TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Convert price from Float/numeric to Text
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Product' AND column_name = 'price'
      AND data_type IN ('double precision', 'real', 'numeric', 'integer', 'bigint')
  ) THEN
    ALTER TABLE "Product" ALTER COLUMN "price" TYPE TEXT USING "price"::TEXT;
  END IF;
END $$;

-- Add price column as TEXT if it doesn't exist at all
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "price" TEXT NOT NULL DEFAULT '';

-- Ensure updatedAt exists
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Drop createdAt if it exists (not in our schema)
ALTER TABLE "Product" DROP COLUMN IF EXISTS "createdAt";
