import { google } from "googleapis";
import { Readable } from "stream";

function getEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : null;
}

export function isDriveConfigured(): boolean {
  return Boolean(
    getEnv("GOOGLE_OAUTH_CLIENT_ID") &&
    getEnv("GOOGLE_OAUTH_CLIENT_SECRET") &&
    getEnv("GOOGLE_OAUTH_REFRESH_TOKEN") &&
    getEnv("GOOGLE_DRIVE_FOLDER_ID"),
  );
}

function getAuth() {
  const clientId = getEnv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = getEnv("GOOGLE_OAUTH_CLIENT_SECRET");
  const refreshToken = getEnv("GOOGLE_OAUTH_REFRESH_TOKEN");

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

/**
 * Uploads an .xlsx backup file to the configured Google Drive folder.
 */
export async function uploadBackupToDrive(fileName: string, fileBytes: Buffer) {
  const auth = getAuth();
  const folderId = getEnv("GOOGLE_DRIVE_FOLDER_ID");

  if (!auth || !folderId) {
    throw new Error(
      "Google Drive backup is not configured. Check the OAuth environment variables and GOOGLE_DRIVE_FOLDER_ID.",
    );
  }

  const drive = google.drive({
    version: "v3",
    auth,
  });

  const mimeType =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
      mimeType,
    },

    media: {
      mimeType,
      body: Readable.from(fileBytes),
    },

    fields: "id, webViewLink",
  });

  return {
    id: res.data.id ?? null,
    url: res.data.webViewLink ?? null,
  };
}
