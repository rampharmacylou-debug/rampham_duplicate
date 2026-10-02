export type Product = {
  id: string;
  sku: string;
  no: string;
  product: string;
  packsize: string;
  unitPrice: string;
  price: string;
  barcode: string;
  updatedAt?: string;
};

export type PaidStatus = "paid" | "partial" | "unpaid";

export type DiaryEntry = {
  id: string;
  clientId?: string;
  clientName: string;
  date: string;
  itemsTaken: string;
  qty: number;
  transport: number;
  paidStatus: PaidStatus;
};

export type TransportRecord = {
  id: string;
  clientId?: string;
  clientName: string;
  riderName: string;
  routeName: string;
  riderPrice: number;
  phamPrice: number;
  updatedAt?: string;
};

export type SavedClient = {
  id: string;
  clientName: string;
  phone: string;
  routeName: string;
  riderPrice: number;
  phamPrice: number;
};
