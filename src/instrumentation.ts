export async function register() {
  // Only run in the actual Node server process (not the edge runtime, and
  // not during `next build`).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBackupScheduler } = await import("@/lib/backupScheduler");
    startBackupScheduler();
  }
}
