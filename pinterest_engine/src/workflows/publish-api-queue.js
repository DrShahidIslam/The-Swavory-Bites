import path from "node:path";
import fs from "node:fs";
import { PinterestPublisherApi } from "../services/pinterest-publisher-api.js";
import { renderAsset } from "../services/asset-renderer.js";

export async function publishApiDueQueue({ config, state }) {
  const dueItems = state.getDueQueueItems(config.publishBatchSize || 5);
  if (dueItems.length === 0) {
    console.log("No due queue items to publish via API.");
    return { publishedCount: 0, dueCount: 0 };
  }

  // --- SAFETY PROTOCOL: 7-Day Cooldown & Daily Limit ---
  const now = new Date();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * ONE_DAY;
  
  const allQueueItems = Object.values(state.data.queue || {});
  const publishedItems = allQueueItems.filter(q => q.status === "published_api" && q.publishedAt);
  
  let pinsToday = 0;
  const recentlyPinnedSlugs = new Set();

  for (const item of publishedItems) {
    const pubDate = new Date(item.publishedAt);
    const ageMs = now - pubDate;
    
    if (ageMs < ONE_DAY) {
      pinsToday++;
    }
    
    if (ageMs < SEVEN_DAYS) {
      const pastAsset = state.getAsset(item.assetId);
      if (pastAsset && pastAsset.postSlug) {
        recentlyPinnedSlugs.add(pastAsset.postSlug);
      }
    }
  }

  // Phase A Limit: Max 2 pins per day
  if (pinsToday >= 2) {
    console.log(`🛡️ SAFETY PROTOCOL: Daily limit reached (${pinsToday} pins today). Sleeping...`);
    return { publishedCount: 0, dueCount: 0 };
  }

  const publisher = new PinterestPublisherApi();
  const bridgeBaseUrl = process.env.BRIDGE_PAGE_URL || "https://the-swavory-bites.pages.dev/bridge_page/";
  let publishedCount = 0;

  for (const item of dueItems) {
    const asset = state.getAsset(item.assetId);
    if (!asset) continue;

    // Skip if already published (guard against stale state)
    if (asset.status === "published_api" || asset.pinId) {
      console.log(`⏭️  Skipping already published asset: ${asset.id} (Pin ID: ${asset.pinId})`);
      item.status = "published_api";
      continue;
    }

    // Phase B/C Cooldown: 7 Days per URL
    if (recentlyPinnedSlugs.has(asset.postSlug)) {
      console.log(`🛡️ SAFETY PROTOCOL: 7-Day Cooldown active for URL slug "${asset.postSlug}". Skipping...`);
      continue;
    }

    if (pinsToday >= 2) {
      console.log(`🛡️ SAFETY PROTOCOL: Reached daily limit mid-queue. Stopping.`);
      break;
    }

    // Resolve image file path cross-platform or render on the fly if missing
    const filename = path.basename(asset.outputPath || `${asset.postSlug || asset.postId}-${asset.variant}.jpg`);
    const localAssetPath = path.join(config.assetsDir, "pinterest", filename);
    let resolvedImagePath = null;

    if (fs.existsSync(localAssetPath)) {
      resolvedImagePath = localAssetPath;
    } else {
      console.log(`🎨 Asset file missing for ${asset.id}. Rendering graphic on the fly...`);
      try {
        resolvedImagePath = await renderAsset(asset, config);
        // Do NOT update asset.status here — keep it at its current value
        // Only outputPath needs updating so the file reference is valid
        asset.outputPath = resolvedImagePath;
      } catch (renderErr) {
        console.warn(`⚠️ On-the-fly rendering failed for ${asset.id}:`, renderErr.message);
        continue;
      }
    }

    // Resolve Board ID from environment variable or board key
    const boardEnvKey = `PINTEREST_BOARD_${(asset.boardKey || "DESSERTS").toUpperCase()}`;
    const boardId = process.env[boardEnvKey] || process.env.PINTEREST_BOARD_DESSERTS || "419397852738939911";

    // Target link points to Bridge Page with slug parameter
    const slug = asset.postSlug || asset.postId;
    const bridgeUrl = `${bridgeBaseUrl.replace(/\/$/, "")}/?id=${encodeURIComponent(slug)}`;

    try {
      console.log(`\n🚀 Direct API Publishing: "${asset.pinTitle}"...`);
      
      const pinResult = await publisher.createPin({
        boardId: boardId,
        title: asset.pinTitle,
        description: asset.pinDescription,
        link: bridgeUrl,
        imagePath: resolvedImagePath,
        imageUrl: asset.mediaUrl,
        altText: asset.pinTitle
      });

      // Atomically mark BOTH asset + queue item as published_api via state helper
      state.markPublished(item.assetId, pinResult.id);

      publishedCount++;
      pinsToday++;
      recentlyPinnedSlugs.add(slug);
      console.log(`✅ Pin published to board ID ${boardId} | Pin ID: ${pinResult.id}`);
    } catch (err) {
      console.error(`❌ Failed to publish pin for asset ${asset.id}:`, err.message);
    }
  }

  await state.save();
  console.log(`\n🎉 Successfully published ${publishedCount} pin(s) directly via Pinterest API v5!`);
  return { publishedCount, dueCount: dueItems.length };
}
