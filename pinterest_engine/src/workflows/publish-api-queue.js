import path from "node:path";
import fs from "node:fs";
import { PinterestPublisherApi } from "../services/pinterest-publisher-api.js";

export async function publishApiDueQueue({ config, state }) {
  const dueItems = state.getDueQueueItems(config.publishBatchSize || 5);
  if (dueItems.length === 0) {
    console.log("No due queue items to publish via API.");
    return { publishedCount: 0, dueCount: 0 };
  }

  const publisher = new PinterestPublisherApi();
  const bridgeBaseUrl = process.env.BRIDGE_PAGE_URL || "https://the-swavory-bites.pages.dev/bridge_page/";
  let publishedCount = 0;

  for (const item of dueItems) {
    const asset = state.getAsset(item.assetId);
    if (!asset || asset.status !== "rendered" || !asset.outputPath) {
      continue;
    }

    // Resolve image file path cross-platform
    const filename = path.basename(asset.outputPath);
    const localAssetPath = path.join(config.assetsDir, "pinterest", filename);
    let resolvedImagePath = asset.outputPath;

    if (fs.existsSync(localAssetPath)) {
      resolvedImagePath = localAssetPath;
    } else if (!fs.existsSync(resolvedImagePath)) {
      console.warn(`⚠️ Rendered asset file missing for ${asset.id}: ${resolvedImagePath}. Skipping.`);
      continue;
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
        imageUrl: asset.mediaUrl, // use web media URL if available, else uploads image file directly
        altText: asset.pinTitle
      });

      asset.pinId = pinResult.id;
      asset.pinterestUrl = `https://www.pinterest.com/pin/${pinResult.id}/`;
      asset.status = "published_api";
      asset.publishedAt = new Date().toISOString();

      item.status = "published_api";
      item.pinId = pinResult.id;
      item.publishedAt = new Date().toISOString();

      publishedCount++;
      console.log(`✅ Pin published to board ID ${boardId} | Pin ID: ${pinResult.id}`);
    } catch (err) {
      console.error(`❌ Failed to publish pin for asset ${asset.id}:`, err.message);
    }
  }

  await state.save();
  console.log(`\n🎉 Successfully published ${publishedCount} pin(s) directly via Pinterest API v5!`);
  return { publishedCount, dueCount: dueItems.length };
}
