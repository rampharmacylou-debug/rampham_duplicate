import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isDriveConfigured } from "@/lib/googleDrive";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function GET() {
  const settings = await prisma.backupSettings.upsert({
    where: { id: "backup" },
    create: { id: "backup" },
    update: {},
  });
  return NextResponse.json({ settings, driveConfigured: isDriveConfigured() });
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const data: {
    enabled?: boolean;
    backupTime?: string;
    backupToGoogleDrive?: boolean;
    backupToLocalFolder?: boolean;
    localFolderPath?: string | null;
    includeDatabaseDump?: boolean;
  } = {};

  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (typeof body.backupToGoogleDrive === "boolean") data.backupToGoogleDrive = body.backupToGoogleDrive;
  if (typeof body.backupToLocalFolder === "boolean") data.backupToLocalFolder = body.backupToLocalFolder;
  if (typeof body.includeDatabaseDump === "boolean") data.includeDatabaseDump = body.includeDatabaseDump;
  if (typeof body.localFolderPath === "string") data.localFolderPath = body.localFolderPath.trim() || null;

  if (typeof body.backupTime === "string") {
    if (!TIME_RE.test(body.backupTime)) {
      return NextResponse.json({ error: "backupTime must be in HH:mm 24h format." }, { status: 400 });
    }
    data.backupTime = body.backupTime;
  }

  if (data.backupToLocalFolder && data.localFolderPath === null) {
    return NextResponse.json(
      { error: "Enter a folder path before turning on local-folder backups." },
      { status: 400 }
    );
  }

  const settings = await prisma.backupSettings.upsert({
    where: { id: "backup" },
    create: { id: "backup", ...data },
    update: data,
  });

  return NextResponse.json({ settings, driveConfigured: isDriveConfigured() });
}
