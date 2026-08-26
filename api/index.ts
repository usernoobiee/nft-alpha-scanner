import { getCollectionStats, getRecentSaleCount } from "../src/opensea.js";
import { scoreCollection } from "../src/scoring.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

type ToolInput = {
  collectionSlug: string;
  maxPriceEth?: number;
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

function parseJsonText(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed);
  } catch {
    // Handle a runtime adapter that passes JSON as an escaped string.
    try {
      const decoded = JSON.parse(JSON.stringify(trimmed).slice(1, -1));
      if (typeof decoded === "string") return JSON.parse(decoded);
    } catch {
      return null;
    }
    return null;
  }
}

async function readBody(req: any): Promise<unknown> {
  if (req.body !== undefined && req.body !== null) {
    return typeof req.body === "string" ? parseJsonText(req.body) : req.body;
  }

  if (typeof req.text === "function") {
    return parseJsonText(await req.text());
  }

  if (typeof req.on === "function") {
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      req.on("data", (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      req.on("end", resolve);
      req.on("error", reject);
    });

    return parseJsonText(Buffer.concat(chunks).toString("utf8"));
  }

  return null;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).setHeader("allow", "POST").json({ error: "Method not allowed" });
    return;
  }

  let body: unknown;
  try {
    body = await readBody(req);
  } catch (error) {
    console.error("Failed to read request body:", error);
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const input = parseInput(body);

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
