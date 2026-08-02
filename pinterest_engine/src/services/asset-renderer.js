import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { escapeHtml, wrapText } from "../templates/svg-text.js";

const THEMES = {
  recipe: { accent: "#d87439", text: "#ffffff", shadow: "rgba(0,0,0,0.8)" },
  baking: { accent: "#d4af37", text: "#ffffff", shadow: "rgba(0,0,0,0.8)" },
  drink: { accent: "#2d9e64", text: "#ffffff", shadow: "rgba(0,0,0,0.8)" },
  fruit: { accent: "#e8633a", text: "#ffffff", shadow: "rgba(0,0,0,0.8)" },
  spread: { accent: "#b8860b", text: "#ffffff", shadow: "rgba(0,0,0,0.8)" },
  trend: { accent: "#cb6e45", text: "#ffffff", shadow: "rgba(0,0,0,0.8)" },
  quick: { accent: "#2e7fc0", text: "#ffffff", shadow: "rgba(0,0,0,0.8)" }
};

export async function renderAsset(asset, config) {
  const theme = THEMES[asset.contentType] || THEMES.recipe;
  const fileName = `${asset.postSlug || asset.postId}-${asset.variant}.jpg`;
  const outputPath = path.join(config.assetsDir, "pinterest", fileName);
  const overlayStyle = asset.overlayStyle || process.env.PIN_OVERLAY_STYLE || "minimal_luxury";

  const visualBuffer = await loadImageBuffer(asset.imageSourceUrl || asset.featuredImage);

  await fs.mkdir(path.join(config.assetsDir, "pinterest"), { recursive: true });

  // 1. Prepare base 1000x1500 vertical food photo
  let baseImageBuffer;
  if (visualBuffer) {
    baseImageBuffer = await sharp(visualBuffer)
      .resize(1000, 1500, { fit: "cover", position: "attention" })
      .modulate({ saturation: 1.06, brightness: 1.02 })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  } else {
    const svgBg = `<svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#8f1f28"/><stop offset="100%" stop-color="#1f1612"/></linearGradient></defs><rect width="1000" height="1500" fill="url(#bg)"/></svg>`;
    baseImageBuffer = await sharp(Buffer.from(svgBg)).jpeg({ quality: 90 }).toBuffer();
  }

  // 2. Return clean photo if clean_photo style requested
  if (overlayStyle === "clean_photo") {
    await sharp(baseImageBuffer).toFile(outputPath);
    return outputPath;
  }

  // 3. Render Large, Organic Readable Typography Overlay (No forced 'Recipe' suffix)
  const overlaySvg = buildReadableTypographyOverlay(asset, theme);

  await sharp(baseImageBuffer)
    .composite([{ input: Buffer.from(overlaySvg), top: 0, left: 0 }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(outputPath);

  return outputPath;
}

function buildReadableTypographyOverlay(asset, theme) {
  // Use exact title organically generated (do not force 'Recipe' suffix)
  const rawTitle = (asset.overlayTitle || asset.pinTitle || "").trim();

  // Large readable font wrapping (max 20 chars per line for natural flow)
  const titleLines = wrapText(rawTitle, 20, 3);
  
  // Calculate vertical position dynamically based on line count
  const startY = 1380 - (titleLines.length - 1) * 70;

  const titleSvg = titleLines
    .map((line, i) => {
      const y = startY + i * 70;
      return `
        <text x="500" y="${y}" text-anchor="middle" font-size="58" font-family="'Playfair Display', Georgia, serif" fill="#ffffff" font-weight="900" filter="url(#dropShadow)">
          ${escapeHtml(line)}
        </text>
      `;
    })
    .join("");

  return `
    <svg width="1000" height="1500" viewBox="0 0 1000 1500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Rich dark gradient overlay at the bottom for 100% text legibility -->
        <linearGradient id="readableGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="transparent" />
          <stop offset="50%" stop-color="rgba(20, 10, 8, 0.45)" />
          <stop offset="100%" stop-color="rgba(15, 6, 4, 0.92)" />
        </linearGradient>
        <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="5" stdDeviation="8" flood-color="#000000" flood-opacity="0.95"/>
        </filter>
      </defs>
      
      <!-- Bottom dark gradient backdrop -->
      <rect x="0" y="900" width="1000" height="600" fill="url(#readableGradient)"/>
      
      <!-- Large, Organic Catchy Headline -->
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
