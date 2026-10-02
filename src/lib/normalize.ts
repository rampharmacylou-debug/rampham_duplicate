import { DiaryEntry, PaidStatus, TransportRecord } from "./types";

const VALID_PAID_STATUSES: PaidStatus[] = ["paid", "partial", "unpaid"];

export function normalizeDiaryEntry(e: Partial<DiaryEntry> & { id: string }): DiaryEntry {
  return {
    id: e.id,
    clientId: e.clientId,
    clientName: e.clientName ?? "",
    date: e.date ?? "",
    itemsTaken: e.itemsTaken ?? "",
    qty: typeof e.qty === "number" ? e.qty : Number(e.qty) || 0,
    transport: typeof e.transport === "number" ? e.transport : Number(e.transport) || 0,
    paidStatus: VALID_PAID_STATUSES.includes(e.paidStatus as PaidStatus)
      ? (e.paidStatus as PaidStatus)
      : "unpaid",
  };
}

export function normalizeTransportRecord(
  t: Partial<TransportRecord> & { id: string }
): TransportRecord {
  return {
    id: t.id,
    clientId: t.clientId,
    clientName: t.clientName ?? "",
    riderName: t.riderName ?? "",
    routeName: t.routeName ?? "",
    riderPrice: typeof t.riderPrice === "number" ? t.riderPrice : Number(t.riderPrice) || 0,
    phamPrice: typeof t.phamPrice === "number" ? t.phamPrice : Number(t.phamPrice) || 0,
    updatedAt: t.updatedAt ?? "",
  };
}
