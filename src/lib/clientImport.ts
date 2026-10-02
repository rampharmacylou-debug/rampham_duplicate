import * as XLSX from "xlsx";

export type ParsedClientRow = {
  clientName: string;
  phone: string;
  routeName: string;
  riderPrice: string;
  phamPrice: string;
};

export type ParseResult = {
  rows: ParsedClientRow[];
  skippedEmptyRows: number;
};

/** Normalize a header cell for matching */
function normHeader(s: unknown): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Clean a value — trim whitespace, currency symbols, and thousands commas */
function clean(v: unknown): string {
  return String(v ?? "")
    .trim()
    .replace(/,/g, "")
    .replace(/^(ksh|kes|\$)\s*/i, "");
}

// Exact header spellings we recognise outright.
const HEADER_MAP: Record<string, keyof ParsedClientRow> = {
  clientname: "clientName",
  client: "clientName",
  name: "clientName",
  customer: "clientName",
  customername: "clientName",
  buyername: "clientName",
  shopname: "clientName",
  companyname: "clientName",
  contactperson: "clientName",
  contactname: "clientName",
  phone: "phone",
  phonenumber: "phone",
  mobile: "phone",
  mobilenumber: "phone",
  cell: "phone",
  cellnumber: "phone",
  tel: "phone",
  telephone: "phone",
  whatsapp: "phone",
  whatsappnumber: "phone",
  msisdn: "phone",
  contactno: "phone",
  contactnumber: "phone",
  route: "routeName",
  routename: "routeName",
  area: "routeName",
  location: "routeName",
  address: "routeName",
  deliveryaddress: "routeName",
  deliverylocation: "routeName",
  zone: "routeName",
  destination: "routeName",
  riderprice: "riderPrice",
  rider: "riderPrice",
  riderfee: "riderPrice",
  ridercost: "riderPrice",
  deliveryfee: "riderPrice",
  deliverycost: "riderPrice",
  transportfee: "riderPrice",
  transportcost: "riderPrice",
  transportprice: "riderPrice",
  phamprice: "phamPrice",
  pham: "phamPrice",
  pharmprice: "phamPrice",
  pharmacyprice: "phamPrice",
  itemcost: "phamPrice",
  itemprice: "phamPrice",
  productcost: "phamPrice",
  productprice: "phamPrice",
};

// Fallback substring matching for header spellings we haven't seen before.
// Checked in this order (most specific field first) so that, e.g., a
// column called "Route Name" is claimed by routeName's "route" pattern
// before it can fall through to clientName's generic "name" pattern.
const FUZZY_PATTERNS: { field: keyof ParsedClientRow; patterns: string[] }[] = [
  {
    field: "routeName",
    patterns: [
      "route",
      "area",
      "location",
      "address",
      "zone",
      "destination",
      "delivery",
    ],
  },
  {
    field: "riderPrice",
    patterns: [
      "rider",
      "transportfee",
      "transportcost",
      "deliveryfee",
      "deliverycost",
    ],
  },
  {
    field: "phamPrice",
    patterns: [
      "pham",
      "pharm",
      "itemcost",
      "itemprice",
      "productcost",
      "productprice",
    ],
  },
  {
    field: "phone",
    patterns: [
      "phone",
      "mobile",
      "cell",
      "whatsapp",
      "msisdn",
      "contactno",
      "contactnumber",
      "telno",
    ],
  },
  {
    field: "clientName",
    patterns: [
      "client",
      "customer",
      "buyer",
      "shopname",
      "companyname",
      "contactperson",
      "contactname",
      "name",
    ],
  },
];

function matchField(headerCell: unknown): keyof ParsedClientRow | null {
  const key = normHeader(headerCell);
  if (!key) return null;
  if (HEADER_MAP[key]) return HEADER_MAP[key];
  for (const { field, patterns } of FUZZY_PATTERNS) {
    if (patterns.some((p) => key.includes(p))) return field;
  }
  return null;
}

type HeaderMatch = {
  sheetName: string;
  headerRowIdx: number;
  colToField: Record<number, keyof ParsedClientRow>;
  grid: unknown[][];
  score: number;
};

export async function parseClientWorkbook(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer, {
    type: "array",
    raw: false, // formatted text — keeps leading zeros in phone numbers
  });

  if (workbook.SheetNames.length === 0)
    return { rows: [], skippedEmptyRows: 0 };

  // Scan every sheet and every one of its first 20 rows for a header row,
  // and keep whichever candidate recognises the most columns. This means
  // the importer isn't tied to a sheet literally named "Clients", or to
  // columns being in a particular order — it finds the best match wherever
  // it is, as long as at least a client-name-ish column is present.
  let best: HeaderMatch | null = null;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: false,
    });

    for (let i = 0; i < Math.min(grid.length, 20); i++) {
      const row = grid[i];
      const map: Record<number, keyof ParsedClientRow> = {};
      let score = 0;
      let hasName = false;

      row.forEach((cell, col) => {
        const field = matchField(cell);
        if (field) {
          map[col] = field;
          score++;
          if (field === "clientName") hasName = true;
        }
      });

      // A usable header row needs a recognisable name column — without
      // that there's nothing to key a client on.
      if (hasName && (!best || score > best.score)) {
        best = { sheetName, headerRowIdx: i, colToField: map, grid, score };
      }
    }
  }

  if (!best) {
    throw new Error(
      "Could not find a client name column in any sheet of this file. " +
        "Make sure at least one column is named something like: Client Name, Customer, or Name " +
        "(Phone, Route, Rider Price, and Pham Price are recognised too, under many common spellings).",
    );
  }

  const { grid, headerRowIdx, colToField } = best;

  // Parse data rows
  const rows: ParsedClientRow[] = [];
  let skippedEmptyRows = 0;

  for (let i = headerRowIdx + 1; i < grid.length; i++) {
    const row = grid[i];

    const entry: ParsedClientRow = {
      clientName: "",
      phone: "",
      routeName: "",
      riderPrice: "",
      phamPrice: "",
    };

    Object.entries(colToField).forEach(([colStr, field]) => {
      entry[field] = clean(row[Number(colStr)]);
    });

    // Skip rows with no meaningful content
    const hasContent = entry.clientName || entry.phone;
    if (!hasContent) {
      skippedEmptyRows++;
      continue;
    }

    rows.push(entry);
  }

  return { rows, skippedEmptyRows };
}
