import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const updated = await prisma.transportRecord.update({
      where: { id },
      data: {
        clientId:   body.clientId || null,
        clientName: (body.clientName ?? "").trim(),
        riderName:  (body.riderName  ?? "").trim(),
        routeName:  (body.routeName  ?? "").trim(),
        riderPrice: Number(body.riderPrice) || 0,
        phamPrice:  Number(body.phamPrice)  || 0,
      },
    });
    return NextResponse.json({ trip: updated });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.transportRecord.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
