import fs from "node:fs/promises";
import path from "node:path";

const appId = "1586935";
const appSecret = "9542fd1bd4c60e5479c1a9ea00b73b55f56749d8";
const code = process.argv[2] || "af0254fa49da403b7a8f200eb2a5f7648319d6c9";
const redirectUri = "https://the-swavory-bites.pages.dev/bridge_page/";

async function exchangeCode() {
  console.log(`Exchanging code ${code} for access & refresh tokens...`);
  
  const authHeader = "Basic " + Buffer.from(`${appId}:${appSecret}`).toString("base64");
  const bodyParams = new URLSearchParams({
    grant_type: "authorization_code",
    code: code,
    redirect_uri: redirectUri
  });

  try {
    const res = await fetch("https://api.pinterest.com/v5/oauth/token", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: bodyParams.toString()
    });

    const data = await res.json();
    console.log("Response status:", res.status);
    console.log("Response data:", JSON.stringify(data, null, 2));

    if (data.access_token) {
      console.log("\n✅ SUCCESS! Received Access Token and Refresh Token!");
      
      const envPath = path.resolve(".env");
      let envContent = await fs.readFile(envPath, "utf8");

      envContent = updateEnvVar(envContent, "PINTEREST_ACCESS_TOKEN", data.access_token);
      if (data.refresh_token) {
        envContent = updateEnvVar(envContent, "PINTEREST_REFRESH_TOKEN", data.refresh_token);
      }

      await fs.writeFile(envPath, envContent, "utf8");
      console.log("✅ Saved PINTEREST_ACCESS_TOKEN and PINTEREST_REFRESH_TOKEN to .env!");
    } else {
      console.error("❌ Token exchange failed:", data);
    }
  } catch (err) {
    console.error("❌ Error during fetch:", err);
  }
}

function updateEnvVar(envText, key, value) {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(envText)) {
    return envText.replace(regex, `${key}=${value}`);
  }
  return envText + `\n${key}=${value}`;
}

exchangeCode();
