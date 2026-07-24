/**
 * Fix stale state.json by marking all known published pin IDs as published_api.
 * Run this once locally after finding duplicate pins.
 * Usage: node fix_published_state.js
 */
import fs from "node:fs/promises";
import path from "node:path";

const KNOWN_PUBLISHED_PINS = [
  // [assetId, pinId] - add all confirmed published pins here
  ["4870-hero",  "419397784072948035"],
  ["4870-list",  "419397784072948036"],
  ["4870-guide", "419397784072948037"],
  ["4844-hero",  "419397784072947977"],
  ["4838-hero",  "419397784072948034"],
  ["4835-hero",  "419397784072948110"],
  ["4835-list",  "419397784072948271"],
  ["4841-hero",  "419397784072948033"],
  ["4052-hero",  "419397784072948206"],
  ["4052-list",  "419397784072948207"],
  ["4844-hero",  "419397784072948270"],
];

async function fixState() {
  const statePath = path.resolve("data/state.json");
  const raw = await fs.readFile(statePath, "utf8");
  const state = JSON.parse(raw);

  let fixedAssets = 0;
  let fixedQueue = 0;

  for (const [assetId, pinId] of KNOWN_PUBLISHED_PINS) {
    // Fix asset
    if (state.assets?.[assetId] && state.assets[assetId].status !== "published_api") {
      state.assets[assetId].status = "published_api";
      state.assets[assetId].pinId = pinId;
      state.assets[assetId].pinterestUrl = `https://www.pinterest.com/pin/${pinId}/`;
      state.assets[assetId].publishedAt = new Date().toISOString();
      fixedAssets++;
      console.log(`  ✅ Fixed asset ${assetId} -> Pin ID ${pinId}`);
    }

    // Fix queue item
    const queueId = `${assetId}-queue`;
    if (state.queue?.[queueId] && state.queue[queueId].status !== "published_api") {
      state.queue[queueId].status = "published_api";
      state.queue[queueId].pinId = pinId;
      state.queue[queueId].publishedAt = new Date().toISOString();
      fixedQueue++;
      console.log(`  ✅ Fixed queue ${queueId}`);
    }
  }

  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
  console.log(`\n✅ Patched ${fixedAssets} asset(s) and ${fixedQueue} queue item(s) to published_api in state.json`);
}

fixState();
