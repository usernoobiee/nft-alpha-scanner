import type { AlphaInput, AlphaOutput, CollectionStats } from "./types.js";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function scoreCollection(input: AlphaInput, stats: CollectionStats, recentSales24h: number): AlphaOutput {
  let score = 50;
  const reasons: string[] = [];
  const risks: string[] = [];
  const floor7 = stats.floorChange7d;
  const volume7 = stats.volumeChange7d;

  if (floor7 !== null) {
    if (floor7 >= 20) { score += 18; reasons.push("7-day floor momentum is strong (+20% or more)."); }
    else if (floor7 >= 5) { score += 10; reasons.push("7-day floor is trending upward."); }
    else if (floor7 <= -20) { score -= 18; risks.push("7-day floor drawdown is severe."); }
    else if (floor7 <= -5) { score -= 9; risks.push("7-day floor is trending downward."); }
  }

  if (volume7 !== null) {
    if (volume7 >= 30) { score += 15; reasons.push("7-day trading volume is accelerating strongly."); }
    else if (volume7 >= 10) { score += 8; reasons.push("7-day trading volume is increasing."); }
    else if (volume7 <= -30) { score -= 14; risks.push("7-day trading volume is contracting sharply."); }
    else if (volume7 <= -10) { score -= 7; risks.push("7-day trading volume is declining."); }
  }

  if (recentSales24h >= 50) { score += 10; reasons.push("There is meaningful sale activity in the last 24 hours."); }
  else if (recentSales24h === 0) { score -= 8; risks.push("No sales were returned for the last 24 hours."); }

  if (stats.owners !== null && stats.owners >= 1000) {
    score += 4;
    reasons.push("The collection has a broad holder base.");
  } else if (stats.owners !== null && stats.owners < 100) {
    score -= 8;
    risks.push("Holder count is low, which can increase concentration risk.");
  }

  const budgetFit = input.maxPriceEth !== undefined && stats.floorPrice !== null
    ? stats.floorPrice <= input.maxPriceEth
    : null;

  if (budgetFit === true) { score += 4; reasons.push("The current floor is within the requested budget."); }
  else if (budgetFit === false) { score -= 5; risks.push("The current floor is above the requested budget."); }

  score = Math.round(clamp(score));
  const signal: AlphaOutput["signal"] = score >= 70 ? "BUY" : score >= 45 ? "WATCH" : "AVOID";
  const riskLevel: AlphaOutput["riskLevel"] = score >= 70 && (floor7 ?? 0) >= -5 ? "LOW" : score >= 45 ? "MEDIUM" : "HIGH";
  const confidence = Number(clamp(
    0.45 + (floor7 !== null ? 0.12 : 0) + (volume7 !== null ? 0.12 : 0) +
      (stats.sales7d !== null ? 0.08 : 0) + (stats.owners !== null ? 0.06 : 0) +
      (recentSales24h > 0 ? 0.07 : 0), 0.35, 0.9).toFixed(2));

  if (reasons.length === 0) reasons.push("Insufficient positive momentum signals were observed.");
  if (risks.length === 0) risks.push("No major risk signal was inferred from the available metrics.");

  return {
    collectionSlug: input.collectionSlug,
    signal,
    score,
    confidence,
    riskLevel,
    floorPriceEth: stats.floorPrice,
    floorChange7dPct: floor7,
    volumeChange7dPct: volume7,
    sales7d: stats.sales7d,
    owners: stats.owners,
    recentSales24h,
    budgetFit,
    reasons,
    risks,
    methodology: "Heuristic score from observable OpenSea collection stats and recent sale activity. It is not financial advice and does not predict future prices.",
  };
}
