-- Adds the backup-destination columns to BackupSettings.
--
-- These columns were added by editing the 20260927120100_add_backup_settings
-- migration file after some databases had already applied it — Prisma only
-- tracks migrations by name, so an edit to an already-applied migration is
-- silently ignored on those databases, leaving BackupSettings missing
-- backupToGoogleDrive / backupToLocalFolder / localFolderPath /
-- includeDatabaseDump / lastLocalPath. This migration adds them directly,
-- and is safe to run whether or not that earlier edit already took effect.

ALTER TABLE "BackupSettings" ADD COLUMN IF NOT EXISTS "backupToGoogleDrive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "BackupSettings" ADD COLUMN IF NOT EXISTS "backupToLocalFolder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BackupSettings" ADD COLUMN IF NOT EXISTS "localFolderPath" TEXT;
ALTER TABLE "BackupSettings" ADD COLUMN IF NOT EXISTS "includeDatabaseDump" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BackupSettings" ADD COLUMN IF NOT EXISTS "lastLocalPath" TEXT;
