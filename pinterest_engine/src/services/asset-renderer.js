import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { escapeHtml, wrapText } from "../templates/svg-text.js";

const THEMES = {
  recipe: { background: ["#fff0e1", "#ffc98f", "#d87439"], text: "#5d2f15" },
  baking: { background: ["#fdf6e3", "#e8d5a3", "#b58c4a"], text: "#3b2910" },
  drink: { background: ["#edfbf0", "#a8e6c5", "#2d9e64"], text: "#143a25" },
  fruit: { background: ["#fff5f0", "#ffc4a0", "#e8633a"], text: "#4d1b0e" },
  spread: { background: ["#f7ead8", "#d8b07b", "#7f4a22"], text: "#4a2c1c" },
  trend: { background: ["#fff3e8", "#f0c29d", "#cb6e45"], text: "#5c3426" },
  quick: { background: ["#f0f8ff", "#b3d9f5", "#2e7fc0"], text: "#0d2b43" }
};

export async function renderAsset(asset, config) {
  const theme = THEMES[asset.contentType] || THEMES.recipe;
  const fileName = `${asset.postSlug || asset.postId}-${asset.variant}.jpg`;
  const outputPath = path.join(config.assetsDir, "pinterest", fileName);

  const visualBuffer = await loadImageBuffer(asset.imageSourceUrl || asset.featuredImage);

  await fs.mkdir(path.join(config.assetsDir, "pinterest"), { recursive: true });

  if (visualBuffer) {
    // 📸 Clean, full-bleed 1000x1500 vertical food photography (NO text overlays)
    await sharp(visualBuffer)
      .resize(1000, 1500, { fit: "cover", position: "attention" })
      .modulate({ saturation: 1.05, brightness: 1.02 })
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(outputPath);
  } else {
    // Elegant fallback only if no food photo exists
    const titleLines = wrapText(asset.overlayTitle || asset.pinTitle, 20, 3);
    const titleSvg = titleLines
      .map((line, i) => `<text x="500" y="${700 + i * 80}" text-anchor="middle" font-size="64" font-family="system-ui, sans-serif" fill="${theme.text}" font-weight="800">${escapeHtml(line)}</text>`)
      .join("");

    const svg = `
      <svg width="1000" height="1500" viewBox="0 0 1000 1500" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${theme.background[0]}"/>
            <stop offset="50%" stop-color="${theme.background[1]}"/>
            <stop offset="100%" stop-color="${theme.background[2]}"/>
          </linearGradient>
        </defs>
        <rect width="1000" height="1500" fill="url(#bg)"/>
        ${titleSvg}
      </svg>
    `;

    await sharp(Buffer.from(svg))
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(outputPath);
  }

  return outputPath;
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
