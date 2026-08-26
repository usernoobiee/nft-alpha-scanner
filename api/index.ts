import { getCollectionStats, getRecentSaleCount } from "../src/opensea.js";
import { scoreCollection } from "../src/scoring.js";

// Let Vercel parse application/json into req.body. The previous raw-stream
// implementation was fighting Vercel's serverless request lifecycle and
// could see an empty stream even though the client sent JSON.
export const config = {
  api: {
    bodyParser: true,
  },
};

type ToolInput = {
  collectionSlug: string;
  maxPriceEth?: number;
};

type VercelRequestLike = {
  method?: string;
  body?: unknown;
};

type VercelResponseLike = {
  status(code: number): VercelResponseLike;
  setHeader(name: string, value: string): VercelResponseLike;
  json(body: unknown): void;
};

function parseInput(value: unknown): ToolInput | null {
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const { collectionSlug, maxPriceEth } = value as Record<string, unknown>;

  if (
    typeof collectionSlug !== "string" ||
    collectionSlug.trim().length === 0 ||
    collectionSlug.length > 100 ||
    (maxPriceEth !== undefined &&
      (typeof maxPriceEth !== "number" ||
        !Number.isFinite(maxPriceEth) ||
        maxPriceEth < 0))
  ) {
    return null;
  }

  return {
    collectionSlug: collectionSlug.trim(),
    ...(maxPriceEth === undefined ? {} : { maxPriceEth }),
  };
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== "POST") {
    res.status(405).setHeader("allow", "POST").json({ error: "Method not allowed" });
    return;
  }

  const input = parseInput(req.body);
  if (!input) {
    res.status(400).json({
      error: "Invalid input",
      details: "Expected collectionSlug and an optional non-negative maxPriceEth.",
    });
    return;
  }

  try {
    const [stats, recentSales24h] = await Promise.all([
      getCollectionStats(input.collectionSlug),
      getRecentSaleCount(input.collectionSlug),
    ]);

    res.status(200).json(scoreCollection(input, stats, recentSales24h));
  } catch (error) {
    console.error("NFT Alpha Scanner invocation failed:", error);
    res.status(502).json({ error: "Marketplace data request failed" });
  }
}
