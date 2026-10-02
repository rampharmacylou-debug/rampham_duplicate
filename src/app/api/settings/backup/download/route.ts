import { NextResponse } from "next/server";
import { buildWorkbookBuffer, backupFileName } from "@/lib/backup";

// Lets an admin download today's Products + Clients export straight to
// their browser, independent of whatever Drive/local-folder settings are
// saved — for "I just want the file right now" moments.
export async function GET() {
  try {
    const buffer = await buildWorkbookBuffer();
    const fileName = backupFileName();
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not build the export.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
