import fs from "node:fs/promises";
import path from "node:path";

async function fetchBoards() {
  const envPath = path.resolve(".env");
  const envText = await fs.readFile(envPath, "utf8");
  
  const tokenMatch = envText.match(/^PINTEREST_ACCESS_TOKEN=(.+)$/m);
  if (!tokenMatch) {
    console.error("No access token found in .env");
    return;
  }
  
  const token = tokenMatch[1].trim();
  console.log(`Testing token: ${token.slice(0, 15)}...`);

  try {
    const res = await fetch("https://api.pinterest.com/v5/boards?page_size=100", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const data = await res.json();
    console.log("HTTP Status:", res.status);

    if (res.status === 200) {
      console.log("\n=================== YOUR PINTEREST BOARDS ===================");
      if (data.items && data.items.length > 0) {
        data.items.forEach((b) => {
          console.log(`📌 Name: "${b.name}" | ID: ${b.id} | Privacy: ${b.privacy}`);
        });
      } else {
        console.log("No boards found on this account yet.");
      }
      console.log("=============================================================\n");
    } else {
      console.error("Error response:", JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

fetchBoards();
