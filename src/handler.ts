import { createToolHandler } from "@opensea/tool-sdk";
import { z } from "zod/v4";
import { manifest } from "./manifest.js";
import { getCollectionStats, getRecentSaleCount } from "./opensea.js";
import { scoreCollection } from "./scoring.js";

const InputSchema = z.object({
  collectionSlug: z.string().min(1).max(100),
  maxPriceEth: z.number().nonnegative().optional(),
});

const OutputSchema = z.object({
  collectionSlug: z.string(),
  signal: z.enum(["BUY", "WATCH", "AVOID"]),
  score: z.number().int().min(0).max(100),
  confidence: z.number().min(0).max(1),
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH"]),
  floorPriceEth: z.number().nullable(),
  floorChange7dPct: z.number().nullable(),
  volumeChange7dPct: z.number().nullable(),
  sales7d: z.number().nullable(),
  owners: z.number().nullable(),
  recentSales24h: z.number().int().nonnegative(),
  budgetFit: z.boolean().nullable(),
  reasons: z.array(z.string()),
  risks: z.array(z.string()),
  methodology: z.string(),
});

export const toolHandler = createToolHandler({
  manifest,
  inputSchema: InputSchema,
  outputSchema: OutputSchema,
  gates: [],
  handler: async (input) => {
    const [stats, recentSales24h] = await Promise.all([
      getCollectionStats(input.collectionSlug),
      getRecentSaleCount(input.collectionSlug),
    ]);
    return scoreCollection(input, stats, recentSales24h);
  },
});
