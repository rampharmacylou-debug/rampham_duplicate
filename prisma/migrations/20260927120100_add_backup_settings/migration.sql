-- CreateTable: BackupSettings (singleton row, id = 'backup')
CREATE TABLE IF NOT EXISTS "BackupSettings" (
    "id"                  TEXT NOT NULL DEFAULT 'backup',
    "enabled"             BOOLEAN NOT NULL DEFAULT false,
    "backupTime"          TEXT NOT NULL DEFAULT '20:00',
    "backupToGoogleDrive" BOOLEAN NOT NULL DEFAULT true,
    "backupToLocalFolder" BOOLEAN NOT NULL DEFAULT false,
    "localFolderPath"     TEXT,
    "includeDatabaseDump" BOOLEAN NOT NULL DEFAULT false,
    "lastRunAt"           TIMESTAMP(3),
    "lastStatus"          TEXT,
    "lastError"           TEXT,
    "lastFileUrl"         TEXT,
    "lastLocalPath"       TEXT,
    CONSTRAINT "BackupSettings_pkey" PRIMARY KEY ("id")
);
