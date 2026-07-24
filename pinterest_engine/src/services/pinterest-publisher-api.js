import fs from "node:fs/promises";
import path from "node:path";

export class PinterestPublisherApi {
  constructor(config = {}) {
    this.appId = config.appId || process.env.PINTEREST_APP_ID;
    this.appSecret = config.appSecret || process.env.PINTEREST_APP_SECRET;
    this.accessToken = config.accessToken || process.env.PINTEREST_ACCESS_TOKEN;
    this.refreshToken = config.refreshToken || process.env.PINTEREST_REFRESH_TOKEN;
    this.baseUrl = "https://api.pinterest.com/v5";
  }

  /**
   * Refreshes the OAuth access token using the stored refresh token.
   */
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error("No PINTEREST_REFRESH_TOKEN available for token renewal.");
    }

    console.log("🔄 Refreshing Pinterest OAuth Access Token...");
    const authHeader = "Basic " + Buffer.from(`${this.appId}:${this.appSecret}`).toString("base64");
    const bodyParams = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: this.refreshToken
    });

    const res = await fetch(`${this.baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: bodyParams.toString()
    });

    const data = await res.json();
    if (res.ok && data.access_token) {
      this.accessToken = data.access_token;
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }

      await this.saveTokensToEnv();
      console.log("✅ OAuth Access Token refreshed successfully.");
      return this.accessToken;
    }

    throw new Error(`Token refresh failed HTTP ${res.status}: ${JSON.stringify(data)}`);
  }

  async saveTokensToEnv() {
    try {
      const envPath = path.resolve(".env");
      let envText = await fs.readFile(envPath, "utf8");

      envText = envText.replace(/^PINTEREST_ACCESS_TOKEN=.*$/m, `PINTEREST_ACCESS_TOKEN=${this.accessToken}`);
      if (this.refreshToken) {
        envText = envText.replace(/^PINTEREST_REFRESH_TOKEN=.*$/m, `PINTEREST_REFRESH_TOKEN=${this.refreshToken}`);
      }

      await fs.writeFile(envPath, envText, "utf8");
    } catch (e) {
      console.warn("Could not save refreshed tokens to .env:", e.message);
    }
  }

  /**
   * Helper to execute API requests with automatic token refresh retry.
   */
  async apiFetch(endpoint, options = {}) {
    const url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}${endpoint}`;
    options.headers = options.headers || {};
    options.headers["Authorization"] = `Bearer ${this.accessToken}`;

    let res = await fetch(url, options);

    // If token expired (401), attempt 1 refresh & retry
    if (res.status === 401 && this.refreshToken) {
      console.warn("⚠️ Received 401 Unauthorized. Refreshing token and retrying...");
      await this.refreshAccessToken();
      options.headers["Authorization"] = `Bearer ${this.accessToken}`;
      res = await fetch(url, options);
    }

    return res;
  }

  /**
   * Creates a Pin on Pinterest via API v5 using base64 or image_url.
   */
  async createPin({ boardId, title, description, link, imagePath, imageUrl, altText }) {
    console.log(`\n📌 Creating Pin: "${title}" on Board ID ${boardId}...`);
    
    let mediaSource = {};

    if (imagePath) {
      const fileBuffer = await fs.readFile(imagePath);
      const base64Data = fileBuffer.toString("base64");
      const isPng = imagePath.toLowerCase().endsWith(".png");
      
      mediaSource = {
        source_type: "image_base64",
        content_type: isPng ? "image/png" : "image/jpeg",
        data: base64Data
      };
    } else if (imageUrl) {
      mediaSource = {
        source_type: "image_url",
        url: imageUrl
      };
    } else {
      throw new Error("Must provide either imagePath or imageUrl to create a pin.");
    }

    const payload = {
      board_id: boardId,
      title: title.slice(0, 100),
      description: description.slice(0, 500),
      link: link,
      alt_text: (altText || title).slice(0, 500),
      media_source: mediaSource
    };

    const res = await this.apiFetch("/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.status === 201 || data.id) {
      console.log(`🎉 PIN CREATED SUCCESSFULLY! Pin ID: ${data.id}`);
      console.log(`🔗 Link: https://www.pinterest.com/pin/${data.id}/`);
      return data;
    }

    throw new Error(`Failed to create pin HTTP ${res.status}: ${JSON.stringify(data)}`);
  }

  /**
   * Fetches performance analytics for a Pin.
   */
  async getPinAnalytics(pinId) {
    const res = await this.apiFetch(`/pins/${pinId}/analytics?start_date=2026-01-01&end_date=2026-12-31&metric_types=IMPRESSION,SAVE,PIN_CLICK,OUTBOUND_CLICK`);
    if (res.ok) {
      return await res.json();
    }
    return null;
  }
}
