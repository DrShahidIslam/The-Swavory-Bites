import fs from "node:fs/promises";
import path from "node:path";

async function cleanState() {
  const statePath = path.resolve("data/state.json");
  const raw = await fs.readFile(statePath, "utf8");
  const state = JSON.parse(raw);

  let cleanedCount = 0;
  if (state.assets) {
    for (const [id, asset] of Object.entries(state.assets)) {
      if (asset.outputPath && asset.outputPath.includes("G:\\")) {
        const filename = path.basename(asset.outputPath);
        asset.outputPath = path.join("data/assets/pinterest", filename);
        cleanedCount++;
      }
    }
  }

  await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
  console.log(`✅ Cleaned ${cleanedCount} legacy Windows path(s) in state.json!`);
}

cleanState();
