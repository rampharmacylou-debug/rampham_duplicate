import { google } from "googleapis";

type ExportableProduct = {
  no: string | null;
  product: string;
  packsize: string | null;
  unitPrice: number | null;
  price: number | null;
  barcode: string | null;
  sku: string | null;
};

const HEADER = ["No", "Product", "Pack Size", "Unit Price", "Price", "Barcode", "SKU"];

function getEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v : null;
}

export function isSheetsConfigured(): boolean {
  return Boolean(
    getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL") &&
      getEnv("GOOGLE_PRIVATE_KEY") &&
      getEnv("GOOGLE_SHEET_ID")
  );
}

/**
 * Overwrites the target sheet tab with the full current product list.
 * Requires three env vars:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  - from a Google Cloud service account
 *   GOOGLE_PRIVATE_KEY            - that service account's private key
 *   GOOGLE_SHEET_ID               - the target spreadsheet's ID (from its URL)
 * Optional:
 *   GOOGLE_SHEET_TAB              - tab/sheet name, defaults to "Products"
 * The spreadsheet must be shared with the service account's email as an
 * Editor, or writes will be rejected with a permissions error.
 */
export async function exportProductsToSheet(products: ExportableProduct[]) {
  const email = getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const rawKey = getEnv("GOOGLE_PRIVATE_KEY");
  const sheetId = getEnv("GOOGLE_SHEET_ID");
  const tab = getEnv("GOOGLE_SHEET_TAB") ?? "Products";

  if (!email || !rawKey || !sheetId) {
    throw new Error("Google Sheets export is not configured (missing env vars).");
  }

  // Env vars stored on Vercel/`.env` often have literal \n instead of real
  // newlines in a private key — normalize either form.
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });

  const rows = products.map((p) => [
    p.no ?? "",
    p.product ?? "",
    p.packsize ?? "",
    p.unitPrice ?? "",
    p.price ?? "",
    p.barcode ?? "",
    p.sku ?? "",
  ]);

  // Clear the whole tab first so a shrinking product list doesn't leave
  // stale rows behind, then write the header + fresh data in one call.
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `${tab}!A:Z`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${tab}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [HEADER, ...rows] },
  });

  return { rows: rows.length };
}
