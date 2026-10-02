import { NextResponse } from "next/server";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { runPgDump } from "@/lib/dbDump";

// Lets an admin download a full database dump (every table, not just
// Products/Clients) straight to their browser right now — independent of
// the Settings toggles, for "I just want the file" moments. Requires
// pg_dump to be installed (see PG_DUMP_PATH in .env.example if it's not
// on the system PATH).
export async function GET() {
  const tmpPath = path.join(os.tmpdir(), `manifest-dbdump-${Date.now()}.sql`);
  try {
    await runPgDump(tmpPath);
    const buffer = await fs.readFile(tmpPath);
    const fileName = `Manifest-Database-Backup-${new Date().toISOString().slice(0, 10)}.sql`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not run pg_dump.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}
