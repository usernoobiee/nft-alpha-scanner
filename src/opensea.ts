import type { CollectionStats } from "./types.js";

const API_BASE = "https://api.opensea.io/api/v2";

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function firstNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const n = numberOrNull(value);
    if (n !== null) return n;
  }
  return null;
}

async function openseaGet<T>(path: string): Promise<T> {
  const apiKey = process.env.OPENSEA_API_KEY;
  if (!apiKey) throw new Error("OPENSEA_API_KEY is not configured");
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { accept: "application/json", "x-api-key": apiKey },
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`OpenSea API ${response.status}: ${body.slice(0, 500)}`);
  }
  return (await response.json()) as T;
}

export async function getCollectionStats(slug: string): Promise<CollectionStats> {
  const raw = await openseaGet<any>(`/collections/${encodeURIComponent(slug)}/stats`);
  const total = raw?.total ?? raw ?? {};
  const oneDay = raw?.one_day ?? raw?.oneDay ?? {};
  const sevenDay = raw?.seven_day ?? raw?.sevenDay ?? {};
  const thirtyDay = raw?.thirty_day ?? raw?.thirtyDay ?? {};
  return {
    floorPrice: firstNumber(total.floor_price, total.floorPrice),
    volume7d: firstNumber(sevenDay.volume, sevenDay.total_volume),
    volume30d: firstNumber(thirtyDay.volume, thirtyDay.total_volume),
    sales7d: firstNumber(sevenDay.sales),
    sales30d: firstNumber(thirtyDay.sales),
    owners: firstNumber(total.num_owners, total.numOwners),
    totalVolume: firstNumber(total.volume, total.total_volume),
    averagePrice: firstNumber(total.average_price, total.averagePrice),
    floorChange1d: firstNumber(oneDay.floor_price_change, oneDay.floorPriceChange, oneDay.floor_change),
    floorChange7d: firstNumber(sevenDay.floor_price_change, sevenDay.floorPriceChange, sevenDay.floor_change),
    floorChange30d: firstNumber(thirtyDay.floor_price_change, thirtyDay.floorPriceChange, thirtyDay.floor_change),
    volumeChange1d: firstNumber(oneDay.volume_change, oneDay.volumeChange),
    volumeChange7d: firstNumber(sevenDay.volume_change, sevenDay.volumeChange),
    volumeChange30d: firstNumber(thirtyDay.volume_change, thirtyDay.volumeChange),
  };
}

export async function getRecentSaleCount(slug: string): Promise<number> {
  const after = Math.floor(Date.now() / 1000) - 24 * 60 * 60;
  const params = new URLSearchParams({ event_type: "sale", limit: "200", after: String(after) });
  const raw = await openseaGet<any>(`/events/collection/${encodeURIComponent(slug)}?${params}`);
  const events = raw?.asset_events ?? raw?.events ?? [];
  return Array.isArray(events) ? events.length : 0;
}
