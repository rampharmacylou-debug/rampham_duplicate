import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Same numeric coercion used by the Excel import route — a Float? column
// can't accept a raw string (not even ""), which is what was crashing
// manual "Add product" submissions (the form sends unitPrice/price as
// plain text input strings).
function toFloatOrNull(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const num = Number(v);
  return Number.isFinite(num) ? num : null;
}

export async function GET() {
  const products = await prisma.product.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ products });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const created = await prisma.product.create({
    data: {
      sku:       (body.sku       ?? "").trim(),
      no:        (body.no        ?? "").trim(),
      product:   (body.product   ?? "").trim(),
      packsize:  (body.packsize  ?? "").trim(),
      unitPrice: toFloatOrNull(body.unitPrice),
      price:     toFloatOrNull(body.price),
      barcode:   (body.barcode   ?? "").trim(),
    },
  });
  return NextResponse.json({ product: created }, { status: 201 });
}
