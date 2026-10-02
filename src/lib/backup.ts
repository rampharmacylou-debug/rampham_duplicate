import * as XLSX from "xlsx";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { isDriveConfigured, uploadBackupToDrive } from "@/lib/googleDrive";
import { runPgDump } from "@/lib/dbDump";

const PRODUCT_HEADER = [
  "No",
  "Product",
  "Pack Size",
  "Unit Price",
  "Price",
  "Barcode",
  "SKU",
];
const CLIENT_HEADER = [
  "Client Name",
  "Phone",
  "Route",
  "Rider Price",
  "Pham Price",
];

function stamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}_${hh}${min}`;
}

export function backupFileName() {
  return `RAM-PHAM-Backup-${stamp()}.xlsx`;
}

/** Builds the Products + Clients workbook as an xlsx byte buffer. */
export async function buildWorkbookBuffer(): Promise<Buffer> {
  const [products, clients] = await Promise.all([
    prisma.product.findMany({ orderBy: { updatedAt: "desc" } }),
    prisma.client.findMany({ orderBy: { clientName: "asc" } }),
  ]);

  const productRows = products.map((p) => [
    p.no ?? "",
    p.product ?? "",
    p.packsize ?? "",
    p.unitPrice ?? "",
    p.price ?? "",
    p.barcode ?? "",
    p.sku ?? "",
  ]);

  const clientRows = clients.map((c) => [
    c.clientName ?? "",
    c.phone ?? "",
    c.routeName ?? "",
    c.riderPrice ?? 0,
    c.phamPrice ?? 0,
  ]);

  const wb = XLSX.utils.book_new();
  const productSheet = XLSX.utils.aoa_to_sheet([
    PRODUCT_HEADER,
    ...productRows,
  ]);
  const clientSheet = XLSX.utils.aoa_to_sheet([CLIENT_HEADER, ...clientRows]);
  XLSX.utils.book_append_sheet(wb, productSheet, "Products");
  XLSX.utils.book_append_sheet(wb, clientSheet, "Clients");

  const arrayBuffer = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return Buffer.from(arrayBuffer);
}

export type BackupResult =
  | { ok: true; fileUrl: string | null; localPath: string | null }
  | { ok: false; error: string };

/**
 * Runs a backup according to the saved BackupSettings row: uploads to
 * Google Drive, writes to a local folder, and/or runs a full pg_dump —
 * whichever destinations are switched on. Used by both the "Run backup
 * now" button and the daily scheduled job. Records the outcome on the
 * settings row either way.
 */
export async function runBackup(): Promise<BackupResult> {
  const settings = await prisma.backupSettings.upsert({
    where: { id: "backup" },
    create: { id: "backup" },
    update: {},
  });

  if (!settings.backupToGoogleDrive && !settings.backupToLocalFolder) {
    const error =
      "No backup destination is turned on — enable Google Drive and/or a local folder in Settings.";
    await prisma.backupSettings.update({
      where: { id: "backup" },
      data: { lastRunAt: new Date(), lastStatus: "error", lastError: error },
    });
    return { ok: false, error };
  }

  if (settings.backupToLocalFolder && !settings.localFolderPath?.trim()) {
    const error = "Local folder backup is on but no folder path is set.";
    await prisma.backupSettings.update({
      where: { id: "backup" },
      data: { lastRunAt: new Date(), lastStatus: "error", lastError: error },
    });
    return { ok: false, error };
  }

  try {
    const buffer = await buildWorkbookBuffer();
    const fileName = backupFileName();

    let fileUrl: string | null = null;
    let localPath: string | null = null;

    if (settings.backupToGoogleDrive) {
      if (!isDriveConfigured()) {
        throw new Error(
          "Google Drive backup is on but not configured (missing env vars).",
        );
      }
      const uploaded = await uploadBackupToDrive(fileName, buffer);
      fileUrl = uploaded.url;
    }

    if (settings.backupToLocalFolder) {
      const folder = settings.localFolderPath!.trim();
      await fs.mkdir(folder, { recursive: true });
      const xlsxPath = path.join(folder, fileName);
      await fs.writeFile(xlsxPath, buffer);
      localPath = folder;

      if (settings.includeDatabaseDump) {
        const dumpPath = path.join(folder, fileName.replace(/\.xlsx$/, ".sql"));
        await runPgDump(dumpPath);
      }
    }

    await prisma.backupSettings.update({
      where: { id: "backup" },
      data: {
        lastRunAt: new Date(),
        lastStatus: "success",
        lastError: null,
        lastFileUrl: fileUrl,
        lastLocalPath: localPath,
      },
    });

    return { ok: true, fileUrl, localPath };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Backup failed.";
    console.error("[backup] failed:", err);
    await prisma.backupSettings.update({
      where: { id: "backup" },
      data: { lastRunAt: new Date(), lastStatus: "error", lastError: message },
    });
    return { ok: false, error: message };
  }
}
