import fs from "node:fs/promises";
import path from "node:path";
import { PinterestPublisherApi } from "./src/services/pinterest-publisher-api.js";

async function testPublish() {
  console.log("Starting Pinterest API Test Publish...");
  
  // Parse .env manually
  const envText = await fs.readFile(path.resolve(".env"), "utf8");
  envText.split("\n").forEach((line) => {
    const parts = line.split("=");
    if (parts.length >= 2 && !parts[0].startsWith("#")) {
      const k = parts[0].trim();
      const v = parts.slice(1).join("=").trim();
      if (k && v) process.env[k] = v;
    }
  });

  const publisher = new PinterestPublisherApi();
  const boardId = process.env.PINTEREST_BOARD_DESSERTS || "419397852738939911";
  
  const testPin = {
    boardId: boardId,
    title: "Classic Homemade Peach Crisp Recipe",
    description: "Discover this easy peach crisp recipe with a golden, buttery oat topping and jammy caramelized peaches. Ready in under an hour! #peachcrisp #easydessert #summerrecipes",
    link: "https://the-swavory-bites.pages.dev/bridge_page/?id=classic-homemade-peach-crisp-recipe",
    imageUrl: "https://el-mordjene.info/wp-content/uploads/2026/07/classic-homemade-peach-crisp-recipe_20260724_100320-1024x538.jpg",
    altText: "Classic Homemade Peach Crisp Recipe Preview"
  };

  try {
    const result = await publisher.createPin(testPin);
    console.log("\n================================================");
    console.log("🎉 TEST PIN PUBLISHED SUCCESSFULLY TO PINTEREST!");
    console.log(`Pin ID: ${result.id}`);
    console.log(`Link: https://www.pinterest.com/pin/${result.id}/`);
    console.log("================================================\n");
  } catch (err) {
    console.error("\n❌ TEST PUBLISH FAILED:", err);
  }
}

testPublish();
