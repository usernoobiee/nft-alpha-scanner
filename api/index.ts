import { getCollectionStats, getRecentSaleCount } from "../src/opensea.js";
import { scoreCollection } from "../src/scoring.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

type VercelRequestLike = {
  method?: string;
  on(event: "data" | "end" | "error", listener: (...args: any[]) => void): void;
};

type VercelResponseLike = {
  status(code: number): VercelResponseLike;
  setHeader(name: string, value: string): VercelResponseLike;
  send(body: string): void;
};

type ToolInput = {
  collectionSlug: string;
  maxPriceEth?: number;
};

function readRawBody(req: VercelRequestLike): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(res: VercelResponseLike, status: number, body: unknown): void {
  res.status(status).setHeader("content-type", "application/json");
  res.send(JSON.stringify(body));
}

function parseInput(body: string): ToolInput | null {
  try {
    const value: unknown = JSON.parse(body);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

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
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== "POST") {
    res.status(405).setHeader("allow", "POST");
    return json(res, 405, { error: "Method not allowed" });
  }

  const input = parseInput(await readRawBody(req));
  if (!input) {
    return json(res, 400, {
      error: "Invalid input",
      details: "Expected collectionSlug and an optional non-negative maxPriceEth.",
    });
  }

  try {
    const [stats, recentSales24h] = await Promise.all([
      getCollectionStats(input.collectionSlug),
      getRecentSaleCount(input.collectionSlug),
    ]);

    return json(res, 200, scoreCollection(input, stats, recentSales24h));
  } catch (error) {
    console.error("NFT Alpha Scanner invocation failed:", error);
    return json(res, 502, { error: "Marketplace data request failed" });
  }
}
