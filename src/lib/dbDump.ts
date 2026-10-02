import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Runs `pg_dump` against the app's own DATABASE_URL and writes a plain-text
 * SQL dump to outputPath. Requires the `pg_dump` command to be available —
 * it ships with every PostgreSQL install (including the one install.ps1
 * sets up), typically at:
 *   C:\Program Files\PostgreSQL\<version>\bin\pg_dump.exe
 * If it's not on the system PATH, set PG_DUMP_PATH in .env to the full
 * path of pg_dump.exe.
 */
export async function runPgDump(outputPath: string): Promise<void> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not set — can't run pg_dump.");

  const pgDumpBin = process.env.PG_DUMP_PATH?.trim() || "pg_dump";

  try {
    await execFileAsync(pgDumpBin, ["--format=plain", "--no-owner", `--file=${outputPath}`, dbUrl]);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/not recognized|ENOENT|command not found/i.test(message)) {
      throw new Error(
        "pg_dump isn't on the system PATH. Set PG_DUMP_PATH in .env to the full path " +
          "of pg_dump.exe (usually under C:\\Program Files\\PostgreSQL\\<version>\\bin\\)."
      );
    }
    throw new Error(`pg_dump failed: ${message}`);
  }
}
