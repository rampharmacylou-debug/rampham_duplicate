import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const entries = await prisma.diaryEntry.findMany({ orderBy: { date: "desc" } });
  return NextResponse.json({ entries });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const created = await prisma.diaryEntry.create({
    data: {
      clientId:   body.clientId || null,
      clientName: (body.clientName ?? "").trim(),
      date:       body.date ?? new Date().toISOString().slice(0, 10),
      itemsTaken: (body.itemsTaken ?? "").trim(),
      qty:        Number(body.qty)       || 0,
      transport:  Number(body.transport) || 0,
      paidStatus: ["paid","partial","unpaid"].includes(body.paidStatus) ? body.paidStatus : "unpaid",
    },
  });
  return NextResponse.json({ entry: created }, { status: 201 });
}
