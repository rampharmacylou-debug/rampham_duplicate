import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

type ClientRow = {
  clientName: string;
  phone: string;
  routeName: string;
  riderPrice: number | null;
  phamPrice: number | null;
};

function sanitise(row: Record<string, unknown>): ClientRow {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const n = (v: unknown) => {
    const num = Number(v);
    return Number.isFinite(num) ? num : null;
  };

  return {
    clientName: s(row.clientName),
    phone: s(row.phone),
    routeName: s(row.routeName),
    riderPrice: n(row.riderPrice),
    phamPrice: n(row.phamPrice),
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: ClientRow[] = Array.isArray(body?.rows)
      ? body.rows.map(sanitise)
      : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: "No rows provided." }, { status: 400 });
    }
    const bad = rows.find((r) => !r.clientName);
    if (bad) {
      return NextResponse.json(
        { error: "Every row needs a client name." },
        { status: 400 },
      );
    }

    // Clients have no unique column, and this sheet routinely has many
    // rows sharing a placeholder name/phone ("." for one-off, address-only
    // deliveries) plus real clients who legitimately recur with a
    // different route each time. Matching on phone or name alone would
    // collapse all of those distinct rows into one and silently drop
    // the rest. So a row only counts as "the same client" — and gets
    // updated in place — when name, phone, AND route all match exactly;
    // anything less becomes a new row. This makes re-importing an
    // unchanged sheet a no-op, without ever merging genuinely different
    // rows into each other.
    const key = (c: { clientName: string; phone: string; routeName: string }) =>
      `${c.clientName.trim().toLowerCase()}|${c.phone.trim()}|${c.routeName.trim().toLowerCase()}`;

    const existing = await prisma.client.findMany({
      select: { id: true, clientName: true, phone: true, routeName: true },
    });
    const byKey = new Map(existing.map((c) => [key(c), c.id]));

    const toCreate: ClientRow[] = [];
    const toUpdate: { id: string; data: ClientRow }[] = [];

    for (const row of rows) {
      const existingId = byKey.get(key(row));
      if (existingId) {
        toUpdate.push({ id: existingId, data: row });
      } else {
        toCreate.push(row);
      }
    }

    const toPrismaData = (r: ClientRow) => ({
      clientName: r.clientName,
      phone: r.phone,
      routeName: r.routeName,
      riderPrice: r.riderPrice ?? 0,
      phamPrice: r.phamPrice ?? 0,
    });

    let added = 0;
    if (toCreate.length > 0) {
      const result = await prisma.client.createMany({
        data: toCreate.map(toPrismaData),
      });
      added = result.count;
    }

    let updated = 0;
    const BATCH = 50;
    for (let i = 0; i < toUpdate.length; i += BATCH) {
      const batch = toUpdate.slice(i, i + BATCH);
      await Promise.all(
        batch.map(({ id, data }) =>
          prisma.client.update({ where: { id }, data: toPrismaData(data) }),
        ),
      );
      updated += batch.length;
    }

    return NextResponse.json({ added, updated });
  } catch (err) {
    console.error("[clients/import] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed." },
      { status: 500 },
    );
  }
}
