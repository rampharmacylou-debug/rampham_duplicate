import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const trips = await prisma.transportRecord.findMany({
    where: { OR: [{ clientId: id }, { clientName: client.clientName }] },
    orderBy: { updatedAt: "desc" },
  });
  const diary = await prisma.diaryEntry.findMany({
    where: { OR: [{ clientId: id }, { clientName: client.clientName }] },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ client, trips, diary });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const updated = await prisma.client.update({
      where: { id },
      data: {
        clientName: (body.clientName ?? "").trim(),
        phone:      (body.phone      ?? "").trim(),
        routeName:  (body.routeName  ?? "").trim(),
        riderPrice: Number(body.riderPrice) || 0,
        phamPrice:  Number(body.phamPrice)  || 0,
      },
    });
    return NextResponse.json({ client: updated });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
