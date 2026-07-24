import fs from "node:fs";
import path from "node:path";

// Auto-load .env file if present
try {
  const envPath = path.resolve(".env");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (key && !process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    });
  }
} catch (e) {
  // ignore
}

const DEFAULT_BOARDS = {
  desserts_en: "Easy Dessert Recipes",
  baking_en: "Baking Recipes — Breads & Cakes",
  drinks_en: "Drink Recipes — Cocktails & Mocktails",
  spreads_en: "Hazelnut & Chocolate Spreads",
  fruit_en: "Fruit Desserts & Summer Recipes",
  trends_en: "Viral Food Trends & Sweet Ideas",
  quick_en: "Quick & Easy Recipes",
  recipes_fr: "Recettes Faciles & Desserts Maison",
  spreads_fr: "Pâtes à Tartiner & Douceurs",
  trends_fr: "Tendances Culinaires & Recettes"
};

export function loadConfig() {
  const siteUrl = required("SITE_URL");
  const publishMode = normalizePublishMode(process.env.PUBLISH_MODE);

  return {
    siteUrl,
    wpUsername: required("WP_USERNAME"),
    wpAppPassword: required("WP_APP_PASSWORD"),
    wpUserAgent: process.env.WP_USER_AGENT?.trim() || "TheSwavoryBites-Pinterest-Bot/1.0",
    geminiApiKey: process.env.GEMINI_API_KEY?.trim() || "",
    geminiTextModel: process.env.GEMINI_TEXT_MODEL?.trim() || "gemini-3.1-flash-lite-preview-latest",
    pexelsApiKey: process.env.PEXELS_API_KEY?.trim() || "",
    pixabayApiKey: process.env.PIXABAY_API_KEY?.trim() || "",
    imageSourceMode: process.env.IMAGE_SOURCE_MODE?.trim() || "featured-first",
    publishMode,
    lookbackHours: numberFromEnv("LOOKBACK_HOURS", 48),
    postsPerRun: numberFromEnv("POSTS_PER_RUN", 6),
    renderBatchSize: numberFromEnv("RENDER_BATCH_SIZE", 9),
    publishBatchSize: numberFromEnv("PUBLISH_BATCH_SIZE", 6),
    maxPinsPerDay: numberFromEnv("MAX_PINS_PER_DAY", 15),
    maxPostsPerDay: numberFromEnv("MAX_POSTS_PER_DAY", 5),
    assetsDir: path.resolve(process.env.ASSETS_DIR?.trim() || "data/assets"),
    exportsDir: path.resolve(process.env.EXPORTS_DIR?.trim() || "data/exports"),
    statePath: path.resolve(process.env.STATE_PATH?.trim() || "data/state.json"),
    pinHourSlots: [
      numberFromEnv("PIN_HOUR_1", 9),
      numberFromEnv("PIN_HOUR_2", 14),
      numberFromEnv("PIN_HOUR_3", 19)
    ],
    backfillPostsPerRun: numberFromEnv("BACKFILL_POSTS_PER_RUN", 12),
    backfillMaxPages: numberFromEnv("BACKFILL_MAX_PAGES", 10),
    backfillStartDelayHours: numberFromEnv("BACKFILL_START_DELAY_HOURS", 24),
    backfillPostIntervalHours: numberFromEnv("BACKFILL_POST_INTERVAL_HOURS", 24),
    backfillCategorySlugs: listFromEnv("BACKFILL_CATEGORY_SLUGS"),
    queueSpacingDays: {
      first: numberFromEnv("PIN_DAY_1", 0),
      second: numberFromEnv("PIN_DAY_2", 2),
      third: numberFromEnv("PIN_DAY_3", 7)
    },
    boards: DEFAULT_BOARDS
  };
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function listFromEnv(name) {
  const value = process.env[name];
  if (!value) {
    return [];
  }
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}

function numberFromEnv(name, fallback) {
  const value = process.env[name]?.trim();
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePublishMode(value) {
  const mode = String(value || "csv").trim().toLowerCase();
  return mode === "rss" ? "rss" : "csv";
}