import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const trips = await prisma.transportRecord.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ trips });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const created = await prisma.transportRecord.create({
    data: {
      clientId:   body.clientId || null,
      clientName: (body.clientName ?? "").trim(),
      riderName:  (body.riderName  ?? "").trim(),
      routeName:  (body.routeName  ?? "").trim(),
      riderPrice: Number(body.riderPrice) || 0,
      phamPrice:  Number(body.phamPrice)  || 0,
    },
  });
  return NextResponse.json({ trip: created }, { status: 201 });
}
