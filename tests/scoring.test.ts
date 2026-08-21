import { strict as assert } from "node:assert";
import { scoreCollection } from "../src/scoring.js";

const base = {
  floorPrice: 1,
  volume7d: 100,
  volume30d: 400,
  sales7d: 50,
  sales30d: 180,
  owners: 1500,
  totalVolume: 2000,
  averagePrice: 1.2,
  floorChange1d: 2,
  floorChange7d: 12,
  floorChange30d: 4,
  volumeChange1d: 5,
  volumeChange7d: 18,
  volumeChange30d: 8,
};

const result = scoreCollection({ collectionSlug: "example", maxPriceEth: 2 }, base, 35);
assert.equal(result.collectionSlug, "example");
assert.equal(result.budgetFit, true);
assert.ok(result.score >= 70);
assert.equal(result.signal, "BUY");
