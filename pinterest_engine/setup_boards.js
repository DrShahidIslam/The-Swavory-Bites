import fs from "node:fs/promises";
import path from "node:path";

const TARGET_BOARDS = [
  {
    envKey: "PINTEREST_BOARD_DESSERTS",
    name: "Easy Dessert Recipes",
    description: "Discover easy dessert recipes that look impressive but come together in under an hour. From classic peach crisps to no-bake chocolate treats and bakery cookies. Follow for daily dessert ideas and step-by-step guides."
  },
  {
    envKey: "PINTEREST_BOARD_BAKING",
    name: "Baking Recipes — Breads & Cakes",
    description: "Everything you need to bake from scratch at home. Find reliable recipes for classic zucchini bread, banana bread, muffins, quick breads, and seasonal bakes."
  },
  {
    envKey: "PINTEREST_BOARD_DRINKS",
    name: "Drink Recipes — Cocktails & Mocktails",
    description: "Explore cocktail recipes, mocktails, and summer drink ideas from classic mojitos to fruity seasonal sippers. Perfect for parties, brunch, or a solo treat."
  },
  {
    envKey: "PINTEREST_BOARD_SPREADS_EN",
    name: "Hazelnut & Chocolate Spreads",
    description: "Homemade hazelnut chocolate spreads, copycat recipes, and gourmet spread ideas you can make in minutes. From el-mordjene-style cream to better-than-Nutella blends."
  },
  {
    envKey: "PINTEREST_BOARD_FRUIT",
    name: "Fruit Desserts & Summer Recipes",
    description: "Find the best fruit dessert recipes — peach crisps, berry cobblers, summer tarts, ice cream, and fruit-forward bakes that celebrate seasonal produce."
  },
  {
    envKey: "PINTEREST_BOARD_TRENDS",
    name: "Viral Food Trends & Sweet Ideas",
    description: "The internet's most viral food trends, TikTok-famous recipes, and sweet ideas making rounds right now — from chaos cakes to Algerian gourmet spreads."
  },
  {
    envKey: "PINTEREST_BOARD_QUICK",
    name: "Quick & Easy Recipes",
    description: "Discover recipes that come together in 30 minutes or less — weeknight dinners, quick bakes, speedy drinks, and no-cook treats for busy home cooks."
  },
  {
    envKey: "PINTEREST_BOARD_RECIPES_FR",
    name: "Recettes Faciles & Desserts Maison",
    description: "Découvrez des recettes faciles à réaliser chez vous : desserts maison, gâteaux rapides, boissons fraîches et idées de cuisine gourmande au quotidien."
  },
  {
    envKey: "PINTEREST_BOARD_SPREADS_FR",
    name: "Pâtes à Tartiner & Douceurs",
    description: "Les meilleures pâtes à tartiner faites maison : recettes chocolat-noisette, crèmes gourmandes et alternatives à Nutella ou el mordjene."
  },
  {
    envKey: "PINTEREST_BOARD_TRENDS_FR",
    name: "Tendances Culinaires & Recettes",
    description: "Les recettes et tendances food qui font le buzz : el mordjene, créations TikTok, desserts insolites et incontournables du moment."
  }
];

async function setupBoards() {
  const envPath = path.resolve(".env");
  let envContent = await fs.readFile(envPath, "utf8");
  
  const tokenMatch = envContent.match(/^PINTEREST_ACCESS_TOKEN=(.+)$/m);
  if (!tokenMatch) {
    console.error("No access token found in .env");
    return;
  }
  
  const token = tokenMatch[1].trim();

  // 1. Fetch existing boards
  const res = await fetch("https://api.pinterest.com/v5/boards?page_size=100", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const data = await res.json();
  const existingBoards = data.items || [];

  console.log(`Found ${existingBoards.length} existing board(s).`);

  const boardMap = {};
  existingBoards.forEach((b) => {
    boardMap[b.name.toLowerCase()] = b.id;
  });

  // 2. Create missing boards
  for (const boardDef of TARGET_BOARDS) {
    const nameLower = boardDef.name.toLowerCase();
    let boardId = boardMap[nameLower];

    if (boardId) {
      console.log(`✓ Board exists: "${boardDef.name}" (ID: ${boardId})`);
    } else {
      console.log(`➕ Creating board: "${boardDef.name}"...`);
      try {
        const createRes = await fetch("https://api.pinterest.com/v5/boards", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            name: boardDef.name,
            description: boardDef.description,
            privacy: "PUBLIC"
          })
        });

        const newBoard = await createRes.json();
        if (createRes.status === 201 || newBoard.id) {
          boardId = newBoard.id;
          console.log(`  ✅ Created! ID: ${boardId}`);
        } else {
          console.error(`  ❌ Failed to create board "${boardDef.name}":`, newBoard);
        }
      } catch (err) {
        console.error(`  ❌ Network error creating board "${boardDef.name}":`, err);
      }
    }

    if (boardId) {
      envContent = updateEnvVar(envContent, boardDef.envKey, boardId);
    }
  }

  await fs.writeFile(envPath, envContent, "utf8");
  console.log("\n=================================================");
  console.log("🎉 ALL PINTEREST BOARDS CREATED AND SAVED TO .ENV");
  console.log("=================================================");
}

function updateEnvVar(envText, key, value) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(envText)) {
    return envText.replace(regex, `${key}=${value}`);
  }
  return envText + `\n${key}=${value}`;
}

setupBoards();
