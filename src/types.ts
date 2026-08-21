export interface CollectionStats {
  floorPrice: number | null;
  volume7d: number | null;
  volume30d: number | null;
  sales7d: number | null;
  sales30d: number | null;
  owners: number | null;
  totalVolume: number | null;
  averagePrice: number | null;
  floorChange1d: number | null;
  floorChange7d: number | null;
  floorChange30d: number | null;
  volumeChange1d: number | null;
  volumeChange7d: number | null;
  volumeChange30d: number | null;
}

export interface AlphaInput {
  collectionSlug: string;
  maxPriceEth?: number;
}

export interface AlphaOutput {
  collectionSlug: string;
  signal: "BUY" | "WATCH" | "AVOID";
  score: number;
  confidence: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  floorPriceEth: number | null;
  floorChange7dPct: number | null;
  volumeChange7dPct: number | null;
  sales7d: number | null;
  owners: number | null;
  recentSales24h: number;
  budgetFit: boolean | null;
  reasons: string[];
  risks: string[];
  methodology: string;
}
