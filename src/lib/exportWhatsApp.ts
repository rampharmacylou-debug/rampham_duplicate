import { TransportRecord } from "./types";

/**
 * Formats trips as one line each: "{rider name} {route}-{rider price}",
 * then opens WhatsApp (web or app, whichever the device resolves) with the
 * message prefilled via wa.me. The user still presses send themselves.
 */
export function exportTripsToWhatsApp(trips: TransportRecord[]) {
  if (trips.length === 0) return;

  const lines = trips.map((t) => {
    const rider = t.riderName.trim() || "Unassigned rider";
    const route = t.routeName.trim() || "Unspecified route";
    return `${rider} ${route}-${t.riderPrice.toLocaleString("en-KE")}`;
  });

  const text = lines.join("\n");
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}
