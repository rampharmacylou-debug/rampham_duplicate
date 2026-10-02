import { NextResponse } from "next/server";
import { runBackup } from "@/lib/backup";

export async function POST() {
  const result = await runBackup();
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, fileUrl: result.fileUrl, localPath: result.localPath });
}
