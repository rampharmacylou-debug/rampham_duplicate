import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clients = await prisma.client.findMany({ orderBy: { clientName: "asc" } });
  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const created = await prisma.client.create({
    data: {
      clientName: (body.clientName ?? "").trim(),
      phone:      (body.phone      ?? "").trim(),
      routeName:  (body.routeName  ?? "").trim(),
      riderPrice: Number(body.riderPrice) || 0,
      phamPrice:  Number(body.phamPrice)  || 0,
    },
  });
  return NextResponse.json({ client: created }, { status: 201 });
}
