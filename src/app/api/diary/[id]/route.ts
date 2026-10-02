import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const updated = await prisma.diaryEntry.update({
      where: { id },
      data: {
        clientId:   body.clientId || null,
        clientName: (body.clientName ?? "").trim(),
        date:       body.date,
        itemsTaken: (body.itemsTaken ?? "").trim(),
        qty:        Number(body.qty)       || 0,
        transport:  Number(body.transport) || 0,
        paidStatus: ["paid","partial","unpaid"].includes(body.paidStatus) ? body.paidStatus : "unpaid",
      },
    });
    return NextResponse.json({ entry: updated });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.diaryEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
}
