import * as XLSX from "xlsx";

export type ParsedProductRow = {
  sku: string;
  no: string;
  product: string;
  packsize: string;
  unitPrice: string;
  price: string;
  barcode: string;
};

export type ParseResult = {
  rows: ParsedProductRow[];
  skippedEmptyRows: number;
};

/** Normalize a header cell for matching */
function normHeader(s: unknown): string {
  return String(s ?? "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Clean a value — trim whitespace and remove thousands commas */
function clean(v: unknown): string {
  return String(v ?? "").trim().replace(/,/g, "");
}

// Maps any column header spelling → our internal field
const HEADER_MAP: Record<string, keyof ParsedProductRow> = {
  sku: "sku",
  skucode: "sku",
  no: "no",
  number: "no",
  sn: "no",
  product: "product",
  productname: "product",
  name: "product",
  description: "product",
  item: "product",
  packsize: "packsize",
  pack: "packsize",
  packsize2: "packsize",
  size: "packsize",
  unitprice: "unitPrice",
  unitcost: "unitPrice",
  costprice: "unitPrice",
  price: "price",
  sellingprice: "price",
  totalprice: "price",
  amount: "price",
  barcode: "barcode",
  barcode2: "barcode",
  ean: "barcode",
  upc: "barcode",
};

export async function parseProductWorkbook(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    raw: false, // formatted text — keeps leading zeros in barcodes
  });

  // Try PRICES sheet first (matches Ram Pharmacy format), else use first sheet
  const sheetName =
    workbook.SheetNames.find((n) => n.toUpperCase() === "PRICES") ??
    workbook.SheetNames[0];

  if (!sheetName) return { rows: [], skippedEmptyRows: 0 };

  const sheet = workbook.Sheets[sheetName];

  // Read as 2D array so we can find the header row ourselves
  const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  // Scan the first 20 rows for the header row (needs ≥2 recognised columns)
  let headerRowIdx = -1;
  let colToField: Record<number, keyof ParsedProductRow> = {};

  for (let i = 0; i < Math.min(grid.length, 20); i++) {
    const row = grid[i];
    const map: Record<number, keyof ParsedProductRow> = {};
    let hits = 0;

    row.forEach((cell, col) => {
      const key = normHeader(cell);
      if (HEADER_MAP[key]) {
        map[col] = HEADER_MAP[key];
        hits++;
      }
    });

    if (hits >= 2) {
      headerRowIdx = i;
      colToField = map;
      break;
    }
  }

  if (headerRowIdx === -1) {
    throw new Error(
      "Could not find column headers in the file. " +
        "Make sure the sheet has columns like: No, Product, Pack Size, Unit price, Price, Barcode."
    );
  }

  // Parse data rows
  const rows: ParsedProductRow[] = [];
  let skippedEmptyRows = 0;

  for (let i = headerRowIdx + 1; i < grid.length; i++) {
    const row = grid[i];

    const entry: ParsedProductRow = {
      sku: "",
      no: "",
      product: "",
      packsize: "",
      unitPrice: "",
      price: "",
      barcode: "",
    };

    Object.entries(colToField).forEach(([colStr, field]) => {
      entry[field] = clean(row[Number(colStr)]);
    });

    // Skip rows with no meaningful content
    const hasContent =
      entry.no || entry.product || entry.sku || entry.barcode;
    if (!hasContent) {
      skippedEmptyRows++;
      continue;
    }

    rows.push(entry);
  }

  return { rows, skippedEmptyRows };
}
