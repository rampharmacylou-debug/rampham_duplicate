import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Increase body size limit for this route
export const maxDuration = 60;

type ProductRow = {
  sku: string;
  no: string;
  product: string;
  packsize: string;
  barcode: string;
  unitPrice: number | null;
  price: number | null;
};

function sanitise(row: Record<string, unknown>): ProductRow {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const n = (v: unknown) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : null;
  };

  return {
    sku: s(row.sku),
    no: s(row.no),
    product: s(row.product),
    packsize: s(row.packsize),
    barcode: s(row.barcode),
    unitPrice: n(row.unitPrice),
    price: n(row.price),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: ProductRow[] = Array.isArray(body?.rows)
      ? body.rows.map(sanitise)
      : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows provided." }, { status: 400 });
    }

    // Get all existing products' no values in one query
    const existing = await prisma.product.findMany({
      select: { id: true, no: true },
    });
    const existingByNo = new Map(
      existing.filter((p) => p.no).map((p) => [p.no, p.id]),
    );

    const toCreate: ProductRow[] = [];
    const toUpdate: { id: string; data: ProductRow }[] = [];

    for (const row of rows) {
      const existingId = row.no ? existingByNo.get(row.no) : undefined;
      if (existingId) {
        toUpdate.push({ id: existingId, data: row });
      } else {
        toCreate.push(row);
      }
    }

    // Bulk insert all new rows in one query
    let added = 0;
    if (toCreate.length > 0) {
      const result = await prisma.product.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
      added = result.count;
    }

    // Update existing in batches of 50
    let updated = 0;
    const BATCH = 50;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      await Promise.all(
        batch.map(({ id, data }) =>
          prisma.product.update({ where: { id }, data }),
        ),
      );
      updated += batch.length;
    }

    return NextResponse.json({ added, updated });
  } catch (err) {
    console.error("[import] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed." },
      { status: 500 },
    );
  }
}
