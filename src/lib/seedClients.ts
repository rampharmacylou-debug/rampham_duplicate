import { SavedClient } from "./types";
import { makeId } from "./useLocalCollection";

export const CLIENTS_STORAGE_KEY = "manifest.clients";

export const SEED_CLIENTS: SavedClient[] = [
  {
    id: makeId(),
    clientName: "Acme Traders",
    routeName: "Westlands – CBD",
    phone: "0712345678",
    riderPrice: 300,
    phamPrice: 50,
  },
  {
    id: makeId(),
    clientName: "Greenfields Ltd",
    routeName: "Industrial Area – CBD",
    phone: "0712345678",
    riderPrice: 450,
    phamPrice: 70,
  },
];
