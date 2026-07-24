import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { escapeHtml, wrapText } from "../templates/svg-text.js";

const THEMES = {
  recipe: { accent: "#d87439", text: "#ffffff", shadow: "rgba(0,0,0,0.6)" },
  baking: { accent: "#d4af37", text: "#ffffff", shadow: "rgba(0,0,0,0.6)" },
  drink: { accent: "#2d9e64", text: "#ffffff", shadow: "rgba(0,0,0,0.6)" },
  fruit: { accent: "#e8633a", text: "#ffffff", shadow: "rgba(0,0,0,0.6)" },
  spread: { accent: "#b8860b", text: "#ffffff", shadow: "rgba(0,0,0,0.6)" },
  trend: { accent: "#cb6e45", text: "#ffffff", shadow: "rgba(0,0,0,0.6)" },
  quick: { accent: "#2e7fc0", text: "#ffffff", shadow: "rgba(0,0,0,0.6)" }
};

export async function renderAsset(asset, config) {
  const theme = THEMES[asset.contentType] || THEMES.recipe;
  const fileName = `${asset.postSlug || asset.postId}-${asset.variant}.jpg`;
  const outputPath = path.join(config.assetsDir, "pinterest", fileName);
  const overlayStyle = process.env.PIN_OVERLAY_STYLE || "minimal_luxury";

  const visualBuffer = await loadImageBuffer(asset.imageSourceUrl || asset.featuredImage);

  await fs.mkdir(path.join(config.assetsDir, "pinterest"), { recursive: true });

  // 1. Prepare base 1000x1500 vertical food photo
  let baseImageBuffer;
  if (visualBuffer) {
    baseImageBuffer = await sharp(visualBuffer)
      .resize(1000, 1500, { fit: "cover", position: "attention" })
      .modulate({ saturation: 1.05, brightness: 1.02 })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  } else {
    // Gradient fallback if no photo is available
    const svgBg = `<svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8f1f28"/><stop offset="100%" stop-color="#1f1612"/></linearGradient></defs><rect width="1000" height="1500" fill="url(#bg)"/></svg>`;
    baseImageBuffer = await sharp(Buffer.from(svgBg)).jpeg({ quality: 90 }).toBuffer();
  }

  // 2. Return clean photo if clean_photo style requested
  if (overlayStyle === "clean_photo") {
    await sharp(baseImageBuffer).toFile(outputPath);
    return outputPath;
  }

  // 3. Render Minimalist Elegant Typography Overlay (High-CTR, Brilliant Font)
  const overlaySvg = buildMinimalLuxuryOverlay(asset, theme);

  await sharp(baseImageBuffer)
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(outputPath);

  return outputPath;
}

function buildMinimalLuxuryOverlay(asset, theme) {
  const titleText = (asset.overlayTitle || asset.pinTitle || "").slice(0, 50);
  const titleLines = wrapText(titleText, 22, 2);
  
  const titleSvg = titleLines
    .map((line, i) => {
      const y = 1320 + i * 55;
      return `
        <text x="500" y="${y}" text-anchor="middle" font-size="46" font-family="'Playfair Display', Georgia, serif" fill="#ffffff" font-weight="900" filter="url(#shadow)">
          ${escapeHtml(line)}
        </text>
      `;
    })
    .join("");

  return `
    <svg width="1000" height="1500" viewBox="0 0 1000 1500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Soft gradient vignette at the bottom -->
        <linearGradient id="bottomVignette" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="transparent" />
          <stop offset="60%" stop-color="rgba(0,0,0,0.2)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.82)" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.8"/>
        </filter>
      </defs>
      
      <!-- Bottom subtle gradient -->
      <rect x="0" y="1050" width="1000" height="450" fill="url(#bottomVignette)"/>
      
      <!-- Minimalist Top Pill Badge -->
      <rect x="360" y="50" width="280" height="44" rx="22" fill="rgba(31, 22, 18, 0.75)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
      <text x="500" y="78" text-anchor="middle" font-size="18" font-family="'Outfit', system-ui, sans-serif" fill="#ffffff" font-weight="800" letter-spacing="2">
        THE SWAVORY BITES
      </text>

      <!-- Brilliant Catchy Serif Headline -->
      ${titleSvg}
    </svg>
  `;
}

async function loadImageBuffer(url) {
  if (!url) return null;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    });

    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}
