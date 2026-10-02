import { prisma } from "@/lib/prisma";
import { runBackup } from "@/lib/backup";

// This app runs as a single always-on Node process (Windows Service / `npm
// start`), not on serverless functions — so a plain in-process interval is
// enough to schedule the daily backup. No external cron service needed.
//
// Every minute: if backups are enabled and the clock has reached (or just
// passed) the configured HH:mm and we haven't already run today, kick off
// a backup. Checking "today" off lastRunAt makes it safe to check every
// minute without double-running, and to catch up shortly after the target
// minute if the check was briefly delayed.

const CHECK_INTERVAL_MS = 60_000;

function sameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

async function tick() {
  try {
    console.log("[backup-scheduler] tick:", new Date().toLocaleString());
    const settings = await prisma.backupSettings.findUnique({
      where: { id: "backup" },
    });
    console.log("[backup-scheduler] settings:", {
      enabled: settings?.enabled,
      backupTime: settings?.backupTime,
      lastRunAt: settings?.lastRunAt,
    });

    if (!settings || !settings.enabled) return;

    const [targetH, targetM] = settings.backupTime.split(":").map(Number);
    if (Number.isNaN(targetH) || Number.isNaN(targetM)) return;

    const now = new Date();
    const targetToday = new Date(now);
    targetToday.setHours(targetH, targetM, 0, 0);

    const pastTargetTime = now.getTime() >= targetToday.getTime();
    const alreadyRanToday = settings.lastRunAt
      ? sameLocalDay(settings.lastRunAt, now)
      : false;

    if (pastTargetTime && !alreadyRanToday) {
      console.log("[backup-scheduler] running scheduled backup…");
      await runBackup();
    }
  } catch (err) {
    console.error("[backup-scheduler] tick failed:", err);
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __backupSchedulerStarted: boolean | undefined;
}

export function startBackupScheduler() {
  // Guard against being started twice (e.g. dev-mode hot reload)
  if (globalThis.__backupSchedulerStarted) return;
  globalThis.__backupSchedulerStarted = true;

  console.log("[backup-scheduler] started — checking every minute");
  setInterval(tick, CHECK_INTERVAL_MS);
  // Also check once shortly after startup, in case the target time already
  // passed today before the server came up.
  setTimeout(tick, 10_000);
}
