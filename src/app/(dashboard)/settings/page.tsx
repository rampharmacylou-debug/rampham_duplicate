"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Cloud, HardDrive, Database, PlayCircle, Download } from "lucide-react";
import { useRole } from "@/lib/roleContext";

type BackupSettings = {
  id: string;
  enabled: boolean;
  backupTime: string;
  backupToGoogleDrive: boolean;
  backupToLocalFolder: boolean;
  localFolderPath: string | null;
  includeDatabaseDump: boolean;
  lastRunAt: string | null;
  lastStatus: "success" | "error" | null;
  lastError: string | null;
  lastFileUrl: string | null;
  lastLocalPath: string | null;
};

type Banner = { kind: "success" | "error"; message: string };

export default function SettingsPage() {
  const { isAdmin } = useRole();

  const [settings, setSettings] = useState<BackupSettings | null>(null);
  const [driveConfigured, setDriveConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingDump, setDownloadingDump] = useState(false);
  const [banner, setBanner] = useState<Banner | null>(null);

  // Local, editable copies of the form fields
  const [enabled, setEnabled] = useState(false);
  const [backupTime, setBackupTime] = useState("20:00");
  const [toDrive, setToDrive] = useState(true);
  const [toLocal, setToLocal] = useState(false);
  const [localPath, setLocalPath] = useState("");
  const [includeDump, setIncludeDump] = useState(false);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 6000);
    return () => clearTimeout(t);
  }, [banner]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/backup", { cache: "no-store" });
      const data = await res.json();
      const s: BackupSettings = data.settings;
      setSettings(s);
      setDriveConfigured(Boolean(data.driveConfigured));
      setEnabled(s.enabled);
      setBackupTime(s.backupTime);
      setToDrive(s.backupToGoogleDrive);
      setToLocal(s.backupToLocalFolder);
      setLocalPath(s.localFolderPath ?? "");
      setIncludeDump(s.includeDatabaseDump);
    } catch {
      setBanner({ kind: "error", message: "Could not load backup settings." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave() {
    if (toLocal && !localPath.trim()) {
      setBanner({ kind: "error", message: "Enter a folder path before turning on local-folder backups." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings/backup", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled,
          backupTime,
          backupToGoogleDrive: toDrive,
          backupToLocalFolder: toLocal,
          localFolderPath: localPath,
          includeDatabaseDump: includeDump,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to save.");
      setSettings(data.settings);
      setBanner({ kind: "success", message: "Backup settings saved." });
    } catch (err) {
      setBanner({ kind: "error", message: err instanceof Error ? err.message : "Failed to save." });
    } finally {
      setSaving(false);
    }
  }

  async function handleRunNow() {
    setRunning(true);
    try {
      const res = await fetch("/api/settings/backup/run", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Backup failed.");
      const parts = [
        data.fileUrl ? "uploaded to Drive" : null,
        data.localPath ? `saved to ${data.localPath}` : null,
      ].filter(Boolean);
      setBanner({ kind: "success", message: `Backup complete — ${parts.join(" and ")}.` });
      await load();
    } catch (err) {
      setBanner({ kind: "error", message: err instanceof Error ? err.message : "Backup failed." });
    } finally {
      setRunning(false);
    }
  }

  async function downloadFile(url: string, fallbackName: string) {
    const res = await fetch(url);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error ?? "Download failed.");
    }
    const blob = await res.blob();
    const disposition = res.headers.get("Content-Disposition") ?? "";
    const match = disposition.match(/filename="(.+)"/);
    const fileName = match?.[1] ?? fallbackName;

    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  }

  async function handleDownloadNow() {
    setDownloading(true);
    try {
      await downloadFile("/api/settings/backup/download", "Manifest-Backup.xlsx");
    } catch (err) {
      setBanner({ kind: "error", message: err instanceof Error ? err.message : "Download failed." });
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadDumpNow() {
    setDownloadingDump(true);
    try {
      await downloadFile("/api/settings/backup/download-dump", "Manifest-Database-Backup.sql");
    } catch (err) {
      setBanner({ kind: "error", message: err instanceof Error ? err.message : "Download failed." });
    } finally {
      setDownloadingDump(false);
    }
  }

  if (loading) return <div className="py-20 text-center text-sm text-muted">Loading settings…</div>;

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-dashed border-hairline bg-surface/60 px-4 py-10 text-center text-sm text-muted">
        Switch to Admin to manage backup settings.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-hairline pb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">Backups — where they go, what they include, and when.</p>
      </div>

      {banner && (
        <div className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${
          banner.kind === "success"
            ? "border-success/30 bg-success/10 text-success"
            : "border-danger/30 bg-danger/10 text-danger"
        }`}>
          {banner.kind === "success"
            ? <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
            : <AlertCircle size={17} className="mt-0.5 shrink-0" />}
          <span>{banner.message}</span>
        </div>
      )}

      {/* Quick, no-settings-needed downloads */}
      <div className="rounded-lg border border-hairline bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-ink">Download Excel now</h2>
            <p className="mt-1 text-sm text-muted">
              Products + Clients, exported right now, straight to your Downloads folder — no setup needed.
            </p>
          </div>
          <button
            onClick={handleDownloadNow}
            disabled={downloading}
            className="flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-60"
          >
            <Download size={15} />
            {downloading ? "Preparing…" : "Download .xlsx"}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
          <div>
            <h2 className="flex items-center gap-1.5 font-display text-base font-semibold text-ink">
              <Database size={15} />
              Download full database backup now
            </h2>
            <p className="mt-1 text-sm text-muted">
              Every table, not just Products/Clients — a raw <code>pg_dump</code> file, downloaded
              straight to your PC. Requires <code>pg_dump</code> to be installed (it is, alongside PostgreSQL).
            </p>
          </div>
          <button
            onClick={handleDownloadDumpNow}
            disabled={downloadingDump}
            className="flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-60"
          >
            <Download size={15} />
            {downloadingDump ? "Running pg_dump…" : "Download .sql"}
          </button>
        </div>
      </div>

      {/* Destinations + schedule */}
      <div className="rounded-lg border border-hairline bg-surface p-5 space-y-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Cloud size={18} className="text-accent" />
            <h2 className="font-display text-base font-semibold text-ink">Backup destinations</h2>
          </div>
          <p className="mt-1.5 text-sm text-muted">
            Pick where backups should go. Both can be on at once. The daily schedule below and the
            &quot;Run backup now&quot; button both use whatever is checked here.
          </p>
        </div>

        {!driveConfigured && toDrive && (
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm text-danger">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>
              Google Drive isn&apos;t configured yet. Set <code>GOOGLE_SERVICE_ACCOUNT_EMAIL</code>,{" "}
              <code>GOOGLE_PRIVATE_KEY</code>, and <code>GOOGLE_DRIVE_FOLDER_ID</code> in your{" "}
              <code>.env</code> file, then restart the app.
            </span>
          </div>
        )}

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={toDrive}
            onChange={(e) => setToDrive(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-hairline accent-[var(--color-accent,theme(colors.blue.600))]"
          />
          <span>
            <span className="block font-medium text-ink">Upload to Google Drive</span>
            <span className="block text-muted">Goes to the shared backup folder configured in .env.</span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={toLocal}
            onChange={(e) => setToLocal(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-hairline accent-[var(--color-accent,theme(colors.blue.600))]"
          />
          <span className="flex-1">
            <span className="block font-medium text-ink">Save to a folder on this PC</span>
            <span className="block text-muted">
              Written directly to a folder on the server machine — useful for scheduled backups
              since there&apos;s no browser open to download into.
            </span>
            {toLocal && (
              <input
                type="text"
                value={localPath}
                onChange={(e) => setLocalPath(e.target.value)}
                placeholder="e.g. C:\ManifestBackups"
                className="mt-2 w-full rounded-md border border-hairline bg-white px-3 py-2 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
              />
            )}
          </span>
        </label>

        <label className={`flex items-start gap-3 text-sm ${!toLocal ? "opacity-50" : ""}`}>
          <input
            type="checkbox"
            checked={includeDump}
            disabled={!toLocal}
            onChange={(e) => setIncludeDump(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-hairline accent-[var(--color-accent,theme(colors.blue.600))]"
          />
          <span>
            <span className="flex items-center gap-1.5 font-medium text-ink">
              <Database size={14} />
              Also create a full database backup (pg_dump)
            </span>
            <span className="block text-muted">
              A complete raw copy of every table — not just Products/Clients — saved as a{" "}
              <code>.sql</code> file in the same local folder. Requires{" "}
              <code>pg_dump</code> to be installed (it is, alongside PostgreSQL).
              {!toLocal && " Turn on \u201cSave to a folder on this PC\u201d to use this."}
            </span>
          </span>
        </label>

        <div className="border-t border-hairline pt-5">
          <div className="flex items-center gap-2.5">
            <HardDrive size={18} className="text-accent" />
            <h2 className="font-display text-base font-semibold text-ink">Daily schedule</h2>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                onClick={() => setEnabled((v) => !v)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  enabled ? "bg-accent" : "bg-hairline"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-ink">
                {enabled ? "Daily backup enabled" : "Daily backup disabled"}
              </span>
            </label>

            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium text-ink">Backup time</span>
              <input
                type="time"
                value={backupTime}
                onChange={(e) => setBackupTime(e.target.value)}
                className="rounded-md border border-hairline bg-white px-3 py-1.5 text-sm text-text outline-none focus:border-accent focus:ring-1 focus:ring-accent/40"
              />
            </label>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-surface hover:bg-accent/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          <button
            onClick={handleRunNow}
            disabled={running}
            className="flex items-center gap-1.5 rounded-md border border-hairline px-4 py-2 text-sm font-medium text-ink hover:bg-canvas disabled:opacity-60"
          >
            <PlayCircle size={15} />
            {running ? "Running…" : "Run backup now"}
          </button>
        </div>

        {settings?.lastRunAt && (
          <div className="border-t border-hairline pt-4 text-sm">
            <p className="text-muted">
              Last run: <span className="text-ink">{new Date(settings.lastRunAt).toLocaleString()}</span>{" "}
              —{" "}
              <span className={settings.lastStatus === "success" ? "text-success" : "text-danger"}>
                {settings.lastStatus === "success" ? "Success" : "Failed"}
              </span>
            </p>
            {settings.lastStatus === "error" && settings.lastError && (
              <p className="mt-1 text-danger">{settings.lastError}</p>
            )}
            {settings.lastFileUrl && (
              <a
                href={settings.lastFileUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-block text-accent hover:underline"
              >
                Open latest Drive backup →
              </a>
            )}
            {settings.lastLocalPath && (
              <p className="mt-1 text-muted">Local copy saved to: {settings.lastLocalPath}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
