-- Fixes the "add product" / "edit product after import" crashes.
--
-- An earlier migration (20240102000000_fix_product_columns) converted
-- "unitPrice" and "price" to TEXT and dropped "createdAt" directly on the
-- database, but prisma/schema.prisma was never updated to match — it still
-- declares unitPrice/price as Float? and requires createdAt. Every insert
-- or update Prisma generates from the current schema tries to write a
-- number into a text column and select a createdAt column that doesn't
-- exist, so it fails every time. This migration brings the real database
-- back in line with schema.prisma. Safe to run more than once.

-- Convert unitPrice/price back to real numbers. Strips thousands-separator
-- commas first (matching what the Excel import already does to new data),
-- then treats anything still non-numeric (blank, "N/A", etc.) as NULL
-- rather than failing the whole migration.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Product' AND column_name = 'unitPrice' AND data_type = 'text'
  ) THEN
    ALTER TABLE "Product" ALTER COLUMN "unitPrice" DROP DEFAULT;
    ALTER TABLE "Product" ALTER COLUMN "unitPrice" DROP NOT NULL;
    ALTER TABLE "Product" ALTER COLUMN "unitPrice" TYPE DOUBLE PRECISION
      USING (
        CASE WHEN REPLACE("unitPrice", ',', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
          THEN REPLACE("unitPrice", ',', '')::double precision
          ELSE NULL
        END
      );
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Product' AND column_name = 'price' AND data_type = 'text'
  ) THEN
    ALTER TABLE "Product" ALTER COLUMN "price" DROP DEFAULT;
    ALTER TABLE "Product" ALTER COLUMN "price" DROP NOT NULL;
    ALTER TABLE "Product" ALTER COLUMN "price" TYPE DOUBLE PRECISION
      USING (
        CASE WHEN REPLACE("price", ',', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
          THEN REPLACE("price", ',', '')::double precision
          ELSE NULL
        END
      );
  END IF;
END $$;

-- These are optional in schema.prisma (String?) — make sure the DB agrees
ALTER TABLE "Product" ALTER COLUMN "sku" DROP NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "sku" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "no" DROP NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "no" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "packsize" DROP NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "packsize" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "barcode" DROP NOT NULL;
ALTER TABLE "Product" ALTER COLUMN "barcode" DROP DEFAULT;

-- Restore createdAt, dropped by an earlier migration but required by schema.prisma
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW();
