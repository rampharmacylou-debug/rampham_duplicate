-- Add phone number to Client table
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "phone" TEXT NOT NULL DEFAULT '';
